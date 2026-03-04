import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

export async function GET() {
    const session = await getServerSession(authOptions)
    if (session?.user?.role !== 'Admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const users = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true,
            createdAt: true
        }
    })
    return NextResponse.json(users)
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (session?.user?.role !== 'Admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { name, email, password, role, status } = body

    if (!name || !email || !password) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
        return NextResponse.json({ error: 'Email already exists' }, { status: 400 })
    }

    const password_hash = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
        data: {
            name,
            email,
            password_hash,
            role: role || 'Staff',
            status: status || 'Active',
        }
    })

    await prisma.systemLog.create({
        data: {
            user_id: session.user.id,
            action: 'USER_CREATE',
            entity: 'User',
            entity_id: user.id,
            details: JSON.stringify({ name: user.name, email: user.email, role: user.role })
        }
    })

    return NextResponse.json({ id: user.id, name: user.name, email: user.email })
}
