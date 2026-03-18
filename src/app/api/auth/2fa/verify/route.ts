import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import prisma from '@/lib/prisma'
import { authenticator } from 'otplib'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'

// POST /api/auth/2fa/verify — verify TOTP code during setup, then enable 2FA
export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { code, backupCodes, action } = await req.json()
    // action: 'enable' (during setup), 'check' (during login flow check from session temp)

    const userId = session.user.id as string
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || !user.totp_secret) {
        return NextResponse.json({ error: 'No 2FA setup in progress' }, { status: 400 })
    }

    const isValid = authenticator.verify({ token: code, secret: user.totp_secret })
    if (!isValid) {
        return NextResponse.json({ error: 'Invalid code. Please try again.' }, { status: 400 })
    }

    if (action === 'enable') {
        // Hash backup codes for storage
        const hashedBackups = backupCodes
            ? await Promise.all(backupCodes.map((c: string) => bcrypt.hash(c.replace(/-/g, ''), 10)))
            : []

        await prisma.user.update({
            where: { id: userId },
            data: {
                two_factor_enabled: true,
                backup_codes: JSON.stringify(hashedBackups)
            }
        })

        await prisma.systemLog.create({
            data: {
                user_id: userId,
                action: '2FA_ENABLED',
                entity: 'User',
                entity_id: userId,
                details: JSON.stringify({ email: user.email })
            }
        })

        return NextResponse.json({ ok: true, message: '2FA enabled successfully!' })
    }

    return NextResponse.json({ ok: true })
}
