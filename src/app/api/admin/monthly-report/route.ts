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
const SYSTEM_EPOCH = dayjs.tz('2026-03-01T00:00:00', TIMEZONE)

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user.role !== 'Admin' && session.user.role !== 'Manager')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const storeId = searchParams.get('storeId')
    const monthParam = searchParams.get('month') // YYYY-MM
    const startDateParam = searchParams.get('startDate') // YYYY-MM-DD
    const endDateParam = searchParams.get('endDate') // YYYY-MM-DD

    if (!storeId) {
        return NextResponse.json({ error: 'storeId required' }, { status: 400 })
    }

    const store = await prisma.store.findFirst({ where: { id: storeId, company_id: session.user.companyId } })
    if (!store) {
        return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    const nowTz = dayjs().tz(TIMEZONE)
    const baseMonth = monthParam ? dayjs.tz(`${monthParam}-01T00:00:00`, TIMEZONE) : nowTz.startOf('month')
    const isCurrentMonth = baseMonth.format('YYYY-MM') === nowTz.format('YYYY-MM')

    const monthStart = baseMonth.startOf('month')
    const monthEnd = isCurrentMonth ? nowTz.startOf('day') : baseMonth.endOf('month').startOf('day')

    // Clamp external filters to the selected month's boundaries
    let effectiveStart = monthStart
    let effectiveEnd = monthEnd

    if (startDateParam) {
        const s = dayjs.tz(startDateParam, TIMEZONE).startOf('day')
        if (s.isAfter(monthStart) || s.isSame(monthStart, 'day')) {
            effectiveStart = s
        }
    }
    if (endDateParam) {
        const e = dayjs.tz(endDateParam, TIMEZONE).startOf('day')
        if (e.isBefore(monthEnd) || e.isSame(monthEnd, 'day')) {
            effectiveEnd = e
        }
    }

    // Never go before system epoch
    if (effectiveStart.isBefore(SYSTEM_EPOCH)) effectiveStart = SYSTEM_EPOCH

    // Build dates array newest first
    const dates: string[] = []
    for (let d = effectiveEnd; d.isAfter(effectiveStart) || d.isSame(effectiveStart, 'day'); d = d.subtract(1, 'day')) {
        dates.push(d.format('YYYY-MM-DD'))
    }

    if (dates.length === 0) {
        return NextResponse.json({
            data: [],
            summary: { totalCash: 0, totalCard: 0, totalAmount: 0, totalExpenses: 0, submittedCount: 0, missingCount: 0, verifiedCount: 0, unverifiedCount: 0 },
            storeName: store.name,
            storeCity: store.city,
            month: baseMonth.format('MMMM YYYY')
        })
    }

    const reports = await prisma.dailyReport.findMany({
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
            notes: true,
            submitted_by: { select: { name: true } }
        },
        orderBy: { report_date: 'desc' }
    })

    const adminExpenses = await prisma.storeExpense.findMany({
        where: {
            store_id: storeId,
            expense_date: {
                gte: new Date(`${dates[dates.length - 1]}T00:00:00.000Z`),
                lte: new Date(`${dates[0]}T00:00:00.000Z`)
            },
            approval_status: 'Approved'
        },
        select: {
            expense_date: true,
            amount: true,
            payment_method: true,
            category: true,
            notes: true,
            review_note: true,
            reviewed_by: { select: { name: true } },
            user: { select: { name: true } }
        }
    })

    const reportMap = new Map()
    reports.forEach(r => reportMap.set(r.report_date.toISOString().split('T')[0], r))

    const adminExpMap = new Map()
    adminExpenses.forEach(e => {
        const key = e.expense_date.toISOString().split('T')[0]
        if (!adminExpMap.has(key)) adminExpMap.set(key, [])
        adminExpMap.get(key).push(e)
    })

    let totalCash = 0, totalCard = 0, totalAmount = 0, totalExpenses = 0
    let submittedCount = 0, missingCount = 0, verifiedCount = 0, unverifiedCount = 0

    const finalData = dates.map(dateStr => {
        const dayAdminExps = adminExpMap.get(dateStr) || []
        const cashAdminExp = dayAdminExps.filter((e: any) => e.payment_method === 'Cash').reduce((a: number, e: any) => a + Number(e.amount), 0)
        const totalAdminExp = dayAdminExps.reduce((a: number, e: any) => a + Number(e.amount), 0)

        if (reportMap.has(dateStr)) {
            const r = reportMap.get(dateStr)
            const staffExp = Number(r.expenses_amount || 0) + Number(r.payouts_amount || 0)
            const netCash = Number(r.cash_amount) - staffExp - cashAdminExp
            
            totalCash += netCash
            totalCard += Number(r.card_amount)
            totalAmount += Number(r.total_amount)
            totalExpenses += (Number(r.expenses_amount || 0) + totalAdminExp)
            
            submittedCount++
            if (r.status === 'Verified') verifiedCount++
            else unverifiedCount++
            
            return { 
                ...r, 
                report_date: `${dateStr}T00:00:00.000Z`,
                admin_expenses_amount: totalAdminExp,
                net_cash: netCash 
            }
        }
        
        // Even for missing days, admin expenses track
        totalExpenses += totalAdminExp
        totalCash -= cashAdminExp

        const dayName = dayjs.utc(dateStr).format('dddd')
        const ops: any = typeof store.operating_hours === 'string' && store.operating_hours ? JSON.parse(store.operating_hours) : store.operating_hours;
        const isOpen = !ops || !ops[dayName] || ops[dayName].isOpen;

        if (isOpen) missingCount++
        return {
            id: `missing-${dateStr}`,
            report_date: `${dateStr}T00:00:00.000Z`,
            cash_amount: null,
            card_amount: null,
            total_amount: null,
            expenses_amount: null,
            payouts_amount: null,
            admin_expenses_amount: totalAdminExp,
            net_cash: -cashAdminExp,
            status: isOpen ? 'Missing' : 'Closed',
            submitted_by: null
        }
    })

    return NextResponse.json({
        data: finalData,
        summary: { totalCash, totalCard, totalAmount, totalExpenses, submittedCount, missingCount, verifiedCount, unverifiedCount },
        expensesList: adminExpenses,
        storeName: store.name,
        storeCity: store.city,
        month: baseMonth.format('MMMM YYYY')
    })
}
