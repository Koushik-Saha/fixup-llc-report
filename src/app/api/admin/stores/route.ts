import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user.role !== 'Admin' && session.user.role !== 'Manager')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const where: any = { company_id: session.user.companyId }
    if (status) where.status = status
    if (session.user.role === 'Manager') {
        const memberships = await prisma.storeMember.findMany({
            where: { user_id: session.user.id, status: 'Active' },
            select: { store_id: true }
        })
        const allowed = memberships.map(m => m.store_id)
        if (allowed.length === 0) return NextResponse.json([])
        where.id = { in: allowed }
    }

    const stores = await prisma.store.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
            _count: {
                select: { members: { where: { status: 'Active' } } }
            },
            members: {
                where: { status: 'Active' },
                include: {
                    user: { select: { name: true, role: true } }
                }
            }
        }
    })
    return NextResponse.json(stores)
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (session?.user?.role !== 'Admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { name, address, city, state, zip_code, block, max_members, status, operating_hours } = body

    if (!name || !address || !city || !state || !zip_code) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const store = await prisma.store.create({
        data: {
            company_id: session.user.companyId,
            name,
            address,
            city,
            state,
            zip_code,
            block: block || null,
            max_members: Number(max_members) || 3,
            status: status || 'Active',
            operating_hours: operating_hours || undefined
        }
    })

    await prisma.systemLog.create({
        data: {
            user_id: session.user.id,
            action: 'STORE_CREATE',
            entity: 'Store',
            entity_id: store.id,
            details: JSON.stringify({ name: store.name, city: store.city, state: store.state })
        }
    })

    return NextResponse.json(store)
}
