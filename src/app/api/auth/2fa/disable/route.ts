import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import prisma from '@/lib/prisma'
import { authenticator } from 'otplib'

// POST /api/auth/2fa/disable — disable 2FA (requires current TOTP code)
export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { code } = await req.json()
    if (!code) return NextResponse.json({ error: 'TOTP code required' }, { status: 400 })

    const userId = session.user.id as string
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || !user.two_factor_enabled || !user.totp_secret) {
        return NextResponse.json({ error: '2FA is not enabled' }, { status: 400 })
    }

    const isValid = authenticator.verify({ token: code, secret: user.totp_secret })
    if (!isValid) {
        return NextResponse.json({ error: 'Invalid code' }, { status: 400 })
    }

    await prisma.user.update({
        where: { id: userId },
        data: { two_factor_enabled: false, totp_secret: null, backup_codes: null }
    })

    await prisma.systemLog.create({
        data: {
            user_id: userId,
            action: '2FA_DISABLED',
            entity: 'User',
            entity_id: userId,
            details: JSON.stringify({ email: user.email })
        }
    })

    return NextResponse.json({ ok: true, message: '2FA disabled.' })
}
