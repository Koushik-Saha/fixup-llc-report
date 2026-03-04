import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (session?.user?.role !== 'Admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const range = searchParams.get('range') || '1m' // 1m, 3m, 6m, 1y

    const end = new Date()
    const start = new Date()

    if (range === '1m') start.setMonth(start.getMonth() - 1)
    else if (range === '3m') start.setMonth(start.getMonth() - 3)
    else if (range === '6m') start.setMonth(start.getMonth() - 6)
    else if (range === '1y') start.setFullYear(start.getFullYear() - 1)
    else if (range === '2y') start.setFullYear(start.getFullYear() - 2)

    const reports = await prisma.dailyReport.findMany({
        where: {
            report_date: {
                gte: start,
                lte: end
            }
        },
        select: {
            report_date: true,
            cash_amount: true,
            card_amount: true,
            total_amount: true
        },
        orderBy: { report_date: 'asc' }
    })

    // Group by date to flatten all store reports for global trend
    const groupedData: Record<string, any> = {}

    reports.forEach((r: any) => {
        const dateStr = new Date(r.report_date).toISOString().split('T')[0]
        if (!groupedData[dateStr]) {
            groupedData[dateStr] = {
                date: dateStr,
                cash: 0,
                card: 0,
                total: 0
            }
        }
        groupedData[dateStr].cash += Number(r.cash_amount)
        groupedData[dateStr].card += Number(r.card_amount)
        groupedData[dateStr].total += Number(r.total_amount)
    })

    return NextResponse.json(Object.values(groupedData))
}
