import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import prisma from '@/lib/prisma'

export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const categories = await prisma.category.findMany({
            where: { company_id: session.user.companyId },
            orderBy: { name: 'asc' },
            include: {
                _count: {
                    select: { reports: true }
                }
            }
        })
        return NextResponse.json(categories)
    } catch (error) {
        console.error('Error fetching categories:', error)
        return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'Admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { name } = await req.json()
        if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

        const newCategory = await prisma.category.create({
            data: { company_id: session.user.companyId, name }
        })

        await prisma.systemLog.create({
            data: {
                user_id: session.user.id as string,
                action: 'CREATE_CATEGORY',
                entity: 'Category',
                entity_id: newCategory.id,
                details: JSON.stringify({ name })
            }
        })

        return NextResponse.json(newCategory, { status: 201 })
    } catch (error) {
        console.error('Error creating category:', error)
        return NextResponse.json({ error: 'Failed to create category' }, { status: 500 })
    }
}
