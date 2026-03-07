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
        include: { _count: { select: { members: { where: { status: 'Active', user: { role: 'Staff' } } } } } }
    })

    if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 })

    // If we are adding an active staff member, check the count
    const activeStaffCount = store._count.members

    const targetUser = await prisma.user.findUnique({ where: { id: user_id }, select: { role: true } })
    if (!targetUser) return NextResponse.json({ error: 'Target user not found' }, { status: 404 })
    const isTargetStaff = targetUser.role === 'Staff'

    // Check if member already exists (including inactive ones)
    const existing = await prisma.storeMember.findUnique({
        where: { store_id_user_id: { store_id, user_id } }
    })

    if (existing?.status === 'Active') {
        return NextResponse.json({ error: 'User is already an active member of this store' }, { status: 400 })
    }

    if (isTargetStaff && activeStaffCount >= store.max_members && !existing) {
        return NextResponse.json({ error: `Cannot exceed maximum of ${store.max_members} active staff members` }, { status: 400 })
    }

    // If there's an existing inactive member, we reactivate it
    if (existing) {
        if (isTargetStaff && activeStaffCount >= store.max_members) {
            return NextResponse.json({ error: `Cannot exceed maximum of ${store.max_members} active staff members` }, { status: 400 })
        }
        const updated = await prisma.storeMember.update({
            where: { id: existing.id },
            data: { status: 'Active', is_reporter: Boolean(is_reporter) }
        })

        await prisma.systemLog.create({
            data: {
                user_id: session.user.id,
                action: 'MEMBER_REACTIVATED',
                entity: 'StoreMember',
                entity_id: updated.id,
                details: JSON.stringify({ store_id, target_user: user_id, is_reporter })
            }
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

    await prisma.systemLog.create({
        data: {
            user_id: session.user.id,
            action: 'MEMBER_ASSIGNED',
            entity: 'StoreMember',
            entity_id: member.id,
            details: JSON.stringify({ store_id, target_user: user_id, is_reporter })
        }
    })

    return NextResponse.json(member)
}
