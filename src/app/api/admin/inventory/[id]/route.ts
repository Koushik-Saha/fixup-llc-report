import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user || session.user.role !== 'Admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await props.params
        const body = await req.json()
        
        const existingItem = await prisma.inventoryItem.findFirst({
            where: { id, store: { company_id: session.user.companyId } }
        })
        if (!existingItem) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        
        const updateData: any = {}
        if (body.name !== undefined) updateData.name = body.name
        if (body.sku !== undefined) updateData.sku = body.sku || null
        if (body.quantity !== undefined) updateData.quantity = Number(body.quantity)
        if (body.unit_cost !== undefined) updateData.unit_cost = Number(body.unit_cost)
        if (body.reorder_level !== undefined) updateData.reorder_level = Number(body.reorder_level)
        if (body.category !== undefined) updateData.category = body.category

        const updatedItem = await prisma.inventoryItem.update({
            where: { id },
            data: updateData,
            include: {
                store: { select: { id: true, name: true } }
            }
        })

        return NextResponse.json({ success: true, data: updatedItem })
    } catch (error: any) {
        console.error('Failed to update inventory item:', error)
        return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
    }
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user || session.user.role !== 'Admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await props.params

        const existingItem = await prisma.inventoryItem.findFirst({
            where: { id, store: { company_id: session.user.companyId } }
        })
        if (!existingItem) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

        await prisma.inventoryItem.delete({
            where: { id }
        })

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Failed to delete inventory item:', error)
        return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
    }
}
