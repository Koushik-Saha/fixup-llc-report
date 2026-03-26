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

export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'Staff') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const storeId = session.user.storeId
    if (!storeId) {
        return NextResponse.json({ error: 'No active store assigned' }, { status: 400 })
    }

    const store = await prisma.store.findUnique({ where: { id: storeId } })
    if (!store) {
        return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    const nowTz = dayjs().tz(TIMEZONE)
    const SYSTEM_EPOCH = dayjs.tz('2026-03-01T00:00:00', TIMEZONE)

    // Current month boundaries
    const monthStart = nowTz.startOf('month')
    const effectiveStart = monthStart.isBefore(SYSTEM_EPOCH) ? SYSTEM_EPOCH : monthStart
    const monthEnd = nowTz.startOf('day') // up to today

    // Build array of dates from effectiveStart to today (inclusive), newest first
    const dates: string[] = []
    for (let d = monthEnd; d.isAfter(effectiveStart) || d.isSame(effectiveStart, 'day'); d = d.subtract(1, 'day')) {
        dates.push(d.format('YYYY-MM-DD'))
    }

    if (dates.length === 0) {
        return NextResponse.json({
            data: [],
            summary: { totalCash: 0, totalCard: 0, totalAmount: 0, submittedCount: 0, missingCount: 0 },
            storeName: store.name,
            month: nowTz.format('MMMM YYYY')
        })
    }

    const [reports, adminExpenses] = await Promise.all([
        prisma.dailyReport.findMany({
            where: {
                store_id: storeId,
                report_date: {
                    gte: new Date(`${dates[dates.length - 1]}T00:00:00.000Z`),
                    lte: new Date(`${dates[0]}T00:00:00.000Z`)
                },
                deleted_at: null
            },
            select: {
                id: true,
                report_date: true,
                cash_amount: true,
                card_amount: true,
                total_amount: true,
                expenses_amount: true,
                payouts_amount: true,
                status: true,
                store: { select: { name: true } }
            },
            orderBy: { report_date: 'desc' }
        }),
        prisma.storeExpense.findMany({
            where: {
                store_id: storeId,
                expense_date: {
                    gte: new Date(`${dates[dates.length - 1]}T00:00:00.000Z`),
                    lte: new Date(`${dates[0]}T00:00:00.000Z`)
                },
                payment_method: 'Cash',
                approval_status: 'Approved'
            },
            select: {
                amount: true,
                expense_date: true
            }
        })
    ])

    const reportMap = new Map()
    reports.forEach(r => reportMap.set(r.report_date.toISOString().split('T')[0], r))

    const adminExpMap = new Map()
    adminExpenses.forEach(e => {
        const dateKey = e.expense_date.toISOString().split('T')[0]
        adminExpMap.set(dateKey, (adminExpMap.get(dateKey) || 0) + Number(e.amount))
    })

    let totalCash = 0
    let totalCard = 0
    let totalAmount = 0
    let totalExpenses = 0
    let submittedCount = 0
    let missingCount = 0

    const finalData = dates.map(dateStr => {
        const adminCash = adminExpMap.get(dateStr) || 0
        if (reportMap.has(dateStr)) {
            const r = reportMap.get(dateStr)
            // Net Cash = Report Cash - Report Staff Exp - Report Payouts - Admin Cash Exp
            const netCash = Number(r.cash_amount) - Number(r.expenses_amount || 0) - Number(r.payouts_amount || 0) - adminCash
            totalCash += netCash
            totalCard += Number(r.card_amount)
            totalAmount += Number(r.total_amount)
            totalExpenses += Number(r.expenses_amount || 0) + adminCash
            submittedCount++
            return { ...r, net_cash: netCash }
        }
        missingCount++
        return {
            id: `missing-${dateStr}`,
            report_date: new Date(`${dateStr}T00:00:00.000Z`),
            cash_amount: null,
            card_amount: null,
            total_amount: null,
            status: 'Missing',
            store: { name: store.name }
        }
    })

    return NextResponse.json({
        data: finalData,
        summary: { totalCash, totalCard, totalAmount, totalExpenses, submittedCount, missingCount },
        storeName: store.name,
        month: nowTz.format('MMMM YYYY')
    })
}
