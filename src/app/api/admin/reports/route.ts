import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (session?.user?.role !== 'Admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const storeId = searchParams.get('storeId')
    const startDateStr = searchParams.get('startDate')
    const endDateStr = searchParams.get('endDate')

    // Build the where clause dynamically
    const where: any = {}

    if (storeId) {
        where.store_id = storeId
    }

    if (startDateStr || endDateStr) {
        where.report_date = {}
        if (startDateStr) where.report_date.gte = new Date(startDateStr)
        if (endDateStr) where.report_date.lte = new Date(endDateStr)
    }

    const reports = await prisma.dailyReport.findMany({
        where,
        orderBy: { report_date: 'desc' },
        include: {
            store: { select: { name: true, city: true } },
            submitted_by: { select: { name: true } }
        }
    })

    return NextResponse.json(reports)
}
