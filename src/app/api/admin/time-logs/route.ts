import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import prisma from '@/lib/prisma'

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const store_id = searchParams.get('store_id')
    const user_id = searchParams.get('user_id')
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    let where: any = {}

    if (store_id) where.store_id = store_id
    if (user_id) where.user_id = user_id
    
    if (from || to) {
      where.clock_in = {}
      if (from) where.clock_in.gte = new Date(from)
      if (to) {
        const toDate = new Date(to)
        toDate.setHours(23, 59, 59, 999)
        where.clock_in.lte = toDate
      }
    }

    const logs = await prisma.timeLog.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, role: true } },
        store: { select: { id: true, name: true } },
      },
      orderBy: { clock_in: 'desc' }
    })

    return NextResponse.json({ success: true, count: logs.length, data: logs })
  } catch (error: any) {
    console.error('Failed to fetch time logs:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { user_id, store_id, clock_in, clock_out, status, notes } = body

    const newLog = await prisma.timeLog.create({
      data: {
        user_id,
        store_id,
        clock_in: new Date(clock_in),
        clock_out: clock_out ? new Date(clock_out) : null,
        status: status || 'Approved',
        notes: notes || null
      },
      include: {
        user: { select: { id: true, name: true, role: true } },
        store: { select: { id: true, name: true } },
      }
    })

    return NextResponse.json({ success: true, data: newLog })
  } catch (error: any) {
    console.error('Failed to create time log:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
