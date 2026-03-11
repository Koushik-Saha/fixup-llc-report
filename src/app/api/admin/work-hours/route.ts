import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export const dynamic = 'force-dynamic'

function parseHours(timeStr: string | null | undefined): number | null {
    if (!timeStr) return null;

    // Check if it has AM/PM format vs 24-hour HH:mm
    if (timeStr.toLowerCase().includes('am') || timeStr.toLowerCase().includes('pm')) {
        const [time, period] = timeStr.split(' ');
        let [hours, minutes] = time.split(':').map(Number);

        if (period.toLowerCase() === 'pm' && hours !== 12) hours += 12;
        if (period.toLowerCase() === 'am' && hours === 12) hours = 0;

        if (isNaN(hours) || isNaN(minutes)) return null;
        return hours + (minutes / 60);
    } else {
        // Standard 24h HH:mm format
        const [hours, minutes] = timeStr.split(':').map(Number);
        if (isNaN(hours) || isNaN(minutes)) return null;
        return hours + (minutes / 60);
    }
}

function calculateDuration(timeIn: string | null | undefined, timeOut: string | null | undefined): number {
    const start = parseHours(timeIn);
    const end = parseHours(timeOut);
    if (start === null || end === null) return 0;

    let duration = end - start;
    // Handle overnight shifts (e.g. 22:00 to 06:00)
    if (duration < 0) duration += 24;
    return Math.max(0, duration);
}

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user.role !== 'Admin' && session.user.role !== 'Manager')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const startDateStr = searchParams.get('startDate')
    const endDateStr = searchParams.get('endDate')

    if (!startDateStr || !endDateStr) {
        return NextResponse.json({ error: 'Start and End dates are required' }, { status: 400 })
    }

    let allowedStoreIds: string[] | null = null
    if (session.user.role === 'Manager') {
        const memberships = await prisma.storeMember.findMany({
            where: { user_id: session.user.id, status: 'Active' },
            select: { store_id: true }
        })
        allowedStoreIds = memberships.map(m => m.store_id)
        if (allowedStoreIds.length === 0) {
            return NextResponse.json([])
        }
    }

    const endBuffer = new Date(`${endDateStr}T23:59:59.999Z`);
    endBuffer.setHours(endBuffer.getHours() + 24); // Add 24h buffer for UTC-forward dates

    const where: any = {
        report_date: {
            gte: new Date(`${startDateStr}T00:00:00.000Z`),
            lte: endBuffer
        },
        status: { in: ['Submitted', 'Verified'] } // Count valid reports
    }

    if (allowedStoreIds) {
        where.store_id = { in: allowedStoreIds }
    }

    const reports = await prisma.dailyReport.findMany({
        where,
        include: {
            assignees: { select: { id: true, name: true, role: true, pay_type: true, base_salary: true } },
            store: { select: { name: true } }
        }
    }) as any[]

    // Aggregate by user
    const userAggregates = new Map<string, any>()

    for (const report of reports) {
        if (!report.assignees || !Array.isArray(report.assignees)) continue;

        const duration = calculateDuration(report.time_in, report.time_out)

        for (const user of report.assignees) {
            if (!userAggregates.has(user.id)) {
                userAggregates.set(user.id, {
                    user_id: user.id,
                    name: user.name,
                    role: user.role,
                    pay_type: user.pay_type,
                    base_salary: Number(user.base_salary),
                    shifts_count: 0,
                    total_hours: 0,
                    report_details: [] // Optional debug trail
                })
            }

            const agg = userAggregates.get(user.id)

            agg.shifts_count += 1
            agg.total_hours += duration

            agg.report_details.push({
                date: report.report_date.toISOString().split('T')[0],
                store: report.store.name,
                time_in: report.time_in,
                time_out: report.time_out,
                duration: duration
            })
        }
    }

    const result = Array.from(userAggregates.values()).map(u => ({
        ...u,
        total_earned: u.pay_type === 'HOURLY' ? u.total_hours * u.base_salary : u.base_salary
    })).sort((a, b) => b.total_hours - a.total_hours)

    return NextResponse.json(result)
}
