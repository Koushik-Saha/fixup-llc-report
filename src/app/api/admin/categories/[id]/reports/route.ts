import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user.role !== 'Admin' && session.user.role !== 'Manager')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { id } = await params
        const { searchParams } = new URL(req.url)
        
        const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 20
        const page = searchParams.get('page') ? Number(searchParams.get('page')) : 1
        const skip = (page - 1) * limit
        const status = searchParams.get('status')
        const startDateStr = searchParams.get('startDate')
        const endDateStr = searchParams.get('endDate')

        const where: any = { category_id: id }

        if (status) {
            where.status = status
        }
        
        if (startDateStr && endDateStr) {
            where.report_date = {
                gte: new Date(startDateStr),
                lte: new Date(endDateStr)
            }
        } else if (startDateStr) {
            where.report_date = { gte: new Date(startDateStr) }
        }

        const [total, reports] = await prisma.$transaction([
            prisma.categoryReport.count({ where }),
            prisma.categoryReport.findMany({
                where,
                skip,
                take: limit,
                orderBy: { report_date: 'desc' },
                include: {
                    submitted_by: {
                        select: { name: true, id: true }
                    }
                }
            })
        ])

        return NextResponse.json({
            data: reports,
            pagination: {
                total,
                page,
                totalPages: Math.ceil(total / limit)
            }
        }, { status: 200 })

    } catch (error: any) {
        console.error('Error fetching category reports:', error)
        return NextResponse.json({ error: 'Internal server error while fetching reports' }, { status: 500 })
    }
}
