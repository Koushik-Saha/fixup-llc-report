import { NextRequest, NextResponse } from 'next/server'
import { getToken, encode } from 'next-auth/jwt'
import prisma from '@/lib/prisma'

export async function POST(req: NextRequest) {
    const adminToken = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!adminToken || (adminToken.role !== 'Admin' && adminToken.role !== 'SuperAdmin')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId } = await req.json()
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    const targetUser = await prisma.user.findUnique({
        where: { id: userId },
        include: { storeMembers: { where: { status: 'Active' }, select: { store_id: true }, take: 1 } }
    })

    if (!targetUser || targetUser.status !== 'Active') {
        return NextResponse.json({ error: 'User not found or inactive' }, { status: 404 })
    }

    // Build a NextAuth-compatible session token for the target user
    const sessionToken = await encode({
        token: {
            id: targetUser.id,
            email: targetUser.email,
            name: targetUser.name,
            role: targetUser.role,
            status: targetUser.status,
            storeId: targetUser.storeMembers[0]?.store_id ?? null,
            companyId: targetUser.company_id,
            sub: targetUser.id,
            // Mark as impersonation so it can be detected if needed
            impersonatedBy: adminToken.id as string,
        },
        secret: process.env.NEXTAUTH_SECRET!,
        maxAge: 60 * 60, // 1-hour impersonation window
    })

    const redirectTo =
        targetUser.role === 'Staff' ? '/staff/home' :
        targetUser.role === 'Manager' ? '/admin/todays-reports' :
        '/admin/dashboard'

    const isSecure = process.env.NODE_ENV === 'production'
    const cookieName = isSecure ? '__Secure-next-auth.session-token' : 'next-auth.session-token'

    const res = NextResponse.json({ success: true, redirectTo })
    res.cookies.set(cookieName, sessionToken, {
        httpOnly: true,
        secure: isSecure,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60,
    })
    return res
}
