import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import prisma from '@/lib/prisma'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'Admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const categoryId = (await params).id
        const category = await prisma.category.findUnique({
            where: { id: categoryId }
        })
        if (!category) return NextResponse.json({ error: 'Category not found' }, { status: 404 })

        return NextResponse.json(category)
    } catch (error) {
        console.error('Error fetching category:', error)
        return NextResponse.json({ error: 'Failed to fetch category' }, { status: 500 })
    }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'Admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const categoryId = (await params).id
        const body = await req.json()
        const { name, status } = body

        if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

        const updatedCategory = await prisma.category.update({
            where: { id: categoryId },
            data: { name, status }
        })

        await prisma.systemLog.create({
            data: {
                user_id: session.user.id as string,
                action: 'UPDATE_CATEGORY',
                entity: 'Category',
                entity_id: categoryId,
                details: JSON.stringify({ name, status })
            }
        })

        return NextResponse.json(updatedCategory)
    } catch (error) {
        console.error('Error updating category:', error)
        return NextResponse.json({ error: 'Failed to update category' }, { status: 500 })
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'Admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const categoryId = (await params).id
        const deactivated = await prisma.category.update({
            where: { id: categoryId },
            data: { status: 'Inactive' }
        })

        await prisma.systemLog.create({
            data: {
                user_id: session.user.id as string,
                action: 'DEACTIVATE_CATEGORY',
                entity: 'Category',
                entity_id: categoryId,
                details: JSON.stringify({ message: 'Category status set to Inactive' })
            }
        })

        return NextResponse.json(deactivated)
    } catch (error) {
        console.error('Error deactivating category:', error)
        return NextResponse.json({ error: 'Failed to deactivate category' }, { status: 500 })
    }
}
