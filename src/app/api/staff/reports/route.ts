import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { sendDailySummary } from '@/lib/email'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'Staff') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const storeId = session.user.storeId
    if (!storeId) {
        return NextResponse.json({ error: 'No active store assigned' }, { status: 400 })
    }

    const body = await req.json()
    const { cash_amount, card_amount, expenses_amount, payouts_amount, report_date, time_in, time_out, notes, imageUrls } = body

    if (cash_amount === undefined || card_amount === undefined) {
        return NextResponse.json({ error: 'Cash and Card amounts are required' }, { status: 400 })
    }

    const netCash = Number(cash_amount) - (Number(expenses_amount) || 0) - (Number(payouts_amount) || 0)
    const total = netCash + Number(card_amount)

    const targetDate = report_date ? new Date(report_date) : new Date()
    // Align dates to local 00:00:00 without time zone shifts causing bugs
    // Next.js runtime is usually UTC, so we must be careful. For simplicity, we use the string prefix.
    const dateString = targetDate.toISOString().split('T')[0]

    // Explicitly construct purely local Date object at midnight to avoid timezone shifting
    // E.g., Date("2026-03-07T00:00:00") aligns nicely with Prisma db.Date insertions
    const reportDateObj = new Date(`${dateString}T00:00:00`)

    // Policy Check: Report date must be Today or Yesterday
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    if (dateString !== todayStr && dateString !== yesterdayStr) {
        return NextResponse.json({ error: 'You may only submit reports for Today or Yesterday. Please contact an Administrator.' }, { status: 400 })
    }

    // Check if report already exists for the specific target date
    const existingReport = await prisma.dailyReport.findUnique({
        where: {
            store_id_report_date: {
                store_id: storeId,
                report_date: reportDateObj
            }
        }
    })

    if (existingReport) {
        return NextResponse.json({ error: `A report for ${dateString} has already been submitted for this store.` }, { status: 400 })
    }

    try {
        // We use a transaction to create the report and the images together
        const report = await prisma.$transaction(async (tx: any) => {
            const newReport = await tx.dailyReport.create({
                data: {
                    store_id: storeId,
                    report_date: reportDateObj,
                    submitted_by_user_id: session.user.id,
                    assignees: {
                        connect: { id: session.user.id }
                    },
                    cash_amount: Number(cash_amount),
                    card_amount: Number(card_amount),
                    expenses_amount: Number(expenses_amount) || 0,
                    payouts_amount: Number(payouts_amount) || 0,
                    total_amount: total,
                    time_in: time_in || null,
                    time_out: time_out || null,
                    notes: notes || null,
                    status: 'Submitted'
                }
            })

            if (imageUrls && imageUrls.length > 0) {
                await tx.reportImage.createMany({
                    data: imageUrls.map((url: string) => ({
                        report_id: newReport.id,
                        image_url: url
                    }))
                })
            }

            await tx.systemLog.create({
                data: {
                    user_id: session.user.id,
                    action: 'REPORT_CREATE',
                    entity: 'DailyReport',
                    entity_id: newReport.id,
                    details: JSON.stringify({ cash: newReport.cash_amount, card: newReport.card_amount, total: newReport.total_amount })
                }
            })

            const store = await tx.store.findUnique({ where: { id: storeId } })
            sendDailySummary({
                storeName: store?.name || 'Unknown Store',
                reportDate: reportDateObj.toLocaleDateString('en-US', { timeZone: 'UTC' }),
                netCash,
                cardAmount: Number(card_amount),
                totalDeposit: total,
                notes: notes || null
            })

            return newReport
        })

        return NextResponse.json(report)
    } catch (err: any) {
        console.error('Error creating report:', err)
        // To handle unique constraint technically just in case of race condition
        if (err.code === 'P2002') {
            return NextResponse.json({ error: 'Report already exists for today' }, { status: 400 })
        }
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'Staff') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const storeId = session.user.storeId
    if (!storeId) {
        return NextResponse.json({ error: 'No active store assigned' }, { status: 400 })
    }

    const { searchParams } = new URL(req.url)
    const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 30 // default 30 days
    const page = searchParams.get('page') ? Number(searchParams.get('page')) : 1

    const store = await prisma.store.findUnique({ where: { id: storeId } })
    if (!store) {
        return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    const now = new Date()
    const SYSTEM_EPOCH = new Date('2026-03-01T00:00:00.000Z')

    // Default to at least 30 days if store.createdAt is missing or weird, 
    // otherwise calculate days from when the store was created.
    const storeCreatedAt = store.createdAt ? new Date(store.createdAt) : new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
    const effectiveStart = storeCreatedAt > SYSTEM_EPOCH ? storeCreatedAt : SYSTEM_EPOCH

    const msPerDay = 1000 * 60 * 60 * 24;
    const totalDays = Math.max(1, Math.ceil((now.getTime() - effectiveStart.getTime()) / msPerDay));
    const totalPages = Math.ceil(totalDays / limit)

    // Generate dates based on page offset
    const end = new Date()
    end.setDate(end.getDate() - (page - 1) * limit)
    const start = new Date(end)
    start.setDate(start.getDate() - limit + 1)

    const dates: string[] = []
    for (let d = new Date(end); d >= start; d.setDate(d.getDate() - 1)) {
        if (d < SYSTEM_EPOCH) break;
        dates.push(d.toISOString().split('T')[0])
    }

    if (dates.length === 0) {
        return NextResponse.json({
            data: [],
            pagination: {
                total: totalDays,
                page,
                totalPages: Math.max(1, totalPages)
            }
        })
    }

    const reports = await prisma.dailyReport.findMany({
        where: {
            store_id: storeId,
            report_date: {
                gte: new Date(`${dates[dates.length - 1]}T00:00:00.000Z`),
                lte: new Date(`${dates[0]}T00:00:00.000Z`)
            }
        },
        select: {
            id: true,
            report_date: true,
            total_amount: true,
            status: true,
            staff_edit_count: true,
            store: {
                select: {
                    name: true
                }
            }
        }
    })

    const reportMap = new Map()
    reports.forEach(r => reportMap.set(r.report_date.toISOString().split('T')[0], r))

    const finalData = dates.map(dateStr => {
        if (reportMap.has(dateStr)) {
            return reportMap.get(dateStr)
        }
        return {
            id: `missing-${dateStr}`,
            report_date: new Date(`${dateStr}T00:00:00.000Z`),
            total_amount: 0,
            status: 'Missing',
            staff_edit_count: 0,
            store: {
                name: store?.name || 'Store'
            }
        }
    })

    return NextResponse.json({
        data: finalData,
        pagination: {
            total: totalDays,
            page,
            totalPages: Math.max(1, totalPages)
        }
    })
}
