import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (session?.user?.role !== 'Admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const storeId = searchParams.get('storeId')
    const userId = searchParams.get('userId')
    const startDateStr = searchParams.get('startDate')
    const endDateStr = searchParams.get('endDate')
    const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 100

    // Build the where clause for the EditLog query
    const where: any = {}

    // Filtering by user who made the edit
    if (userId) {
        where.user_id = userId
    }

    // Filtering by timestamp of the edit
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

    // Filtering by store requires a relation filter since EditLog points to DailyReport which points to Store
    if (storeId) {
        where.report = {
            store_id: storeId
        }
    }

    try {
        const logs = await prisma.editLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: limit,
            include: {
                user: { select: { id: true, name: true, role: true } },
                report: {
                    select: {
                        id: true,
                        report_date: true,
                        store: { select: { id: true, name: true } }
                    }
                }
            }
        })

        return NextResponse.json(logs)
    } catch (err) {
        console.error("Error fetching activity logs:", err)
        return NextResponse.json({ error: "Failed to fetch activity logs" }, { status: 500 })
    }
}
