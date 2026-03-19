import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user || session.user.role !== 'Admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const store_id = searchParams.get('store_id')

        let where: any = {}
        if (store_id) where.store_id = store_id

        const inventory = await prisma.inventoryItem.findMany({
            where,
            include: {
                store: { select: { id: true, name: true } }
            },
            orderBy: [{ store_id: 'asc' }, { category: 'asc' }, { name: 'asc' }]
        })

        return NextResponse.json({ success: true, data: inventory })
    } catch (error: any) {
        console.error('Failed to fetch inventory:', error)
        return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user || session.user.role !== 'Admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { store_id, name, sku, quantity, unit_cost, reorder_level, category } = body

        if (!store_id || !name) {
            return NextResponse.json({ error: 'Store ID and Name are required' }, { status: 400 })
        }

        const newItem = await prisma.inventoryItem.create({
            data: {
                store_id,
                name,
                sku: sku || null,
                quantity: Number(quantity) || 0,
                unit_cost: Number(unit_cost) || 0,
                reorder_level: Number(reorder_level) || 0,
                category: category || 'General'
            },
            include: {
                store: { select: { id: true, name: true } }
            }
        })

        return NextResponse.json({ success: true, data: newItem })
    } catch (error: any) {
        console.error('Failed to create inventory item:', error)
        return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
    }
}
