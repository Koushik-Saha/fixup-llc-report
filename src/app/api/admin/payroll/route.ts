import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (session?.user?.role !== 'Admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const monthYear = searchParams.get('month') || new Date().toISOString().slice(0, 7) // "YYYY-MM"

    // Fetch all active staff/users
    const users = await prisma.user.findMany({
        where: { status: 'Active' },
        select: { id: true, name: true, email: true, role: true, base_salary: true }
    })

    // Fetch existing payroll records for this month
    const records = await prisma.payrollRecord.findMany({
        where: { month_year: monthYear },
        include: {
            payments: {
                orderBy: { payment_date: 'desc' }
            }
        }
    })

    const currentMonthYear = new Date().toISOString().slice(0, 7)

    // If it is a past/future month AND there are zero records generated for it, return empty.
    if (records.length === 0 && monthYear !== currentMonthYear) {
        return NextResponse.json([])
    }

    const recordMap = new Map()
    records.forEach(r => recordMap.set(r.user_id, r))

    const data = users.map(user => {
        const record = recordMap.get(user.id)
        if (record) {
            return {
                user_id: user.id,
                name: user.name,
                role: user.role,
                base_salary: Number(user.base_salary),
                record_id: record.id,
                total_paid: Number(record.total_paid),
                status: record.status,
                payments: record.payments.map((p: any) => ({
                    id: p.id,
                    amount: Number(p.amount),
                    date: p.payment_date,
                    notes: p.notes
                }))
            }
        } else {
            return {
                user_id: user.id,
                name: user.name,
                role: user.role,
                base_salary: Number(user.base_salary),
                record_id: null,
                total_paid: 0,
                status: 'Pending',
                payments: []
            }
        }
    })

    return NextResponse.json(data)
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (session?.user?.role !== 'Admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { user_id, month_year, amount, notes, payment_date } = body

    if (!user_id || !month_year || amount === undefined) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const payAmount = Number(amount)
    if (payAmount <= 0) {
        return NextResponse.json({ error: 'Amount must be greater than zero' }, { status: 400 })
    }

    try {
        const result = await prisma.$transaction(async (tx: any) => {
            // Get user's current salary
            const user = await tx.user.findUnique({ where: { id: user_id } })
            if (!user) throw new Error('User not found')

            const baseSalary = Number(user.base_salary)

            // Find or create record
            let record = await tx.payrollRecord.findUnique({
                where: { user_id_month_year: { user_id, month_year } }
            })

            if (!record) {
                record = await tx.payrollRecord.create({
                    data: {
                        user_id,
                        month_year,
                        base_salary: baseSalary,
                        total_paid: 0,
                        status: 'Pending'
                    }
                })
            }

            // Create payment
            const payment = await tx.payrollPayment.create({
                data: {
                    record_id: record.id,
                    amount: payAmount,
                    payment_date: payment_date ? new Date(payment_date) : new Date(),
                    notes: notes || null
                }
            })

            // Update total and status
            const newTotal = Number(record.total_paid) + payAmount
            const newStatus = newTotal >= Number(record.base_salary) ? 'Paid' : 'Partial'

            await tx.payrollRecord.update({
                where: { id: record.id },
                data: {
                    total_paid: newTotal,
                    status: newStatus
                }
            })

            await tx.systemLog.create({
                data: {
                    user_id: session.user.id,
                    action: 'PAYROLL_PAYMENT_CREATE',
                    entity: 'PayrollRecord',
                    entity_id: record.id,
                    details: JSON.stringify({ amount: payAmount, notes: notes })
                }
            })

            return payment
        })

        return NextResponse.json(result)
    } catch (err: any) {
        console.error("Payroll payment error", err)
        return NextResponse.json({ error: err.message || 'Failed to submit payment' }, { status: 400 })
    }
}
