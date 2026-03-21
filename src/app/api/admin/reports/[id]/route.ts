import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { sendIrregularEditAlert } from '@/lib/email'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { evaluateReportForAnomalies } from '@/lib/anomaly-engine'

export const dynamic = 'force-dynamic'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user.role !== 'Admin' && session.user.role !== 'Manager')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const id = (await params).id

    const report = await prisma.dailyReport.findFirst({
        where: { id, store: { company_id: session.user.companyId } },
        include: {
            images: true,
            sale_items: true,
            store: { select: { name: true, city: true, state: true } },
            submitted_by: { select: { name: true, email: true } },
            edit_logs: {
                orderBy: { createdAt: 'desc' },
                include: {
                    user: { select: { name: true, role: true } }
                }
            }
        }
    })

    if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (session.user.role === 'Manager') {
        const isMember = await prisma.storeMember.findFirst({
            where: { store_id: report.store_id, user_id: session.user.id, status: 'Active' }
        })
        if (!isMember) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }
    }

    // Sign URLs for secure viewing if AWS is configured
    if (report.images && report.images.length > 0 && process.env.AWS_S3_BUCKET_NAME && process.env.AWS_ACCESS_KEY_ID) {
        const s3 = new S3Client({
            region: process.env.AWS_REGION || 'us-east-1',
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
            }
        })
        const bucketUrl = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/`

        for (let i = 0; i < report.images.length; i++) {
            let img: any = report.images[i]
            img.raw_url = img.image_url
            if (img.image_url.startsWith(bucketUrl)) {
                const key = img.image_url.replace(bucketUrl, '')
                const command = new GetObjectCommand({
                    Bucket: process.env.AWS_S3_BUCKET_NAME,
                    Key: decodeURIComponent(key)
                })
                img.image_url = await getSignedUrl(s3, command, { expiresIn: 3600 })
            }
        }
    }

    return NextResponse.json(report)
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user.role !== 'Admin' && session.user.role !== 'Manager')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const id = (await params).id

    const body = await req.json()
    const { status, cash_amount, card_amount, expenses_amount, payouts_amount, time_in, time_out, notes, keptImageIds, newImageUrls, sale_items, inventory_usage } = body

    try {
        const existingReport = await prisma.dailyReport.findFirst({
            where: { id, store: { company_id: session.user.companyId } },
            include: { images: true, store: true }
        })
        if (!existingReport) return NextResponse.json({ error: 'Not found' }, { status: 404 })

        if (session.user.role === 'Manager') {
            const isMember = await prisma.storeMember.findFirst({
                where: { store_id: existingReport.store_id, user_id: session.user.id, status: 'Active' }
            })
            if (!isMember) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        if (cash_amount !== undefined && card_amount !== undefined) {
            // Admin is editing the actual amounts and images
            const netCash = Number(cash_amount) - (Number(expenses_amount) || 0) - (Number(payouts_amount) || 0)
            const total = netCash + Number(card_amount)

            let imagesChanged = false
            const existingImageIds = existingReport.images.map((img: any) => img.id)

            // Check if any old images were removed
            if (keptImageIds) {
                if (existingImageIds.length !== keptImageIds.length) imagesChanged = true
            }

            // Check if any new images were added
            if (newImageUrls && newImageUrls.length > 0) {
                imagesChanged = true
            }

            const changes: any = {
                cash: { old: Number(existingReport.cash_amount), new: Number(cash_amount) },
                card: { old: Number(existingReport.card_amount), new: Number(card_amount) },
                expenses: { old: Number(existingReport.expenses_amount), new: Number(expenses_amount) || 0 },
                payouts: { old: Number(existingReport.payouts_amount), new: Number(payouts_amount) || 0 },
                total: { old: Number(existingReport.total_amount), new: total },
                time_in: { old: (existingReport as any).time_in, new: time_in },
                time_out: { old: (existingReport as any).time_out, new: time_out },
                notes: { old: existingReport.notes, new: notes }
            }

            if (imagesChanged) {
                changes.images = "Modified (Images Added/Removed)"
            }

            const updatedReport = await prisma.$transaction(async (tx: any) => {
                const report = await tx.dailyReport.update({
                    where: { id },
                    data: {
                        status: status || existingReport.status,
                        cash_amount: Number(cash_amount),
                        card_amount: Number(card_amount),
                        expenses_amount: Number(expenses_amount) || 0,
                        payouts_amount: Number(payouts_amount) || 0,
                        total_amount: total,
                        time_in: time_in || null,
                        time_out: time_out || null,
                        notes: notes || null
                    }
                })

                // Replace inventory usage if provided
                if (inventory_usage !== undefined) {
                    // 1. Fetch old usages to restore inventory quantities
                    const oldUsages = await tx.inventoryUsage.findMany({ where: { report_id: id } })
                    for (const old of oldUsages) {
                        await tx.inventoryItem.update({
                            where: { id: old.item_id },
                            data: { quantity: { increment: old.quantity_used } }
                        })
                    }

                    // 2. Delete old usages
                    await tx.inventoryUsage.deleteMany({ where: { report_id: id } })

                    // 3. Apply new usages
                    if (inventory_usage && inventory_usage.length > 0) {
                        for (const usage of inventory_usage) {
                            const qty = Number(usage.quantity) || 0
                            if (qty <= 0) continue

                            await tx.inventoryUsage.create({
                                data: {
                                    report_id: id,
                                    item_id: usage.item_id,
                                    quantity_used: qty
                                }
                            })

                            await tx.inventoryItem.update({
                                where: { id: usage.item_id },
                                data: { quantity: { decrement: qty } }
                            })
                        }
                    }
                }

                if (sale_items !== undefined) {
                    await tx.saleItem.deleteMany({ where: { report_id: id } })
                    if (sale_items.length > 0) {
                        await tx.saleItem.createMany({
                            data: sale_items.map((item: any) => ({
                                report_id: id,
                                category: item.category,
                                description: item.description,
                                quantity: Number(item.quantity) || 1,
                                unit_price: Number(item.unit_price) || 0
                            }))
                        })
                    }
                }

                // Handle Image Deletions
                if (keptImageIds) {
                    await tx.reportImage.deleteMany({
                        where: {
                            report_id: id,
                            id: { notIn: keptImageIds }
                        }
                    })
                }

                // Handle Image Additions
                if (newImageUrls && newImageUrls.length > 0) {
                    await tx.reportImage.createMany({
                        data: newImageUrls.map((url: string) => ({
                            report_id: id,
                            image_url: url
                        }))
                    })
                }

                await tx.editLog.create({
                    data: {
                        report_id: id,
                        user_id: session.user.id,
                        changes: JSON.stringify(changes)
                    }
                })

                await tx.systemLog.create({
                    data: {
                        user_id: session.user.id,
                        action: 'REPORT_EDIT',
                        entity: 'DailyReport',
                        entity_id: id,
                        details: JSON.stringify(changes)
                    }
                })
                return report
            })

            sendIrregularEditAlert({
                storeName: existingReport.store.name,
                reportDate: existingReport.report_date.toLocaleDateString('en-US', { timeZone: 'UTC' }),
                editorName: session.user.name || session.user.email || "Admin User",
                changesText: JSON.stringify(changes, null, 2)
            })

            evaluateReportForAnomalies(updatedReport.id).catch(console.error)

            return NextResponse.json(updatedReport)
        } else {
            // Admin is just updating status (Verify / Correction Requested)
            const transaction = await prisma.$transaction(async (tx: any) => {
                const report = await tx.dailyReport.update({
                    where: { id },
                    data: { status }
                })

                await tx.systemLog.create({
                    data: {
                        user_id: session.user.id,
                        action: 'REPORT_STATUS_UPDATE',
                        entity: 'DailyReport',
                        entity_id: id,
                        details: JSON.stringify({ new_status: status })
                    }
                })
                return report
            })

            evaluateReportForAnomalies(transaction.id).catch(console.error)

            return NextResponse.json(transaction, { status: 200 })
        }
    } catch (error: any) {
        console.error(error)
        return NextResponse.json({ error: 'Failed to update report' }, { status: 500 })
    }
}
