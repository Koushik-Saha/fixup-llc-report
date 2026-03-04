import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

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
