import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export const dynamic = 'force-dynamic'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions)
    if (session?.user?.role !== 'Admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const store_id = (await params).id

    const members = await prisma.storeMember.findMany({
        where: { store_id },
        include: {
            user: { select: { name: true, email: true, status: true } }
        },
        orderBy: { assigned_at: 'desc' }
    })

    return NextResponse.json(members)
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions)
    if (session?.user?.role !== 'Admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const store_id = (await params).id
    const body = await req.json()
    const { user_id, is_reporter } = body

    // Check limits
    const store = await prisma.store.findUnique({
        where: { id: store_id },
        include: { _count: { select: { members: { where: { status: 'Active' } } } } }
    })

    if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 })

    // If we are adding an active member, check the count
    const activeCount = store._count.members

    // Check if member already exists (including inactive ones)
    const existing = await prisma.storeMember.findUnique({
        where: { store_id_user_id: { store_id, user_id } }
    })

    if (existing?.status === 'Active') {
        return NextResponse.json({ error: 'User is already an active member of this store' }, { status: 400 })
    }

    if (activeCount >= store.max_members && !existing) {
        return NextResponse.json({ error: `Cannot exceed maximum of ${store.max_members} active members` }, { status: 400 })
    }

    // If there's an existing inactive member, we reactivate it
    if (existing) {
        if (activeCount >= store.max_members) {
            return NextResponse.json({ error: `Cannot exceed maximum of ${store.max_members} active members` }, { status: 400 })
        }
        const updated = await prisma.storeMember.update({
            where: { id: existing.id },
            data: { status: 'Active', is_reporter: Boolean(is_reporter) }
        })
        return NextResponse.json(updated)
    }

    const member = await prisma.storeMember.create({
        data: {
            store_id,
            user_id,
            is_reporter: Boolean(is_reporter),
            status: 'Active'
        }
    })

    return NextResponse.json(member)
}
