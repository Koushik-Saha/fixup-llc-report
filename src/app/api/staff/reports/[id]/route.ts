import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { sendIrregularEditAlert } from '@/lib/email'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export const dynamic = 'force-dynamic'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const report_id = (await params).id

    const report = await prisma.dailyReport.findUnique({
        where: { id: report_id },
        include: {
            images: true,
            store: { select: { name: true, city: true, state: true } },
            submitted_by: { select: { name: true, email: true } }
        }
    })

    if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // If staff, verify accessing their own store's report
    if (session.user.role === 'Staff' && session.user.storeId !== report.store_id) {
        return NextResponse.json({ error: 'Unauthorized to view this report' }, { status: 403 })
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
            let img = report.images[i]
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

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'Staff') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const report_id = (await params).id
    const store_id = session.user.storeId

    // Fetch current report to verify ownership and edit count
    const existingReport = await prisma.dailyReport.findUnique({
        where: { id: report_id },
        include: { store: true }
    })

    if (!existingReport) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (existingReport.store_id !== store_id) {
        return NextResponse.json({ error: 'Unauthorized to edit this report' }, { status: 403 })
    }

    if (existingReport.staff_edit_count >= 2) {
        return NextResponse.json({ error: 'Maximum edit limit (2) reached for this report.' }, { status: 400 })
    }

    const body = await req.json()
    const { cash_amount, card_amount, expenses_amount, payouts_amount, time_in, time_out, notes } = body

    // Calculate what changed
    const netCash = Number(cash_amount) - (Number(expenses_amount) || 0) - (Number(payouts_amount) || 0)
    const total = netCash + Number(card_amount)

    const changes = {
        cash: { old: Number(existingReport.cash_amount), new: Number(cash_amount) },
        card: { old: Number(existingReport.card_amount), new: Number(card_amount) },
        expenses: { old: Number(existingReport.expenses_amount), new: Number(expenses_amount) || 0 },
        payouts: { old: Number(existingReport.payouts_amount), new: Number(payouts_amount) || 0 },
        total: { old: Number(existingReport.total_amount), new: total },
        time_in: { old: (existingReport as any).time_in, new: time_in },
        time_out: { old: (existingReport as any).time_out, new: time_out },
        notes: { old: existingReport.notes, new: notes }
    }

    try {
        const updatedReport = await prisma.$transaction(async (tx: any) => {
            // Update the report fields and increment the edit count
            const report = await tx.dailyReport.update({
                where: { id: report_id },
                data: {
                    cash_amount: Number(cash_amount),
                    card_amount: Number(card_amount),
                    expenses_amount: Number(expenses_amount) || 0,
                    payouts_amount: Number(payouts_amount) || 0,
                    total_amount: total,
                    time_in: time_in || null,
                    time_out: time_out || null,
                    notes: notes || null,
                    staff_edit_count: { increment: 1 }
                }
            })

            // Log the edit using legacy EditLog
            await tx.editLog.create({
                data: {
                    report_id: report_id,
                    user_id: session.user.id,
                    changes: JSON.stringify(changes)
                }
            })

            // Log the edit using universal SystemLog
            await tx.systemLog.create({
                data: {
                    user_id: session.user.id,
                    action: 'REPORT_EDIT',
                    entity: 'DailyReport',
                    entity_id: report_id,
                    details: JSON.stringify(changes)
                }
            })

            return report
        })

        sendIrregularEditAlert({
            storeName: existingReport.store.name,
            reportDate: existingReport.report_date.toLocaleDateString('en-US', { timeZone: 'UTC' }),
            editorName: session.user.name || session.user.email || "Staff Member",
            changesText: JSON.stringify(changes, null, 2)
        })

        return NextResponse.json(updatedReport)
    } catch (err) {
        console.error('Error updating report:', err)
        return NextResponse.json({ error: 'Failed to update report' }, { status: 500 })
    }
}
