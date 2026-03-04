import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { sendPasswordResetToken } from '@/lib/email'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
    try {
        const { email } = await req.json()

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 })
        }

        const user = await prisma.user.findUnique({
            where: { email }
        })

        // Standard security practice: always return 200 to prevent email enumeration
        if (!user) {
            return NextResponse.json({ success: true, message: 'If the email exists, a reset link was sent.' })
        }

        // Generate a random token
        const resetToken = crypto.randomBytes(32).toString('hex')

        // Expiry 1 hour from now
        const tokenExpiry = new Date()
        tokenExpiry.setHours(tokenExpiry.getHours() + 1)

        // Save token to database
        await prisma.user.update({
            where: { email },
            data: {
                reset_token: resetToken,
                reset_token_expiry: tokenExpiry
            }
        })

        // Send email
        await sendPasswordResetToken(email, resetToken)

        return NextResponse.json({ success: true, message: 'If the email exists, a reset link was sent.' })
    } catch (error) {
        console.error('Error generating password reset token:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
