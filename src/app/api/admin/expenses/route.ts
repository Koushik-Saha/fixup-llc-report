import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(utc)
dayjs.extend(timezone)

const TIMEZONE = 'America/Los_Angeles'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (session?.user?.role !== 'Admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const storeId = searchParams.get('storeId')
    const startDateStr = searchParams.get('startDate')
    const endDateStr = searchParams.get('endDate')

    const where: any = { store: { company_id: session.user.companyId } }

    if (storeId) {
        where.store_id = storeId
    }

    if (startDateStr || endDateStr) {
        where.expense_date = {}
        if (startDateStr) where.expense_date.gte = dayjs.tz(`${startDateStr}T00:00:00`, TIMEZONE).toDate()
        if (endDateStr) where.expense_date.lte = dayjs.tz(`${endDateStr}T23:59:59`, TIMEZONE).toDate()
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
    const { store_id, category, amount, expense_date, notes, payment_method } = body

    if (!store_id || !category || amount === undefined) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const validStore = await prisma.store.findFirst({
        where: { id: store_id, company_id: session.user.companyId }
    })
    if (!validStore) return NextResponse.json({ error: 'Unauthorized store access' }, { status: 403 })

    try {
        const expense = await prisma.$transaction(async (tx: any) => {
            const newExpense = await tx.storeExpense.create({
                data: {
                    store_id,
                    user_id: session.user.id,
                    category,
                    payment_method: payment_method || 'Cash',
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
