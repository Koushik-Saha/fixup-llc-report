import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
    try {
        const { email, token, newPassword } = await req.json()

        if (!email || !token || !newPassword) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        if (newPassword.length < 6) {
            return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
        }

        // Find user by email
        const user = await prisma.user.findUnique({
            where: { email }
        })

        if (!user) {
            return NextResponse.json({ error: 'Invalid token or email' }, { status: 400 })
        }

        // Verify token matches and has not expired
        if (
            !user.reset_token ||
            user.reset_token !== token ||
            !user.reset_token_expiry ||
            user.reset_token_expiry < new Date()
        ) {
            return NextResponse.json({ error: 'Invalid or expired reset token' }, { status: 400 })
        }

        // Hash new password
        const password_hash = await bcrypt.hash(newPassword, 10)

        // Update user: set new password and clear token fields
        await prisma.user.update({
            where: { email },
            data: {
                password_hash,
                reset_token: null,
                reset_token_expiry: null
            }
        })

        return NextResponse.json({ success: true, message: 'Password reset successfully' })

    } catch (error) {
        console.error('Error resetting password:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
