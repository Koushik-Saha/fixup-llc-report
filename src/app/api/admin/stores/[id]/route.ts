import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions)
    if (session?.user?.role !== 'Admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const id = (await params).id
    const store = await prisma.store.findUnique({
        where: { id }
    })
    if (!store) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json(store)
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions)
    if (session?.user?.role !== 'Admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const id = (await params).id
    const body = await req.json()
    const { name, address, city, state, zip_code, block, max_members, status } = body

    const store = await prisma.store.update({
        where: { id },
        data: {
            name,
            address,
            city,
            state,
            zip_code,
            block: block || null,
            max_members: Number(max_members),
            status
        }
    })

    return NextResponse.json(store)
}
