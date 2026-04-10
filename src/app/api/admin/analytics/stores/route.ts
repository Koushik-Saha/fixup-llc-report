import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import prisma from '@/lib/prisma'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(utc)
dayjs.extend(timezone)

const TIMEZONE = 'America/Los_Angeles'

function parseHours(t: string | null | undefined): number | null {
    if (!t) return null
    const cleaned = t.trim()
    if (/am|pm/i.test(cleaned)) {
        const [time, period] = cleaned.split(' ')
        let [h, m] = time.split(':').map(Number)
        if (/pm/i.test(period) && h !== 12) h += 12
        if (/am/i.test(period) && h === 12) h = 0
        return isNaN(h) || isNaN(m) ? null : h + m / 60
    }
    const [h, m] = cleaned.split(':').map(Number)
    return isNaN(h) || isNaN(m) ? null : h + m / 60
}

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user.role !== 'Admin' && session.user.role !== 'Manager')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const monthParam = searchParams.get('month') // e.g. "2026-03"
    const rangeParam = searchParams.get('range') // e.g. "90" (days)

    const now = dayjs().tz(TIMEZONE)
    let startObj: Date
    let endObj: Date
    let totalDays: number

    if (rangeParam && !monthParam) {
        const days = parseInt(rangeParam) || 30
        const start = now.subtract(days - 1, 'day').startOf('day')
        startObj = new Date(`${start.format('YYYY-MM-DD')}T00:00:00.000Z`)
        endObj = new Date(`${now.format('YYYY-MM-DD')}T00:00:00.000Z`)
        totalDays = days
    } else {
        const month = monthParam || now.format('YYYY-MM')
        const monthStart = dayjs.tz(`${month}-01`, TIMEZONE).startOf('month')
        const monthEnd = monthStart.endOf('month')
        startObj = new Date(`${monthStart.format('YYYY-MM-DD')}T00:00:00.000Z`)
        endObj = new Date(`${Math.min(monthEnd.valueOf(), now.valueOf()) > 0 ? monthEnd.format('YYYY-MM-DD') : now.format('YYYY-MM-DD')}T00:00:00.000Z`)
        totalDays = Math.min(monthEnd.diff(monthStart, 'day') + 1, now.diff(monthStart, 'day') + 1)
    }

    // Active stores
    const activeStores = await prisma.store.findMany({
        where: { status: 'Active' },
        select: { id: true, name: true, city: true }
    })
    const allStoreIds = activeStores.map(s => s.id)

    // All reports in range
    const reports = await prisma.dailyReport.findMany({
        where: {
            store_id: { in: allStoreIds },
            report_date: { gte: startObj, lte: endObj },
            deleted_at: null
        },
        select: {
            id: true,
            store_id: true,
            report_date: true,
            cash_amount: true,
            card_amount: true,
            total_amount: true,
            status: true,
            time_in: true,
            time_out: true
        }
    })

    // Build per-store stats
    const storeStats = activeStores.map(store => {
        const storeReports = reports.filter(r => r.store_id === store.id)

        const totalRevenue = storeReports.reduce((a, r) => a + (Number(r.cash_amount || 0) + Number(r.card_amount || 0)), 0)
        const totalCash = storeReports.reduce((a, r) => a + Number(r.cash_amount || 0), 0)
        const totalCard = storeReports.reduce((a, r) => a + Number(r.card_amount || 0), 0)
        const submittedDays = storeReports.length
        const missingDays = Math.max(0, totalDays - submittedDays)
        const verifiedDays = storeReports.filter(r => r.status === 'Verified').length
        const reliabilityScore = totalDays > 0 ? Math.round((submittedDays / totalDays) * 100) : 0

        // Work hours
        let totalHours = 0
        storeReports.forEach(r => {
            const s = parseHours(r.time_in)
            const e = parseHours(r.time_out)
            if (s !== null && e !== null) {
                let d = e - s
                if (d < 0) d += 24
                totalHours += Math.max(0, d)
            }
        })
        const revenuePerHour = totalHours > 0 ? totalRevenue / totalHours : 0
        const avgDailyRevenue = submittedDays > 0 ? totalRevenue / submittedDays : 0

        return {
            store_id: store.id,
            store_name: store.name,
            store_city: store.city,
            totalRevenue: Math.round(totalRevenue * 100) / 100,
            totalCash: Math.round(totalCash * 100) / 100,
            totalCard: Math.round(totalCard * 100) / 100,
            avgDailyRevenue: Math.round(avgDailyRevenue * 100) / 100,
            submittedDays,
            missingDays,
            verifiedDays,
            reliabilityScore,
            totalHours: Math.round(totalHours * 10) / 10,
            revenuePerHour: Math.round(revenuePerHour * 100) / 100
        }
    })

    // Revenue trend: daily totals across all stores (for the sparkline)
    const dailyRevMap: Record<string, number> = {}
    reports.forEach(r => {
        const key = dayjs.utc(r.report_date).format('YYYY-MM-DD')
        dailyRevMap[key] = (dailyRevMap[key] || 0) + (Number(r.cash_amount || 0) + Number(r.card_amount || 0))
    })

    // Sort stores by revenue descending for rankings
    const ranked = [...storeStats].sort((a, b) => b.totalRevenue - a.totalRevenue)

    return NextResponse.json({
        period: {
            start: dayjs.utc(startObj).format('YYYY-MM-DD'),
            end: dayjs.utc(endObj).format('YYYY-MM-DD'),
            totalDays
        },
        storeStats: ranked,
        dailyTrend: Object.entries(dailyRevMap)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, revenue]) => ({
                date,
                label: dayjs(date).format('MMM D'),
                revenue: Math.round(revenue * 100) / 100
            }))
    })
}
