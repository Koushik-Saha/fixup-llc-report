import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export const dynamic = 'force-dynamic'

export async function PATCH(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user.role !== 'Admin' && session.user.role !== 'Manager')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await req.json()
        const { reportIds } = body

        if (!reportIds || !Array.isArray(reportIds) || reportIds.length === 0) {
            return NextResponse.json({ error: 'No reports selected for verification' }, { status: 400 })
        }

        // Additional Manager validation: Managers can only verify reports belonging to their stores
        let allowedStoreIds: string[] = []
        if (session.user.role === 'Manager') {
            const memberships = await prisma.storeMember.findMany({
                where: { user_id: session.user.id, status: 'Active' },
                select: { store_id: true }
            })
            allowedStoreIds = memberships.map(m => m.store_id)
        } else {
            const companyStores = await prisma.store.findMany({
                where: { company_id: session.user.companyId },
                select: { id: true }
            })
            allowedStoreIds = companyStores.map(s => s.id)
        }

        if (allowedStoreIds.length === 0) {
             return NextResponse.json({ error: 'No authorized stores available for verification' }, { status: 403 })
        }

        const whereClause: any = {
            id: { in: reportIds },
            status: 'Submitted', // Ensure we only verify unverified reports
            store_id: { in: allowedStoreIds },
            deleted_at: null
        }

        const updateResult = await prisma.dailyReport.updateMany({
            where: whereClause,
            data: { status: 'Verified' }
        })

        if (updateResult.count > 0) {
            await prisma.systemLog.create({
                data: {
                    user_id: session.user.id,
                    action: 'BULK_VERIFY_REPORTS',
                    entity: 'DailyReport',
                    entity_id: 'bulk',
                    details: JSON.stringify({ verified_count: updateResult.count, requested_ids: reportIds })
                }
            })
        }

        return NextResponse.json({
            message: `Successfully verified ${(updateResult).count} reports.`,
            count: updateResult.count
        })

    } catch (err: any) {
        console.error('Error during bulk verification:', err)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
