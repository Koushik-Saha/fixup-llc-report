import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import prisma from "@/lib/prisma"
import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
import timezone from "dayjs/plugin/timezone"

dayjs.extend(utc)
dayjs.extend(timezone)

const TIMEZONE = "America/Los_Angeles"

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user.role !== 'Admin' && session.user.role !== 'Manager')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const month = searchParams.get('month') || dayjs().tz(TIMEZONE).format('YYYY-MM')
    const storeId = searchParams.get('storeId') || ''

    const monthStart = dayjs.tz(`${month}-01T00:00:00`, TIMEZONE)
    const monthEnd = monthStart.endOf('month')
    const startObj = new Date(`${monthStart.format('YYYY-MM-DD')}T00:00:00.000Z`)
    const endObj = new Date(`${monthEnd.format('YYYY-MM-DD')}T00:00:00.000Z`)

    const where: any = {
        report_date: { gte: startObj, lte: endObj },
        status: { not: 'Missing' },
        store: { company_id: session.user.companyId }
    }
    if (storeId) where.store_id = storeId

    const reports = await prisma.dailyReport.findMany({
        where,
        select: {
            id: true,
            store_id: true,
            report_date: true,
            cash_amount: true,
            card_amount: true,
            total_amount: true,
            expected_cash: true,
            status: true,
            store: { select: { name: true, city: true } }
        },
        orderBy: { report_date: 'desc' }
    })

    // Compute variance for each report
    const reportData = reports.map(r => {
        const actual = Number(r.cash_amount)
        const expected = r.expected_cash !== null ? Number(r.expected_cash) : null
        const variance = expected !== null ? actual - expected : null
        return {
            id: r.id,
            date: dayjs.utc(r.report_date).format('YYYY-MM-DD'),
            store_id: r.store_id,
            store_name: r.store.name,
            store_city: r.store.city,
            cash_amount: actual,
            card_amount: Number(r.card_amount),
            total_amount: Number(r.total_amount),
            expected_cash: expected,
            variance,
            status: r.status
        }
    })

    // Group by store for summary
    const storeMap: Record<string, { name: string; city: string; reports: number; totalVariance: number; flagged: number }> = {}
    reportData.forEach(r => {
        if (!storeMap[r.store_id]) {
            storeMap[r.store_id] = { name: r.store_name, city: r.store_city, reports: 0, totalVariance: 0, flagged: 0 }
        }
        storeMap[r.store_id].reports++
        if (r.variance !== null) {
            storeMap[r.store_id].totalVariance += r.variance
            if (Math.abs(r.variance) > 50) storeMap[r.store_id].flagged++
        }
    })

    const storeSummary = Object.entries(storeMap).map(([id, s]) => ({ store_id: id, ...s }))
        .sort((a, b) => Math.abs(b.totalVariance) - Math.abs(a.totalVariance))

    // Overall stats
    const withVariance = reportData.filter(r => r.variance !== null)
    const totalOverage = withVariance.filter(r => (r.variance ?? 0) > 0).reduce((a, r) => a + (r.variance ?? 0), 0)
    const totalShortage = withVariance.filter(r => (r.variance ?? 0) < 0).reduce((a, r) => a + (r.variance ?? 0), 0)
    const flagged = withVariance.filter(r => Math.abs(r.variance ?? 0) > 50).length

    return NextResponse.json({
        month,
        reports: reportData,
        storeSummary,
        stats: { totalOverage, totalShortage, netVariance: totalOverage + totalShortage, flagged, total: reports.length }
    })
}
