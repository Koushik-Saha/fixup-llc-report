import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import prisma from '@/lib/prisma'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(utc)
dayjs.extend(timezone)

const TIMEZONE = 'America/Los_Angeles'

// GET — fetch shifts for a given week + store
export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user.role !== 'Admin' && session.user.role !== 'Manager')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const storeId = searchParams.get('storeId')
    const weekStart = searchParams.get('weekStart') // YYYY-MM-DD (Monday)

    if (!storeId || !weekStart) {
        return NextResponse.json({ error: 'storeId and weekStart required' }, { status: 400 })
    }

    const start = new Date(`${weekStart}T00:00:00.000Z`)
    const end = new Date(`${dayjs(weekStart).add(6, 'day').format('YYYY-MM-DD')}T00:00:00.000Z`)

    const [shifts, members] = await Promise.all([
        prisma.shiftSchedule.findMany({
            where: {
                store_id: storeId,
                shift_date: { gte: start, lte: end }
            },
            include: {
                user: { select: { id: true, name: true } }
            },
            orderBy: [{ shift_date: 'asc' }, { start_time: 'asc' }]
        }),
        prisma.storeMember.findMany({
            where: { store_id: storeId, status: 'Active' },
            include: { user: { select: { id: true, name: true, role: true } } }
        })
    ])

    return NextResponse.json({ shifts, members })
}

// POST — create or update a shift
export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user.role !== 'Admin' && session.user.role !== 'Manager')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { store_id, user_id, shift_date, start_time, end_time, notes } = body

    if (!store_id || !user_id || !shift_date || !start_time || !end_time) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const dateObj = new Date(`${shift_date}T00:00:00.000Z`)

    const shift = await prisma.shiftSchedule.upsert({
        where: { store_id_user_id_shift_date: { store_id, user_id, shift_date: dateObj } },
        update: { start_time, end_time, notes: notes || null },
        create: { store_id, user_id, shift_date: dateObj, start_time, end_time, notes: notes || null }
    })

    return NextResponse.json(shift)
}

// DELETE — remove a shift
export async function DELETE(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user.role !== 'Admin' && session.user.role !== 'Manager')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    await prisma.shiftSchedule.delete({ where: { id } })
    return NextResponse.json({ ok: true })
}
