import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import bcrypt from 'bcryptjs'

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { currentPassword, newPassword } = await req.json()

    if (!currentPassword || !newPassword) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (newPassword.length < 6) {
        return NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id }
    })

    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash)
    if (!isMatch) {
        return NextResponse.json({ error: 'Incorrect current password' }, { status: 400 })
    }

    const newHash = await bcrypt.hash(newPassword, 10)

    await prisma.user.update({
        where: { id: user.id },
        data: { password_hash: newHash }
    })

    await prisma.systemLog.create({
        data: {
            user_id: user.id,
            action: 'PASSWORD_CHANGE',
            entity: 'User',
            entity_id: user.id,
            details: 'User changed their own password'
        }
    })

    return NextResponse.json({ success: true })
}
