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
    const storeId = searchParams.get('storeId')
    const userId = searchParams.get('userId')
    const startDateStr = searchParams.get('startDate')
    const endDateStr = searchParams.get('endDate')
    const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 20
    const page = searchParams.get('page') ? Number(searchParams.get('page')) : 1
    const skip = (page - 1) * limit
    const search = searchParams.get('search')

    let allowedStoreIds: string[] | null = null
    if (session.user.role === 'Manager') {
        const memberships = await prisma.storeMember.findMany({
            where: { user_id: session.user.id, status: 'Active' },
            select: { store_id: true }
        })
        allowedStoreIds = memberships.map(m => m.store_id)
        if (allowedStoreIds.length === 0) {
            return NextResponse.json({ data: [], pagination: { total: 0, page: 1, totalPages: 0 } })
        }
    }

    // Build the where clause for the SystemLog query
    const where: any = {}

    // Filtering by user who made the action
    if (userId) {
        where.user_id = userId
    }

    // Filtering by timestamp of the action
    if (startDateStr || endDateStr) {
        where.createdAt = {}
        if (startDateStr) where.createdAt.gte = new Date(startDateStr)
        if (endDateStr) {
            // Include the whole end day
            const end = new Date(endDateStr)
            end.setHours(23, 59, 59, 999)
            where.createdAt.lte = end
        }
    }

    // Filtering by store requires polymorphic mapping
    let targetStoreIds = allowedStoreIds
    if (storeId) {
        if (allowedStoreIds && !allowedStoreIds.includes(storeId)) {
            return NextResponse.json({ data: [], pagination: { total: 0, page: 1, totalPages: 0 } })
        }
        targetStoreIds = [storeId]
    }

    if (targetStoreIds) {
        const storeReports = await prisma.dailyReport.findMany({ where: { store_id: { in: targetStoreIds } }, select: { id: true } })
        const storeMembers = await prisma.storeMember.findMany({ where: { store_id: { in: targetStoreIds } }, select: { id: true } })

        where.OR = [
            { entity: 'Store', entity_id: { in: targetStoreIds } },
            { entity: 'DailyReport', entity_id: { in: storeReports.map((r: { id: string }) => r.id) } },
            { entity: 'StoreMember', entity_id: { in: storeMembers.map((m: { id: string }) => m.id) } }
        ]
    }

    if (search) {
        const searchWhere: any = {
            OR: [
                { user: { name: { contains: search, mode: 'insensitive' } } },
                { details: { contains: search, mode: 'insensitive' } },
                { action: { contains: search, mode: 'insensitive' } },
                { entity: { contains: search, mode: 'insensitive' } }
            ]
        }

        if (where.OR) {
            where.AND = [
                { OR: where.OR },
                searchWhere
            ]
            delete where.OR
        } else {
            where.OR = searchWhere.OR
        }
    }

    try {
        const [logs, total] = await Promise.all([
            prisma.systemLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                include: {
                    user: { select: { id: true, name: true, role: true } }
                }
            }),
            prisma.systemLog.count({ where })
        ])

        return NextResponse.json({
            data: logs,
            pagination: {
                total,
                page,
                totalPages: Math.ceil(total / limit)
            }
        })
    } catch (err) {
        console.error("Error fetching activity logs:", err)
        return NextResponse.json({ error: "Failed to fetch activity logs" }, { status: 500 })
    }
}
