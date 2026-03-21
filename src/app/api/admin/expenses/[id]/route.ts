import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import prisma from '@/lib/prisma'

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user.role !== 'Admin' && session.user.role !== 'Manager')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const { action, review_note } = body // action: 'approve' | 'reject'

    if (!action || !['approve', 'reject'].includes(action)) {
        return NextResponse.json({ error: 'action must be approve or reject' }, { status: 400 })
    }

    const expense = await prisma.storeExpense.findFirst({
        where: { id, store: { company_id: session.user.companyId } }
    })
    if (!expense) return NextResponse.json({ error: 'Expense not found or unauthorized' }, { status: 404 })

    const updated = await prisma.storeExpense.update({
        where: { id },
        data: {
            approval_status: action === 'approve' ? 'Approved' : 'Rejected',
            reviewed_by_id: session.user.id as string,
            review_note: review_note || null,
            reviewed_at: new Date()
        },
        include: {
            store: { select: { name: true } },
            user: { select: { name: true } },
            reviewed_by: { select: { name: true } }
        }
    })

    // Log action
    await prisma.systemLog.create({
        data: {
            user_id: session.user.id as string,
            action: action === 'approve' ? 'EXPENSE_APPROVED' : 'EXPENSE_REJECTED',
            entity: 'StoreExpense',
            entity_id: id,
            details: JSON.stringify({ status: updated.approval_status, review_note })
        }
    })

    return NextResponse.json(updated)
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'Admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const expense = await prisma.storeExpense.findFirst({
        where: { id, store: { company_id: session.user.companyId } }
    })
    if (!expense) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

    await prisma.storeExpense.delete({ where: { id } })
    return NextResponse.json({ ok: true })
}
