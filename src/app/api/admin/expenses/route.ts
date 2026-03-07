import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (session?.user?.role !== 'Admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const storeId = searchParams.get('storeId')
    const startDateStr = searchParams.get('startDate')
    const endDateStr = searchParams.get('endDate')

    const where: any = {}

    if (storeId) {
        where.store_id = storeId
    }

    if (startDateStr || endDateStr) {
        where.expense_date = {}
        if (startDateStr) where.expense_date.gte = new Date(startDateStr)
        if (endDateStr) where.expense_date.lte = new Date(endDateStr)
    }

    try {
        const expenses = await prisma.storeExpense.findMany({
            where,
            orderBy: { expense_date: 'desc' },
            include: {
                store: { select: { name: true } },
                user: { select: { name: true } } // The admin who logged it
            }
        })

        return NextResponse.json(expenses)
    } catch (err: any) {
        return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 })
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (session?.user?.role !== 'Admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { store_id, category, amount, expense_date, notes } = body

    if (!store_id || !category || amount === undefined) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    try {
        const expense = await prisma.$transaction(async (tx: any) => {
            const newExpense = await tx.storeExpense.create({
                data: {
                    store_id,
                    user_id: session.user.id,
                    category,
                    amount: Number(amount),
                    expense_date: expense_date ? new Date(expense_date) : new Date(),
                    notes: notes || null
                }
            })

            await tx.systemLog.create({
                data: {
                    user_id: session.user.id,
                    action: 'STORE_EXPENSE_CREATE',
                    entity: 'StoreExpense',
                    entity_id: newExpense.id,
                    details: JSON.stringify({ store: store_id, category, amount: Number(amount) })
                }
            })

            return newExpense
        })

        return NextResponse.json(expense)
    } catch (err: any) {
        return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 })
    }
}
