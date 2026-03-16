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

function parseHours(timeStr: string | null | undefined): number | null {
    if (!timeStr) return null
    if (timeStr.toLowerCase().includes('am') || timeStr.toLowerCase().includes('pm')) {
        const [time, period] = timeStr.split(' ')
        let [hours, minutes] = time.split(':').map(Number)
        if (period.toLowerCase() === 'pm' && hours !== 12) hours += 12
        if (period.toLowerCase() === 'am' && hours === 12) hours = 0
        if (isNaN(hours) || isNaN(minutes)) return null
        return hours + (minutes / 60)
    } else {
        const [hours, minutes] = timeStr.split(':').map(Number)
        if (isNaN(hours) || isNaN(minutes)) return null
        return hours + (minutes / 60)
    }
}

function calculateDuration(timeIn: string | null | undefined, timeOut: string | null | undefined): number {
    const start = parseHours(timeIn)
    const end = parseHours(timeOut)
    if (start === null || end === null) return 0
    let duration = end - start
    if (duration < 0) duration += 24
    return Math.max(0, duration)
}

export async function GET(req: Request, { params }: { params: Promise<{ userId: string }> }) {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user.role !== 'Admin' && session.user.role !== 'Manager')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId } = await params
    const { searchParams } = new URL(req.url)
    const startDateStr = searchParams.get('startDate')
    const endDateStr = searchParams.get('endDate')

    if (!startDateStr || !endDateStr) {
        return NextResponse.json({ error: 'Start and End dates are required' }, { status: 400 })
    }

    // Fetch the user's profile info
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, role: true, pay_type: true, base_salary: true, createdAt: true }
    })

    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Fetch reports where this user is an assignee in the date range
    const startDate = dayjs.tz(`${startDateStr}T00:00:00`, TIMEZONE).toDate()
    const endDate = dayjs.tz(`${endDateStr}T23:59:59`, TIMEZONE).toDate()

    const reports = await prisma.dailyReport.findMany({
        where: {
            report_date: { gte: startDate, lte: endDate },
            status: { in: ['Submitted', 'Verified'] },
            assignees: { some: { id: userId } }
        },
        include: {
            store: { select: { id: true, name: true, city: true } },
            submitted_by: { select: { name: true } }
        },
        orderBy: { report_date: 'desc' }
    }) as any[]

    // Build shift details
    let totalHours = 0
    const shifts = reports.map((r: any) => {
        const duration = calculateDuration(r.time_in, r.time_out)
        totalHours += duration
        return {
            id: r.id,
            date: r.report_date.toISOString().split('T')[0],
            store_name: r.store.name,
            store_city: r.store.city,
            time_in: r.time_in,
            time_out: r.time_out,
            duration,
            status: r.status,
            cash_amount: r.cash_amount,
            card_amount: r.card_amount,
            total_amount: r.total_amount,
            submitted_by: r.submitted_by?.name || null
        }
    })

    const totalEarned = user.pay_type === 'HOURLY'
        ? totalHours * Number(user.base_salary)
        : Number(user.base_salary)

    // Group by store
    const byStore: Record<string, { store: string; city: string; shifts: number; hours: number }> = {}
    shifts.forEach((s: any) => {
        if (!byStore[s.store_name]) byStore[s.store_name] = { store: s.store_name, city: s.store_city, shifts: 0, hours: 0 }
        byStore[s.store_name].shifts++
        byStore[s.store_name].hours += s.duration
    })

    return NextResponse.json({
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            pay_type: user.pay_type,
            base_salary: Number(user.base_salary)
        },
        period: { startDate: startDateStr, endDate: endDateStr },
        summary: {
            total_shifts: shifts.length,
            total_hours: totalHours,
            total_earned: totalEarned
        },
        shifts,
        by_store: Object.values(byStore).sort((a, b) => b.hours - a.hours)
    })
}
