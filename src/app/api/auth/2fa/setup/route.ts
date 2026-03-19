import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import prisma from '@/lib/prisma'
import * as otplibType from 'otplib'
const authenticator = (otplibType as any).authenticator
import QRCode from 'qrcode'
import crypto from 'crypto'

const APP_NAME = 'FixItUp'

// POST /api/auth/2fa/setup — generate secret + QR code
export async function POST() {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = session.user.id as string
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    if (user.two_factor_enabled) {
        return NextResponse.json({ error: '2FA is already enabled' }, { status: 400 })
    }

    // Generate TOTP secret
    const secret = authenticator.generateSecret()
    const otpauth = authenticator.keyuri(user.email, APP_NAME, secret)
    const qrCodeDataUrl = await QRCode.toDataURL(otpauth)

    // Generate 10 one-time backup codes
    const backupCodes = Array.from({ length: 10 }, () =>
        crypto.randomBytes(5).toString('hex').toUpperCase().match(/.{1,5}/g)!.join('-')
    )

    // Store the secret temporarily (not enabled yet — activated on verify)
    await prisma.user.update({
        where: { id: userId },
        data: { totp_secret: secret }
    })

    return NextResponse.json({
        secret,
        qrCode: qrCodeDataUrl,
        backupCodes, // Show once — user must save these
        manualEntry: { account: user.email, issuer: APP_NAME, secret }
    })
}
