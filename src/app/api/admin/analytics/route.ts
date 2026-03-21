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

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (session?.user?.role !== 'Admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const range = searchParams.get('range') || '1m' // 1d, 3d, 1w, 15d, 1m, 3m, 6m, 1y, 2y, custom
    const customStart = searchParams.get('startDate')
    const customEnd = searchParams.get('endDate')

    let start: dayjs.Dayjs
    let end: dayjs.Dayjs

    if (range === 'custom' && customStart && customEnd) {
        start = dayjs.tz(`${customStart}T00:00:00`, TIMEZONE)
        end = dayjs.tz(`${customEnd}T23:59:59`, TIMEZONE)
    } else {
        end = dayjs().tz(TIMEZONE)
        start = end.clone()
        if (range === '1d') start = start.subtract(1, 'day')
        else if (range === '3d') start = start.subtract(3, 'day')
        else if (range === '1w') start = start.subtract(7, 'day')
        else if (range === '15d') start = start.subtract(15, 'day')
        else if (range === '1m') start = start.subtract(1, 'month')
        else if (range === '3m') start = start.subtract(3, 'month')
        else if (range === '6m') start = start.subtract(6, 'month')
        else if (range === '1y') start = start.subtract(1, 'year')
        else if (range === '2y') start = start.subtract(2, 'year')
    }

    const startDate = start.toDate()
    const endDate = end.toDate()

    const reports = await prisma.dailyReport.findMany({
        where: {
            report_date: {
                gte: startDate,
                lte: endDate
            },
            store: { company_id: session.user.companyId }
        },
        select: {
            report_date: true,
            cash_amount: true,
            card_amount: true,
            total_amount: true,
            expenses_amount: true,
            payouts_amount: true,
            store: { select: { name: true } }
        },
        orderBy: { report_date: 'asc' }
    })

    // Group by date to flatten all store reports for global trend
    const groupedData: Record<string, any> = {}
    
    // Group by store for Top Performing Stores chart
    const storeAggregations: Record<string, number> = {}

    const storeExpensesQuery = await prisma.storeExpense.findMany({
        where: { 
            expense_date: { gte: startDate, lte: endDate },
            store: { company_id: session.user.companyId }
        },
        select: { amount: true }
    })

    const payrollPaymentsQuery = await prisma.payrollPayment.findMany({
        where: { 
            payment_date: { gte: startDate, lte: endDate },
            record: { user: { company_id: session.user.companyId } }
        },
        select: { amount: true }
    })

    let totalPettyCashExpenses = 0
    let totalSales = 0

    reports.forEach((r: any) => {
        const dateStr = new Date(r.report_date).toISOString().split('T')[0]
        
        const pettyCashForReport = Number(r.expenses_amount) + Number(r.payouts_amount)

        if (!groupedData[dateStr]) {
            groupedData[dateStr] = {
                date: dateStr,
                cash: 0,
                card: 0,
                total: 0,
                pettyCash: 0
            }
        }
        groupedData[dateStr].cash += Number(r.cash_amount)
        groupedData[dateStr].card += Number(r.card_amount)
        groupedData[dateStr].total += Number(r.total_amount)
        groupedData[dateStr].pettyCash += pettyCashForReport

        if (r.store?.name) {
            if (!storeAggregations[r.store.name]) {
                storeAggregations[r.store.name] = 0
            }
            storeAggregations[r.store.name] += Number(r.total_amount)
        }

        totalSales += Number(r.total_amount)
        totalPettyCashExpenses += pettyCashForReport
    })

    const totalStoreExpenses = storeExpensesQuery.reduce((sum: number, exp: any) => sum + Number(exp.amount), 0)
    const totalPayroll = payrollPaymentsQuery.reduce((sum: number, pay: any) => sum + Number(pay.amount), 0)

    const grossProfit = totalSales - totalPettyCashExpenses - totalStoreExpenses
    const netProfit = grossProfit - totalPayroll
    
    const storeDataArray = Object.keys(storeAggregations)
        .map(name => ({ name, revenue: storeAggregations[name] }))
        .sort((a, b) => b.revenue - a.revenue) // Sort highest revenue first

    const costBreakdownArray = [
        { name: 'Petty Cash', value: totalPettyCashExpenses },
        { name: 'Store Expenses', value: totalStoreExpenses },
        { name: 'Payroll', value: totalPayroll }
    ].filter(item => item.value > 0)

    const funnelDataArray = [
        { name: 'Gross Sales', value: totalSales },
        { name: 'Petty Cash', value: -totalPettyCashExpenses },
        { name: 'Store Exp', value: -totalStoreExpenses },
        { name: 'Gross Profit', value: grossProfit },
        { name: 'Payroll', value: -totalPayroll },
        { name: 'Net Profit', value: netProfit }
    ]

    return NextResponse.json({
        chartData: Object.values(groupedData),
        storeData: storeDataArray,
        costBreakdown: costBreakdownArray,
        funnelData: funnelDataArray,
        summary: {
            totalSales,
            totalPettyCashExpenses,
            totalStoreExpenses,
            totalPayroll,
            grossProfit,
            netProfit
        }
    })
}
