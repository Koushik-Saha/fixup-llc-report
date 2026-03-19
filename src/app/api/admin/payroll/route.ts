import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export const dynamic = 'force-dynamic'

function parseHours(timeStr: string | null | undefined): number | null {
    if (!timeStr) return null;
    if (timeStr.toLowerCase().includes('am') || timeStr.toLowerCase().includes('pm')) {
        const [time, period] = timeStr.split(' ');
        let [hours, minutes] = time.split(':').map(Number);
        if (period.toLowerCase() === 'pm' && hours !== 12) hours += 12;
        if (period.toLowerCase() === 'am' && hours === 12) hours = 0;
        if (isNaN(hours) || isNaN(minutes)) return null;
        return hours + (minutes / 60);
    } else {
        const [hours, minutes] = timeStr.split(':').map(Number);
        if (isNaN(hours) || isNaN(minutes)) return null;
        return hours + (minutes / 60);
    }
}

function calculateDuration(timeIn: string | null | undefined, timeOut: string | null | undefined): number {
    const start = parseHours(timeIn);
    const end = parseHours(timeOut);
    if (start === null || end === null) return 0;
    let duration = end - start;
    if (duration < 0) duration += 24;
    return Math.max(0, duration);
}

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (session?.user?.role !== 'Admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const monthYear = searchParams.get('month') || new Date().toISOString().slice(0, 7) // "YYYY-MM"

    // Fetch all active staff/users except the ghost admin
    const users = await prisma.user.findMany({
        where: { status: 'Active', email: { not: 'koushik@freedomshippingllc.com' } },
        select: { id: true, name: true, email: true, role: true, pay_type: true, base_salary: true }
    })

    // Calculate hourly totals if any HOURLY users exist
    const hourlyUsers = users.filter(u => u.pay_type === 'HOURLY')
    const hourlyTotals = new Map<string, number>()

    if (hourlyUsers.length > 0) {
        const startDate = new Date(`${monthYear}-01T00:00:00.000Z`)
        const endDate = new Date(startDate)
        endDate.setMonth(endDate.getMonth() + 1)
        
        const logs = await prisma.timeLog.findMany({
            where: {
                clock_in: { gte: startDate, lt: endDate },
                status: 'Approved',
                clock_out: { not: null } // Only count finished punches
            },
            select: { user_id: true, clock_in: true, clock_out: true }
        })

        for (const log of logs) {
            if (!log.clock_out) continue;
            const durationMs = log.clock_out.getTime() - log.clock_in.getTime()
            const durationHrs = durationMs / (1000 * 60 * 60)
            
            hourlyTotals.set(log.user_id, (hourlyTotals.get(log.user_id) || 0) + Math.max(0, durationHrs))
        }
    }

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
        
        // Calculate the accurate Gross Pay for the month
        let grossDue = Number(user.base_salary)
        if (user.pay_type === 'HOURLY') {
            const hours = hourlyTotals.get(user.id) || 0
            grossDue = hours * Number(user.base_salary)
        }

        if (record) {
            return {
                user_id: user.id,
                name: user.name,
                role: user.role,
                pay_type: user.pay_type || 'MONTHLY',
                base_salary: grossDue, // Show dynamic calculated gross
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
                pay_type: user.pay_type || 'MONTHLY',
                base_salary: grossDue,
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
    const { user_id, month_year, amount, notes, payment_date, base_salary } = body

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

            const baseSalaryToUse = base_salary !== undefined ? Number(base_salary) : Number(user.base_salary)

            // Find or create record
            let record = await tx.payrollRecord.findUnique({
                where: { user_id_month_year: { user_id, month_year } }
            })

            if (!record) {
                record = await tx.payrollRecord.create({
                    data: {
                        user_id,
                        month_year,
                        base_salary: baseSalaryToUse,
                        total_paid: 0,
                        status: 'Pending'
                    }
                })
            } else if (base_salary !== undefined && Number(record.base_salary) !== baseSalaryToUse) {
                // Keep record sync'd if their hourly projection changed
                await tx.payrollRecord.update({
                    where: { id: record.id },
                    data: { base_salary: baseSalaryToUse }
                })
                record.base_salary = baseSalaryToUse
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
