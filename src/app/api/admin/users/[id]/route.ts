import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import bcrypt from 'bcryptjs'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions)
    if (session?.user?.role !== 'Admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const id = (await params).id

    const user = await prisma.user.findUnique({
        where: { id },
        select: { id: true, name: true, email: true, role: true, status: true }
    })
    if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json(user)
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions)
    if (session?.user?.role !== 'Admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const id = (await params).id
    const body = await req.json()
    const { name, email, role, status, password } = body

    const updateData: any = { name, email, role, status }

    if (password) {
        updateData.password_hash = await bcrypt.hash(password, 10)
    }

    try {
        const user = await prisma.user.update({
            where: { id },
            data: updateData
        })
        return NextResponse.json({ id: user.id, name: user.name, email: user.email })
    } catch (err: any) {
        return NextResponse.json({ error: 'Update failed' }, { status: 400 })
    }
}
