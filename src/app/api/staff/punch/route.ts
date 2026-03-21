import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import prisma from '@/lib/prisma'

// GET /api/staff/punch
// Returns current open TimeLog for the user
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const openLog = await prisma.timeLog.findFirst({
      where: {
        user_id: session.user.id,
        clock_out: null,
      },
      include: {
        store: true
      }
    })

    return NextResponse.json(openLog || null)
  } catch (error: any) {
    console.error('Error fetching punch status:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/staff/punch
// Action: 'clock_in' or 'clock_out'
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { action } = body
    const storeId = session.user.storeId

    if (action === 'clock_in') {
      if (!storeId) {
        return NextResponse.json({ error: 'No active store assigned to your profile.' }, { status: 400 })
      }

      // Check if already clocked in
      const existingOpen = await prisma.timeLog.findFirst({
        where: { user_id: session.user.id, clock_out: null }
      })

      if (existingOpen) {
        return NextResponse.json({ error: 'Already clocked in' }, { status: 400 })
      }

      const newPunch = await prisma.timeLog.create({
        data: {
          user_id: session.user.id,
          store_id: storeId,
          clock_in: new Date(),
          status: 'Approved' // Assumed approved by default for live punches
        },
        include: { store: true }
      })

      return NextResponse.json({ success: true, log: newPunch })

    } else if (action === 'clock_out') {
      // Find open log
      const openLog = await prisma.timeLog.findFirst({
        where: { user_id: session.user.id, clock_out: null }
      })

      if (!openLog) {
        return NextResponse.json({ error: 'No active clock-in found' }, { status: 400 })
      }

      const closedPunch = await prisma.timeLog.update({
        where: { id: openLog.id },
        data: { clock_out: new Date() },
        include: { store: true }
      })

      return NextResponse.json({ success: true, log: closedPunch })
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error: any) {
    console.error('Error processing punch:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
