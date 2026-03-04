import { NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { v4 as uuidv4 } from 'uuid'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user.role !== 'Staff' && session.user.role !== 'Admin')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate AWS config exists before attempting to sign
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.AWS_S3_BUCKET_NAME) {
        return NextResponse.json({ error: 'AWS S3 credentials are not configured in the server environment.' }, { status: 500 })
    }

    const s3 = new S3Client({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        }
    })

    const { filename, contentType } = await req.json()

    if (!filename || !contentType) {
        return NextResponse.json({ error: 'Filename and contentType are required' }, { status: 400 })
    }

    try {
        const ext = filename.split('.').pop()
        const uniqueFilename = `${uuidv4()}.${ext}`
        const folder = session.user.role === 'Admin' ? 'admin_edits' : session.user.storeId
        const key = `reports/${folder}/${new Date().toISOString().split('T')[0]}/${uniqueFilename}`

        const command = new PutObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET_NAME!,
            Key: key,
            ContentType: contentType,
        })

        const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 }) // 1 hour expiration

        const publicUrl = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`

        return NextResponse.json({ presignedUrl, publicUrl, key })
    } catch (error) {
        console.error('Error generating presigned URL:', error)
        return NextResponse.json({ error: 'Failed to generate presigned URL' }, { status: 500 })
    }
}
