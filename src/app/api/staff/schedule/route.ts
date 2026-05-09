import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { getStaffPermissions } from '@/lib/permissions'
import prisma from '@/lib/prisma'
import dayjs from 'dayjs'

export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'Staff') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const perms = await getStaffPermissions(session.user.companyId)
    if (!perms.schedule.view) return NextResponse.json({ error: 'Permission denied' }, { status: 403 })

    const userId = session.user.id as string
    const storeId = session.user.storeId
    if (!storeId) return NextResponse.json({ error: 'No store assigned' }, { status: 400 })

    // Next 14 days from today
    const todayStr = dayjs().format('YYYY-MM-DD')
    const endStr = dayjs().add(13, 'day').format('YYYY-MM-DD')

    const shifts = await prisma.shiftSchedule.findMany({
        where: {
            user_id: userId,
            shift_date: {
                gte: new Date(`${todayStr}T00:00:00.000Z`),
                lte: new Date(`${endStr}T00:00:00.000Z`)
            }
        },
        orderBy: { shift_date: 'asc' }
    })

    return NextResponse.json({
        shifts: shifts.map(s => ({
            id: s.id,
            shift_date: s.shift_date.toISOString().split('T')[0],
            start_time: s.start_time,
            end_time: s.end_time,
            notes: s.notes
        }))
    })
}
