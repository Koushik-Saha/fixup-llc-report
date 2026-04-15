import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export const dynamic = 'force-dynamic'

// POST /api/admin/inventory/import
// Body: { store_id: string, items: { name, category, quantity, sku }[] }
export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user || !['Admin', 'SuperAdmin', 'Manager'].includes(session.user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { store_id, items } = body

        if (!store_id) {
            return NextResponse.json({ error: 'store_id is required' }, { status: 400 })
        }
        if (!Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: 'items array is required and must not be empty' }, { status: 400 })
        }

        // Verify the store belongs to this company
        const store = await prisma.store.findFirst({
            where: { id: store_id, company_id: session.user.companyId, status: 'Active' }
        })
        if (!store) {
            return NextResponse.json({ error: 'Store not found or access denied' }, { status: 404 })
        }

        // Clear existing inventory for this store
        await prisma.inventoryItem.deleteMany({ where: { store_id: store.id } })

        // Bulk insert
        await prisma.inventoryItem.createMany({
            data: items.map((item: any) => ({
                store_id:      store.id,
                name:          String(item.name || '').trim(),
                sku:           item.sku ? String(item.sku).trim().substring(0, 100) : null,
                category:      String(item.category || 'General').trim(),
                quantity:      Math.max(0, parseInt(item.quantity) || 0),
                unit_cost:     parseFloat(item.unit_cost) || 0,
                reorder_level: parseInt(item.reorder_level) || 1,
            }))
        })

        return NextResponse.json({
            success: true,
            message: `Imported ${items.length} inventory items into "${store.name}"`,
            store: store.name,
            count: items.length
        })
    } catch (error: any) {
        console.error('Import failed:', error)
        return NextResponse.json({ error: error.message || 'Import failed' }, { status: 500 })
    }
}
