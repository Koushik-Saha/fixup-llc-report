import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user.role !== 'Admin' && session.user.role !== 'Manager')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const startDateParam = searchParams.get('startDate') // e.g. 2026-01-01
    const endDateParam = searchParams.get('endDate')     // e.g. 2026-12-31
    const storeId = searchParams.get('storeId')

    const dateFilter: any = {}
    if (startDateParam) dateFilter.gte = new Date(`${startDateParam}T00:00:00`)
    if (endDateParam) dateFilter.lte = new Date(`${endDateParam}T23:59:59`)

    const reportFilter: any = { store: { company_id: session.user.companyId } }
    if (Object.keys(dateFilter).length > 0) reportFilter.report_date = dateFilter
    if (storeId) reportFilter.store_id = storeId

    // If manager, enforce store boundary
    if (session.user.role === 'Manager') {
        const memberships = await prisma.storeMember.findMany({
            where: { user_id: session.user.id, status: 'Active' },
            select: { store_id: true }
        })
        const allowedStores = memberships.map(m => m.store_id)
        
        if (storeId && !allowedStores.includes(storeId)) {
            return NextResponse.json({ error: 'Unauthorized for this store' }, { status: 403 })
        }
        
        if (!storeId) {
            reportFilter.store_id = { in: allowedStores }
        }
    }

    try {
        // Fetch all relevant reports and include their sale_items
        const reports = await prisma.dailyReport.findMany({
            where: reportFilter,
            include: {
                sale_items: true
            }
        })

        let totalGross = 0
        let totalItemizedRevenue = 0
        const categoryMap: Record<string, number> = {}
        const quantityMap: Record<string, number> = {}
        
        // Detailed Item Tracking Map (Description)
        const itemMap: Record<string, { category: string, revenue: number, quantity: number }> = {}

        reports.forEach(report => {
            totalGross += Number(report.total_amount)

            report.sale_items.forEach(item => {
                const itemRevenue = Number(item.unit_price) * item.quantity
                totalItemizedRevenue += itemRevenue

                // By Category
                if (!categoryMap[item.category]) categoryMap[item.category] = 0
                categoryMap[item.category] += itemRevenue

                if (!quantityMap[item.category]) quantityMap[item.category] = 0
                quantityMap[item.category] += item.quantity

                // By Description (Rank Top Sellers)
                const descMapKey = item.description.trim() || 'Unknown Item'
                if (!itemMap[descMapKey]) {
                    itemMap[descMapKey] = { category: item.category, revenue: 0, quantity: 0 }
                }
                itemMap[descMapKey].revenue += itemRevenue
                itemMap[descMapKey].quantity += item.quantity
            })
        })

        // Format for charts
        const categoryData = Object.keys(categoryMap).map(cat => ({
            category: cat,
            revenue: categoryMap[cat],
            quantity: quantityMap[cat]
        })).sort((a, b) => b.revenue - a.revenue)

        const topSellers = Object.keys(itemMap).map(desc => ({
            description: desc,
            ...itemMap[desc]
        })).sort((a, b) => b.revenue - a.revenue)

        return NextResponse.json({
            dateRange: { start: startDateParam, end: endDateParam },
            metrics: {
                totalGross,
                totalItemizedRevenue,
                unitemizedRevenue: totalGross - totalItemizedRevenue
            },
            categoryBreakdown: categoryData,
            topSellers: topSellers.slice(0, 50) // Return top 50 items
        })
    } catch (error) {
        console.error('Sales analytics error:', error)
        return NextResponse.json({ error: 'Failed to generate metrics' }, { status: 500 })
    }
}
