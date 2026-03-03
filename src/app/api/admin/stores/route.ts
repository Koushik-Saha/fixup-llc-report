import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function GET() {
    const session = await getServerSession(authOptions)
    if (session?.user?.role !== 'Admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const stores = await prisma.store.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
            _count: {
                select: { members: { where: { status: 'Active' } } }
            }
        }
    })
    return NextResponse.json(stores)
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (session?.user?.role !== 'Admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { name, city, state, max_members, status } = body

    if (!name || !city || !state) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const store = await prisma.store.create({
        data: {
            name,
            city,
            state,
            max_members: Number(max_members) || 3,
            status: status || 'Active',
        }
    })

    return NextResponse.json(store)
}
