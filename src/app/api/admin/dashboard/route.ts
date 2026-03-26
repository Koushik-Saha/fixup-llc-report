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

export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user.role !== 'Admin' && session.user.role !== 'Manager')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = dayjs().tz(TIMEZONE)
    const todayStr = now.format('YYYY-MM-DD')
    const todayObj = new Date(`${todayStr}T00:00:00.000Z`)

    // This week: Mon → today
    const weekStart = now.startOf('week').add(1, 'day')
    const weekStartObj = new Date(`${weekStart.format('YYYY-MM-DD')}T00:00:00.000Z`)

    // This month
    const monthStart = now.startOf('month')
    const monthStartObj = new Date(`${monthStart.format('YYYY-MM-DD')}T00:00:00.000Z`)

    // Last 30 days for trend
    const last30Start = now.subtract(29, 'day').startOf('day')
    const last30StartObj = new Date(`${last30Start.format('YYYY-MM-DD')}T00:00:00.000Z`)

    // ── Active stores & users ──────────────────────────────────────────────────
    const [activeStores, totalUsers, totalStores] = await Promise.all([
        prisma.store.findMany({
            where: { company_id: session.user.companyId, status: 'Active' },
            select: { id: true, name: true, city: true }
        }),
        prisma.user.count({ where: { company_id: session.user.companyId, status: 'Active' } }),
        prisma.store.count({ where: { company_id: session.user.companyId, status: 'Active' } })
    ])

    const allStoreIds = activeStores.map(s => s.id)

    // ── Admin expenses (StoreExpense table) ──────────────────────────────────
    const [todayAdminExpenses, monthAdminExpenses] = await Promise.all([
        prisma.storeExpense.findMany({
            where: {
                expense_date: todayObj,
                store_id: { in: allStoreIds },
                approval_status: 'Approved'
            },
            select: { amount: true, payment_method: true }
        }),
        prisma.storeExpense.findMany({
            where: {
                expense_date: { gte: monthStartObj, lte: todayObj },
                store_id: { in: allStoreIds },
                approval_status: 'Approved'
            },
            select: { amount: true, payment_method: true }
        })
    ])

    const todayAdminCashExp = todayAdminExpenses.filter(e => e.payment_method === 'Cash').reduce((a, e) => a + Number(e.amount), 0)
    const monthAdminCashExp = monthAdminExpenses.filter(e => e.payment_method === 'Cash').reduce((a, e) => a + Number(e.amount), 0)
    const monthTotalAdminExp = monthAdminExpenses.reduce((a, e) => a + Number(e.amount), 0)

    // ── Today's reports ────────────────────────────────────────────────────────
    const todaysReports = await prisma.dailyReport.findMany({
        where: { report_date: todayObj, store_id: { in: allStoreIds }, deleted_at: null },
        select: {
            id: true,
            store_id: true,
            cash_amount: true,
            card_amount: true,
            expenses_amount: true,
            payouts_amount: true,
            total_amount: true,
            status: true,
            submitted_by: { select: { name: true } }
        }
    })
    
    // Today's Net Cash = Today's Report Cash - Report Expenses - Report Payouts - Today's Admin Cash Expenses
    const todayStaffExp = todaysReports.reduce((a, r) => a + Number(r.expenses_amount || 0) + Number(r.payouts_amount || 0), 0)
    const todayGrossCash = todaysReports.reduce((a, r) => a + Number(r.cash_amount), 0)
    const todayCash = todayGrossCash - todayStaffExp - todayAdminCashExp
    const todayCard = todaysReports.reduce((a, r) => a + Number(r.card_amount), 0)
    const todayTotal = todayCash + todayCard
    const reportedStoreIds = new Set(todaysReports.map(r => r.store_id))
    const missingToday = allStoreIds.filter(id => !reportedStoreIds.has(id)).length
    
    // Build per-store today status list
    const reportByStoreId = new Map(todaysReports.map(r => [r.store_id, r]))
    const todayStatus = activeStores.map(store => {
        const report = reportByStoreId.get(store.id)
        if (report) {
            return {
                store_id: store.id,
                store_name: store.name,
                store_city: store.city,
                submitted: true,
                report_id: report.id,
                submitted_by: report.submitted_by?.name || 'Unknown',
                total_amount: Number(report.total_amount),
                status: report.status
            }
        }
        return {
            store_id: store.id,
            store_name: store.name,
            store_city: store.city,
            submitted: false,
            report_id: null,
            submitted_by: null,
            total_amount: null,
            status: 'Missing'
        }
    }).sort((a, b) => {
        if (!a.submitted && b.submitted) return -1
        if (a.submitted && !b.submitted) return 1
        return a.store_name.localeCompare(b.store_name)
    })

    // ── This week revenue ──────────────────────────────────────────────────────
    const weekReports = await prisma.dailyReport.aggregate({
        where: { report_date: { gte: weekStartObj, lte: todayObj }, store_id: { in: allStoreIds }, deleted_at: null },
        _sum: { total_amount: true }
    })
    const weekRevenue = Number(weekReports._sum.total_amount || 0)

    // ── This month revenue ─────────────────────────────────────────────────────
    const monthReportsData = await prisma.dailyReport.findMany({
        where: { report_date: { gte: monthStartObj, lte: todayObj }, store_id: { in: allStoreIds }, deleted_at: null },
        select: { total_amount: true, cash_amount: true, card_amount: true, expenses_amount: true, payouts_amount: true }
    })
    
    const monthRevenue = monthReportsData.reduce((a, r) => a + Number(r.total_amount || 0), 0)
    const monthGrossCash = monthReportsData.reduce((a, r) => a + Number(r.cash_amount || 0), 0)
    const monthStaffExp = monthReportsData.reduce((a, r) => a + Number(r.expenses_amount || 0) + Number(r.payouts_amount || 0), 0)
    // Month Net Cash = Gross Cash - Staff Expenses/Payouts - Cash-based Admin Expenses
    const monthCash = monthGrossCash - monthStaffExp - monthAdminCashExp
    const monthCard = monthReportsData.reduce((a, r) => a + Number(r.card_amount || 0), 0)
    const monthExpenses = monthStaffExp + monthTotalAdminExp

    // ── Unverified report count ────────────────────────────────────────────────
    const unverifiedCount = await prisma.dailyReport.count({
        where: { status: 'Submitted', store_id: { in: allStoreIds }, deleted_at: null }
    })

    // ── Last 30 days revenue trend ─────────────────────────────────────────────
    const last30Reports = await prisma.dailyReport.findMany({
        where: {
            report_date: { gte: last30StartObj, lte: todayObj },
            store_id: { in: allStoreIds },
            deleted_at: null
        },
        select: { report_date: true, total_amount: true }
    })

    // Build day-by-day map
    const dailyMap: Record<string, number> = {}
    for (let i = 0; i <= 29; i++) {
        const d = last30Start.add(i, 'day').format('YYYY-MM-DD')
        dailyMap[d] = 0
    }
    last30Reports.forEach(r => {
        const key = dayjs.utc(r.report_date).format('YYYY-MM-DD')
        dailyMap[key] = (dailyMap[key] || 0) + Number(r.total_amount)
    })
    const revenueTrend = Object.entries(dailyMap).map(([date, revenue]) => ({
        date,
        label: dayjs(date).format('MMM D'),
        revenue: Math.round(revenue * 100) / 100
    }))

    // ── Store performance (this month) ─────────────────────────────────────────
    const storeMonthReports = await prisma.dailyReport.groupBy({
        by: ['store_id'],
        where: { report_date: { gte: monthStartObj, lte: todayObj }, store_id: { in: allStoreIds }, deleted_at: null },
        _sum: { total_amount: true, cash_amount: true, card_amount: true },
        _count: { id: true }
    })

    const storeMap = new Map(activeStores.map(s => [s.id, s]))
    const storePerformance = storeMonthReports
        .map(r => ({
            store_id: r.store_id,
            name: storeMap.get(r.store_id)?.name || 'Unknown',
            city: storeMap.get(r.store_id)?.city || '',
            revenue: Math.round(Number(r._sum.total_amount || 0) * 100) / 100,
            cash: Math.round(Number(r._sum.cash_amount || 0) * 100) / 100,
            card: Math.round(Number(r._sum.card_amount || 0) * 100) / 100,
            reports: r._count.id
        }))
        .sort((a, b) => b.revenue - a.revenue)

    // ── Missing report calendar (last 14 days) ─────────────────────────────────
    const cal14Start = now.subtract(13, 'day').startOf('day')
    const cal14Obj = new Date(`${cal14Start.format('YYYY-MM-DD')}T00:00:00.000Z`)
    const cal14Reports = await prisma.dailyReport.findMany({
        where: { report_date: { gte: cal14Obj, lte: todayObj }, store_id: { in: allStoreIds }, deleted_at: null },
        select: { store_id: true, report_date: true }
    })
    const cal14Set = new Set(cal14Reports.map(r => `${r.store_id}_${dayjs.utc(r.report_date).format('YYYY-MM-DD')}`))
    const calendarDays = []
    for (let i = 13; i >= 0; i--) {
        const d = now.subtract(i, 'day')
        const dateStr = d.format('YYYY-MM-DD')
        const submitted = allStoreIds.filter(id => cal14Set.has(`${id}_${dateStr}`)).length
        calendarDays.push({
            date: dateStr,
            label: d.format('MMM D'),
            dayName: d.format('ddd'),
            submitted,
            total: allStoreIds.length,
            missing: allStoreIds.length - submitted
        })
    }

    // ── Top submitters (this month, by report count) ───────────────────────────
    const topSubmitters = await prisma.dailyReport.groupBy({
        by: ['submitted_by_user_id'],
        where: { report_date: { gte: monthStartObj, lte: todayObj }, store_id: { in: allStoreIds }, deleted_at: null },
        _count: { id: true },
        _sum: { total_amount: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5
    })
    const submitterIds = topSubmitters.map(s => s.submitted_by_user_id)
    const submitterUsers = await prisma.user.findMany({
        where: { id: { in: submitterIds } },
        select: { id: true, name: true, role: true }
    })
    const submitterMap = new Map(submitterUsers.map(u => [u.id, u]))
    const topPerformers = topSubmitters.map(s => ({
        user_id: s.submitted_by_user_id,
        name: submitterMap.get(s.submitted_by_user_id)?.name || 'Unknown',
        role: submitterMap.get(s.submitted_by_user_id)?.role || '',
        reports: s._count.id,
        revenue: Math.round(Number(s._sum.total_amount || 0) * 100) / 100
    }))

    // ── Low Stock Inventory ────────────────────────────────────────────────────
    const inventory = await prisma.inventoryItem.findMany({
        where: { store_id: { in: allStoreIds } },
        select: { id: true, name: true, sku: true, quantity: true, reorder_level: true, store: { select: { name: true } } }
    })
    const lowStockItems = inventory.filter(i => i.quantity <= i.reorder_level)

    return NextResponse.json({
        kpi: {
            todayCash,
            todayCard,
            todayTotal,
            todayExpenses: todayStaffExp + todayAdminCashExp,
            weekRevenue,
            monthRevenue,
            monthCash,
            monthCard,
            monthExpenses,
            totalStores,
            totalUsers,
            missingToday,
            unverifiedCount
        },
        revenueTrend,
        storePerformance,
        calendarDays,
        topPerformers,
        todayStatus,
        lowStockItems
    })
}
