import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions)
    if (session?.user?.role !== 'Admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const id = (await params).id

    const report = await prisma.dailyReport.findUnique({
        where: { id },
        include: {
            images: true,
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
    if (session?.user?.role !== 'Admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const id = (await params).id

    const body = await req.json()
    const { status, cash_amount, card_amount, notes } = body

    try {
        if (cash_amount !== undefined && card_amount !== undefined) {
            // Admin is editing the actual amounts
            const existingReport = await prisma.dailyReport.findUnique({ where: { id } })
            if (!existingReport) return NextResponse.json({ error: 'Not found' }, { status: 404 })

            const total = Number(cash_amount) + Number(card_amount)

            const changes = {
                cash: { old: Number(existingReport.cash_amount), new: Number(cash_amount) },
                card: { old: Number(existingReport.card_amount), new: Number(card_amount) },
                total: { old: Number(existingReport.total_amount), new: total },
                notes: { old: existingReport.notes, new: notes }
            }

            const updatedReport = await prisma.$transaction(async (tx: any) => {
                const report = await tx.dailyReport.update({
                    where: { id },
                    data: {
                        status: status || existingReport.status,
                        cash_amount: Number(cash_amount),
                        card_amount: Number(card_amount),
                        total_amount: total,
                        notes: notes || null
                    }
                })

                await tx.editLog.create({
                    data: {
                        report_id: id,
                        user_id: session.user.id,
                        changes: JSON.stringify(changes)
                    }
                })
                return report
            })
            return NextResponse.json(updatedReport)
        } else {
            // Admin is just updating status (Verify / Correction Requested)
            const report = await prisma.dailyReport.update({
                where: { id },
                data: { status }
            })
            return NextResponse.json(report)
        }
    } catch (e) {
        console.error(e)
        return NextResponse.json({ error: 'Failed to update report' }, { status: 500 })
    }
}
