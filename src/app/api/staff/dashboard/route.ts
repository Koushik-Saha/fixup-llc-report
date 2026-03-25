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

function parseHours(t: string | null | undefined): number | null {
    if (!t) return null
    if (t.toLowerCase().includes('am') || t.toLowerCase().includes('pm')) {
        const [time, period] = t.split(' ')
        let [h, m] = time.split(':').map(Number)
        if (period.toLowerCase() === 'pm' && h !== 12) h += 12
        if (period.toLowerCase() === 'am' && h === 12) h = 0
        return isNaN(h) || isNaN(m) ? null : h + m / 60
    }
    const [h, m] = t.split(':').map(Number)
    return isNaN(h) || isNaN(m) ? null : h + m / 60
}

export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'Staff') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id as string
    const storeId = session.user.storeId

    if (!storeId) {
        return NextResponse.json({ error: 'No active store assigned' }, { status: 400 })
    }

    const nowTz = dayjs().tz(TIMEZONE)
    const todayStr = nowTz.format('YYYY-MM-DD')
    const todayObj = new Date(`${todayStr}T00:00:00.000Z`)

    const SYSTEM_EPOCH = dayjs.tz('2026-03-01T00:00:00', TIMEZONE)
    const monthStart = nowTz.startOf('month')
    const effectiveStart = monthStart.isBefore(SYSTEM_EPOCH) ? SYSTEM_EPOCH : monthStart

    const startObj = new Date(`${effectiveStart.format('YYYY-MM-DD')}T00:00:00.000Z`)
    const endObj = new Date(`${todayStr}T00:00:00.000Z`)

    // Today's report
    const todayReport = await prisma.dailyReport.findFirst({
        where: { store_id: storeId, report_date: todayObj },
        select: { id: true, status: true, cash_amount: true, card_amount: true, total_amount: true }
    })

    // All month reports for this store (for matching stats with monthly report)
    const monthReports = await prisma.dailyReport.findMany({
        where: {
            store_id: storeId,
            report_date: { gte: startObj, lte: endObj }
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
            time_in: true,
            time_out: true,
            submitted_by_user_id: true,
            assignees: {
                select: { id: true }
            }
        },
        orderBy: { report_date: 'desc' }
    })

    // Compute work hours strictly for reports where the user is an assignee or submitter
    let totalHours = 0
    monthReports.forEach(r => {
        const isUserAssigned = r.submitted_by_user_id === userId || r.assignees.some(a => a.id === userId)
        if (isUserAssigned) {
            const s = parseHours(r.time_in)
            const e = parseHours(r.time_out)
            if (s !== null && e !== null) {
                let d = e - s
                if (d < 0) d += 24
                totalHours += Math.max(0, d)
            }
        }
    })

    // Missing days count
    const daysInRange: string[] = []
    for (let d = effectiveStart; d.isBefore(nowTz) || d.isSame(nowTz, 'day'); d = d.add(1, 'day')) {
        daysInRange.push(d.format('YYYY-MM-DD'))
    }
    const reportedDates = new Set(monthReports.map(r => r.report_date.toISOString().split('T')[0]))
    const missingDays = daysInRange.filter(d => !reportedDates.has(d)).length

    // Payroll
    const currentMonth = nowTz.format('YYYY-MM')
    const payrollRecord = await (prisma as any).payrollRecord.findUnique({
        where: { user_id_month_year: { user_id: userId, month_year: currentMonth } },
        select: { total_paid: true }
    }).catch(() => null)

    const totalPaid = Number(payrollRecord?.total_paid || 0)

    // Streak: consecutive days submitted ending today
    let streak = 0
    for (let i = 0; i < daysInRange.length; i++) {
        const d = daysInRange[daysInRange.length - 1 - i]
        if (reportedDates.has(d)) streak++
        else break
    }

    return NextResponse.json({
        today: {
            dateLabel: nowTz.format('dddd, MMMM D'),
            report: todayReport
        },
        month: {
            label: nowTz.format('MMMM YYYY'),
            submittedCount: monthReports.length,
            missingDays,
            totalDays: daysInRange.length,
            totalHours: Math.round(totalHours * 10) / 10,
                    totalCash: monthReports.reduce((a, r) => a + Number(r.cash_amount || 0) - Number(r.expenses_amount || 0) - Number(r.payouts_amount || 0), 0),
            totalCard: monthReports.reduce((a, r) => a + Number(r.card_amount || 0), 0),
            totalRevenue: monthReports.reduce((a, r) => a + Number(r.total_amount || 0), 0),
            totalExpenses: monthReports.reduce((a, r) => a + Number(r.expenses_amount || 0), 0),
            totalPaid,
            verifiedCount: monthReports.filter(r => r.status === 'Verified').length
        },
        streak,
        recentReports: monthReports.slice(0, 5)
    })
}
