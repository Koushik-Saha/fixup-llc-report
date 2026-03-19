import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user.role !== 'Admin' && session.user.role !== 'Manager')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { id } = await params
        const body = await req.json()
        const { status } = body

        if (!status || !['Open', 'Investigating', 'Resolved', 'Dismissed'].includes(status)) {
            return NextResponse.json({ error: 'Invalid status provided' }, { status: 400 })
        }

        const anomaly = await prisma.anomaly.update({
            where: { id },
            data: { status }
        })

        // Log the action
        await prisma.systemLog.create({
            data: {
                user_id: session.user.id,
                action: 'UPDATE_ANOMALY_STATUS',
                entity: 'Anomaly',
                entity_id: id,
                details: JSON.stringify({ new_status: status })
            }
        })

        return NextResponse.json(anomaly)
    } catch (error) {
        console.error('Error updating anomaly:', error)
        return NextResponse.json({ error: 'Internal server error while updating anomaly' }, { status: 500 })
    }
}
