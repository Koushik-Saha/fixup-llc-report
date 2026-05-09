import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { getManagerPermissions } from '@/lib/permissions'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(utc)
dayjs.extend(timezone)

const TIMEZONE = 'America/Los_Angeles'

export const dynamic = 'force-dynamic'

async function getManagerStoreIds(managerId: string): Promise<string[]> {
    const members = await prisma.storeMember.findMany({
        where: { user_id: managerId, status: 'Active' },
        select: { store_id: true }
    })
    return members.map((m: any) => m.store_id)
}

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user || !['Admin', 'Manager'].includes(session.user.role)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const storeId = searchParams.get('storeId')
    const startDateStr = searchParams.get('startDate')
    const endDateStr = searchParams.get('endDate')

    const where: any = { store: { company_id: session.user.companyId } }

    if (session.user.role === 'Manager') {
        const perms = await getManagerPermissions(session.user.companyId)
        if (!perms.expenses.view) return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
        const managerStoreIds = await getManagerStoreIds(session.user.id)
        // If a specific store is requested, validate it's in the manager's stores
        if (storeId) {
            if (!managerStoreIds.includes(storeId)) {
                return NextResponse.json({ error: 'Unauthorized store access' }, { status: 403 })
            }
            where.store_id = storeId
        } else {
            where.store_id = { in: managerStoreIds }
        }
    } else if (storeId) {
        where.store_id = storeId
    }

    if (startDateStr || endDateStr) {
        where.expense_date = {}
        if (startDateStr) where.expense_date.gte = dayjs.tz(`${startDateStr}T00:00:00`, TIMEZONE).toDate()
        if (endDateStr) where.expense_date.lte = dayjs.tz(`${endDateStr}T23:59:59`, TIMEZONE).toDate()
    }

    try {
        const [expenses, dailyReports] = await Promise.all([
            prisma.storeExpense.findMany({
                where,
                orderBy: { expense_date: 'desc' },
                include: {
                    store: { select: { name: true } },
                    user: { select: { name: true } }, // Admin entry
                    reviewed_by: { select: { name: true } }
                }
            }),
            prisma.dailyReport.findMany({
                where: {
                    store_id: where.store_id,
                    report_date: where.expense_date,
                    deleted_at: null,
                    OR: [
                        { expenses_amount: { gt: 0 } },
                        { payouts_amount: { gt: 0 } }
                    ],
                    store: { company_id: session.user.companyId }
                },
                include: {
                    store: { select: { name: true } },
                    submitted_by: { select: { name: true } }
                }
            })
        ])

        // Transform StoreExpense to include common fields
        const directExpenses = expenses.map(e => ({
            ...e,
            source: 'StoreExpense'
        }))

        // Transform DailyReport entries
        const reportDerivedExpenses: any[] = []
        dailyReports.forEach(r => {
            if (Number(r.expenses_amount) > 0) {
                reportDerivedExpenses.push({
                    id: `dr-exp-${r.id}`,
                    store_id: r.store_id,
                    user_id: r.submitted_by_user_id,
                    category: 'Daily Petty Cash',
                    amount: Number(r.expenses_amount),
                    expense_date: r.report_date,
                    notes: r.notes,
                    payment_method: 'Cash',
                    approval_status: r.status === 'Verified' ? 'Approved' : 'Pending',
                    review_note: r.status === 'Verified' ? 'Verified as part of daily report' : null,
                    reviewed_at: r.updatedAt,
                    source: 'DailyReport',
                    store: r.store,
                    user: r.submitted_by,
                    report_id: r.id
                })
            }
            if (Number(r.payouts_amount) > 0) {
              reportDerivedExpenses.push({
                  id: `dr-pay-${r.id}`,
                  store_id: r.store_id,
                  user_id: r.submitted_by_user_id,
                  category: 'Daily Payout',
                  amount: Number(r.payouts_amount),
                  expense_date: r.report_date,
                  notes: r.payouts_details,
                  payment_method: 'Cash',
                  approval_status: r.status === 'Verified' ? 'Approved' : 'Pending',
                  review_note: r.status === 'Verified' ? 'Verified as part of daily report' : null,
                  reviewed_at: r.updatedAt,
                  source: 'DailyReport',
                  store: r.store,
                  user: r.submitted_by,
                  report_id: r.id
              })
            }
        })

        const combined = [...directExpenses, ...reportDerivedExpenses].sort((a, b) => {
            return new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime()
        })

        return NextResponse.json(combined)
    } catch (err: any) {
        console.error('Expenses Fetch Error:', err)
        return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 })
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user || !['Admin', 'Manager'].includes(session.user.role)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { store_id, category, amount, expense_date, notes, payment_method } = body

    if (!store_id || !category || amount === undefined) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (session.user.role === 'Manager') {
        const perms = await getManagerPermissions(session.user.companyId)
        if (!perms.expenses.create) return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
        const managerStoreIds = await getManagerStoreIds(session.user.id)
        if (!managerStoreIds.includes(store_id)) {
            return NextResponse.json({ error: 'Unauthorized store access' }, { status: 403 })
        }
    } else {
        const validStore = await prisma.store.findFirst({
            where: { id: store_id, company_id: session.user.companyId }
        })
        if (!validStore) return NextResponse.json({ error: 'Unauthorized store access' }, { status: 403 })
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
                    notes: notes || null,
                    payment_method: payment_method || 'Cash'
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
