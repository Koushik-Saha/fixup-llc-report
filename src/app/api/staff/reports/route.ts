import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { sendDailySummary } from '@/lib/email'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { evaluateReportForAnomalies } from '@/lib/anomaly-engine'

dayjs.extend(utc)
dayjs.extend(timezone)

const TIMEZONE = 'America/Los_Angeles'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'Staff') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { store_id, cash_amount, card_amount, expenses_amount, payouts_amount, report_date, category_id, time_in, time_out, notes, imageUrls, sale_items, inventory_usage } = body

    const memberships = await prisma.storeMember.findMany({
        where: { user_id: session.user.id, status: 'Active' },
        select: { store_id: true }
    })

    if (memberships.length === 0) {
        return NextResponse.json({ error: 'No active store assigned to you' }, { status: 403 })
    }

    let finalStoreId = store_id || req.headers.get('cookie')?.split('; ').find(row => row.startsWith('activeStoreId='))?.split('=')[1]
    if (!finalStoreId) {
        finalStoreId = memberships[0].store_id
    } else if (!memberships.some(m => m.store_id === finalStoreId)) {
        return NextResponse.json({ error: 'You are not assigned to the selected store' }, { status: 403 })
    }
    const storeId = finalStoreId

    if (cash_amount === undefined || card_amount === undefined) {
        return NextResponse.json({ error: 'Cash and Card amounts are required' }, { status: 400 })
    }

    const total = Number(cash_amount) + Number(card_amount)
    const netCash = Number(cash_amount) - (Number(expenses_amount) || 0) - (Number(payouts_amount) || 0)

    const nowTz = dayjs().tz(TIMEZONE)
    const todayStr = nowTz.format('YYYY-MM-DD')
    const yesterdayStr = nowTz.subtract(1, 'day').format('YYYY-MM-DD')

    const targetDateStr = report_date ? String(report_date).split('T')[0] : todayStr
    
    // Explicitly construct purely local Date object at midnight to avoid timezone shifting
    // E.g., Date("2026-03-07T00:00:00") aligns nicely with Prisma db.Date insertions
    const reportDateObj = new Date(`${targetDateStr}T00:00:00`)

    if (targetDateStr !== todayStr && targetDateStr !== yesterdayStr) {
        return NextResponse.json({ error: 'You may only submit reports for Today or Yesterday. Please contact an Administrator.' }, { status: 400 })
    }

    // Use targetDateStr for messaging
    const dateString = targetDateStr

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
                    status: 'Submitted',
                    sale_items: sale_items && sale_items.length > 0 ? {
                        create: sale_items.map((item: any) => ({
                            category: item.category,
                            description: item.description,
                            quantity: Number(item.quantity) || 1,
                            unit_price: Number(item.unit_price) || 0
                        }))
                    } : undefined
                }
            })

            // Process Inventory Usage
            if (inventory_usage && inventory_usage.length > 0) {
                for (const usage of inventory_usage) {
                    const qty = Number(usage.quantity) || 0
                    if (qty <= 0) continue

                    await tx.inventoryUsage.create({
                        data: {
                            report_id: newReport.id,
                            item_id: usage.item_id,
                            quantity_used: qty
                        }
                    })

                    await tx.inventoryItem.update({
                        where: { id: usage.item_id },
                        data: { quantity: { decrement: qty } }
                    })
                }
            }

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

        // Fire and forget anomaly evaluation
        evaluateReportForAnomalies(report.id).catch(console.error)

        return NextResponse.json(report, { status: 201 })
    } catch (error: any) {
        console.error('Error creating report:', error)
        // To handle unique constraint technically just in case of race condition
        if (error.code === 'P2002') {
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

    const { searchParams } = new URL(req.url)
    const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 30 // default 30 days
    const page = searchParams.get('page') ? Number(searchParams.get('page')) : 1
    const targetStoreId = searchParams.get('store_id') || req.headers.get('cookie')?.split('; ').find(row => row.startsWith('activeStoreId='))?.split('=')[1]

    const memberships = await prisma.storeMember.findMany({
        where: { user_id: session.user.id, status: 'Active' },
        select: { store_id: true }
    })

    if (memberships.length === 0) {
        return NextResponse.json({ error: 'No active store assigned' }, { status: 403 })
    }

    let finalStoreId = targetStoreId
    if (!finalStoreId) {
        finalStoreId = memberships[0].store_id
    } else if (!memberships.some(m => m.store_id === finalStoreId)) {
        return NextResponse.json({ error: 'You are not assigned to the selected store' }, { status: 403 })
    }
    const storeId = finalStoreId

    const store = await prisma.store.findUnique({ where: { id: storeId } })
    if (!store) {
        return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    const nowTz = dayjs().tz(TIMEZONE)
    const SYSTEM_EPOCH = dayjs.tz('2026-03-01T00:00:00', TIMEZONE)

    // Default to at least 30 days if store.createdAt is missing or weird
    const storeCreatedAt = store.createdAt ? dayjs(store.createdAt).tz(TIMEZONE) : nowTz.subtract(29, 'day');
    const effectiveStart = storeCreatedAt.isAfter(SYSTEM_EPOCH) ? storeCreatedAt : SYSTEM_EPOCH

    const totalDays = Math.max(1, nowTz.startOf('day').diff(effectiveStart.startOf('day'), 'day') + 1);
    const totalPages = Math.ceil(totalDays / limit)

    // Generate dates based on page offset
    const end = nowTz.subtract((page - 1) * limit, 'day').startOf('day')
    const start = end.subtract(limit - 1, 'day').startOf('day')

    const dates: string[] = []
    for (let d = end; d.isAfter(start) || d.isSame(start, 'day'); d = d.subtract(1, 'day')) {
        if (d.isBefore(SYSTEM_EPOCH, 'day')) break;
        dates.push(d.format('YYYY-MM-DD'))
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
            },
            deleted_at: null
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
