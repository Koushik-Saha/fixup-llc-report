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

    if (!storeId) {
        return NextResponse.json({ error: 'storeId required' }, { status: 400 })
    }

    const store = await prisma.store.findUnique({ where: { id: storeId } })
    if (!store) {
        return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    const nowTz = dayjs().tz(TIMEZONE)
    const baseMonth = monthParam ? dayjs.tz(`${monthParam}-01T00:00:00`, TIMEZONE) : nowTz.startOf('month')
    const isCurrentMonth = baseMonth.format('YYYY-MM') === nowTz.format('YYYY-MM')

    const monthStart = baseMonth.startOf('month')
    const effectiveStart = monthStart.isBefore(SYSTEM_EPOCH) ? SYSTEM_EPOCH : monthStart
    const monthEnd = isCurrentMonth ? nowTz.startOf('day') : baseMonth.endOf('month').startOf('day')

    // Build dates array newest first
    const dates: string[] = []
    for (let d = monthEnd; d.isAfter(effectiveStart) || d.isSame(effectiveStart, 'day'); d = d.subtract(1, 'day')) {
        dates.push(d.format('YYYY-MM-DD'))
    }

    if (dates.length === 0) {
        return NextResponse.json({
            data: [],
            summary: { totalCash: 0, totalCard: 0, totalAmount: 0, submittedCount: 0, missingCount: 0, verifiedCount: 0, unverifiedCount: 0 },
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
            }
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
            submitted_by: { select: { name: true } }
        },
        orderBy: { report_date: 'desc' }
    })

    const reportMap = new Map()
    reports.forEach(r => reportMap.set(r.report_date.toISOString().split('T')[0], r))

    let totalCash = 0, totalCard = 0, totalAmount = 0
    let submittedCount = 0, missingCount = 0, verifiedCount = 0, unverifiedCount = 0

    const finalData = dates.map(dateStr => {
        if (reportMap.has(dateStr)) {
            const r = reportMap.get(dateStr)
            totalCash += Number(r.cash_amount)
            totalCard += Number(r.card_amount)
            totalAmount += Number(r.total_amount)
            submittedCount++
            if (r.status === 'Verified') verifiedCount++
            else unverifiedCount++
            return { ...r, report_date: `${dateStr}T00:00:00.000Z` }
        }
        missingCount++
        return {
            id: `missing-${dateStr}`,
            report_date: `${dateStr}T00:00:00.000Z`,
            cash_amount: null,
            card_amount: null,
            total_amount: null,
            expenses_amount: null,
            payouts_amount: null,
            status: 'Missing',
            submitted_by: null
        }
    })

    return NextResponse.json({
        data: finalData,
        summary: { totalCash, totalCard, totalAmount, submittedCount, missingCount, verifiedCount, unverifiedCount },
        storeName: store.name,
        storeCity: store.city,
        month: baseMonth.format('MMMM YYYY')
    })
}
