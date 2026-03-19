import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import prisma from '@/lib/prisma'

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await props.params
    const body = await req.json()
    const { clock_in, clock_out, status, notes } = body

    let updateData: any = {}
    if (clock_in !== undefined) updateData.clock_in = new Date(clock_in)
    if (clock_out !== undefined) updateData.clock_out = clock_out ? new Date(clock_out) : null
    if (status !== undefined) updateData.status = status
    if (notes !== undefined) updateData.notes = notes

    const updatedLog = await prisma.timeLog.update({
      where: { id },
      data: updateData,
      include: {
        user: { select: { id: true, name: true } },
        store: { select: { id: true, name: true } }
      }
    })

    return NextResponse.json({ success: true, data: updatedLog })
  } catch (error: any) {
    console.error('Failed to update time log:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await props.params

    await prisma.timeLog.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Failed to delete time log:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
