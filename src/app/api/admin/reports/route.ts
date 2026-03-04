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

    const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 20
    const page = searchParams.get('page') ? Number(searchParams.get('page')) : 1
    const skip = (page - 1) * limit
    const search = searchParams.get('search')

    // Build the where clause dynamically
    const where: any = {}

    if (storeId) {
        where.store_id = storeId
    }

    if (userId) {
        where.submitted_by_user_id = userId
    }

    if (startDateStr || endDateStr) {
        where.report_date = {}
        if (startDateStr) where.report_date.gte = new Date(startDateStr)
        if (endDateStr) where.report_date.lte = new Date(endDateStr)
    }

    if (search) {
        where.OR = [
            { store: { name: { contains: search, mode: 'insensitive' } } },
            { submitted_by: { name: { contains: search, mode: 'insensitive' } } }
        ]
    }

    const [reports, total] = await Promise.all([
        prisma.dailyReport.findMany({
            where,
            orderBy: { report_date: 'desc' },
            skip,
            take: limit,
            include: {
                store: { select: { name: true, city: true } },
                submitted_by: { select: { name: true } }
            }
        }),
        prisma.dailyReport.count({ where })
    ])

    return NextResponse.json({
        data: reports,
        pagination: {
            total,
            page,
            totalPages: Math.ceil(total / limit)
        }
    })
}
