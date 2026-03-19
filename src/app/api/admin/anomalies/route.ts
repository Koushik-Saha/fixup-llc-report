import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user.role !== 'Admin' && session.user.role !== 'Manager')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { searchParams } = new URL(req.url)
        const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 50
        const page = searchParams.get('page') ? Number(searchParams.get('page')) : 1
        const skip = (page - 1) * limit
        const status = searchParams.get('status') || 'Open' 
        const storeId = searchParams.get('storeId')
        
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

        const where: any = {}
        if (status && status !== 'All') {
            where.status = status
        }
        if (storeId) {
            where.report = { store_id: storeId }
        }

        if (allowedStoreIds) {
            where.report = {
                ...where.report,
                store_id: { in: allowedStoreIds }
            }
        }

        const [total, anomalies] = await prisma.$transaction([
            prisma.anomaly.count({ where }),
            prisma.anomaly.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    report: {
                        include: {
                            store: true,
                            submitted_by: { select: { name: true } }
                        }
                    }
                }
            })
        ])

        return NextResponse.json({
            data: anomalies,
            pagination: {
                total, page, totalPages: Math.ceil(total / limit)
            }
        })
    } catch (error) {
        console.error('Error fetching anomalies:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
