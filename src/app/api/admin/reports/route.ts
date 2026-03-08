import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { sendDailySummary } from '@/lib/email'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user.role !== 'Admin' && session.user.role !== 'Manager')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { store_id, staff_ids, cash_amount, card_amount, expenses_amount, payouts_amount, report_date, time_in, time_out, notes, imageUrls } = body

    if (!store_id) {
        return NextResponse.json({ error: 'Store ID is required' }, { status: 400 })
    }

    if (!staff_ids || !Array.isArray(staff_ids) || staff_ids.length === 0) {
        return NextResponse.json({ error: 'At least one staff member must be assigned to the report' }, { status: 400 })
    }

    if (session.user.role === 'Manager') {
        const isMember = await prisma.storeMember.findFirst({
            where: { store_id, user_id: session.user.id, status: 'Active' }
        })
        if (!isMember) {
            return NextResponse.json({ error: 'You are not assigned to this store' }, { status: 403 })
        }
    }

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
    const reportDateObj = new Date(`${dateString}T00:00:00`)

    // Admin has NO Policy Check. They can backdate endlessly.

    // Check if report already exists for the specific target date
    const existingReport = await prisma.dailyReport.findUnique({
        where: {
            store_id_report_date: {
                store_id: store_id,
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
                    store_id: store_id,
                    report_date: reportDateObj,
                    submitted_by_user_id: session.user.id, // Primary record keeper
                    assignees: {
                        connect: staff_ids.map((id: string) => ({ id }))
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

            const store = await tx.store.findUnique({ where: { id: store_id } })
            sendDailySummary({
                storeName: store?.name || 'Unknown Store',
                reportDate: reportDateObj.toLocaleDateString(),
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
    if (!session?.user || (session.user.role !== 'Admin' && session.user.role !== 'Manager')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const storeId = searchParams.get('storeId')
    const userId = searchParams.get('userId')
    const startDateStr = searchParams.get('startDate')
    const endDateStr = searchParams.get('endDate')

    const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 20
    const page = searchParams.get('page') ? Number(searchParams.get('page')) : 1
    const skip = (page - 1) * limit
    const search = searchParams.get('search')

    let allowedStoreIds: string[] | null = null
    if (session.user.role === 'Manager') {
        const memberships = await prisma.storeMember.findMany({
            where: { user_id: session.user.id, status: 'Active' },
            select: { store_id: true }
        })
        allowedStoreIds = memberships.map(m => m.store_id)
        if (allowedStoreIds.length === 0) {
            return NextResponse.json({ data: [], pagination: { total: 0, page: 1, totalPages: 0 } })
        }
    }

    // Build the where clause dynamically
    const where: any = {}

    if (allowedStoreIds) {
        if (storeId && !allowedStoreIds.includes(storeId)) {
            return NextResponse.json({ data: [], pagination: { total: 0, page: 1, totalPages: 0 } })
        }
        where.store_id = storeId ? storeId : { in: allowedStoreIds }
    } else if (storeId) {
        where.store_id = storeId
    }

    if (userId) {
        where.submitted_by_user_id = userId
    }

    if (startDateStr || endDateStr) {
        where.report_date = {}
        if (startDateStr) where.report_date.gte = new Date(startDateStr)
        if (endDateStr) where.report_date.lte = new Date(endDateStr)
    }

    if (search) {
        where.OR = [
            { store: { name: { contains: search, mode: 'insensitive' } } },
            { submitted_by: { name: { contains: search, mode: 'insensitive' } } }
        ]
    }

    // IF userId OR search is provided, stick to the traditional Prisma query
    // (because "missing" reports don't have a user or anything text-searchable)
    if (userId || search) {
        const [reports, total] = await Promise.all([
            prisma.dailyReport.findMany({
                where,
                orderBy: { report_date: 'desc' },
                skip,
                take: limit,
                include: {
                    store: { select: { name: true, city: true } },
                    submitted_by: { select: { name: true } },
                    assignees: { select: { name: true, role: true } }
                }
            }),
            prisma.dailyReport.count({ where })
        ])

        return NextResponse.json({
            data: reports,
            pagination: {
                total,
                page,
                totalPages: Math.ceil(total / limit)
            }
        })
    }

    // Otherwise, Generate Cross Product of Dates x Stores to reveal MISSING reports
    const SYSTEM_EPOCH = new Date('2026-03-01T00:00:00.000Z')
    const end = endDateStr ? new Date(endDateStr) : new Date()
    let start = startDateStr ? new Date(startDateStr) : new Date(end.getTime() - 29 * 24 * 60 * 60 * 1000)

    if (start < SYSTEM_EPOCH) {
        start = SYSTEM_EPOCH
    }

    const days: string[] = [];
    for (let d = new Date(end); d >= start; d.setDate(d.getDate() - 1)) {
        if (d < SYSTEM_EPOCH) break;
        days.push(d.toISOString().split('T')[0]);
    }

    const storesQuery: any = { status: 'Active' }
    if (allowedStoreIds) {
        if (storeId && !allowedStoreIds.includes(storeId)) {
            storesQuery.id = 'NO_ACCESS'
        } else {
            storesQuery.id = storeId ? storeId : { in: allowedStoreIds }
        }
    } else if (storeId) {
        storesQuery.id = storeId
    }

    const stores = await prisma.store.findMany({ where: storesQuery, select: { id: true, name: true, city: true } })

    const allCombinations = [];
    // Sort array by Date DESC, then Store Name ASC
    for (const day of days) {
        const sortedStores = [...stores].sort((a, b) => a.name.localeCompare(b.name));
        for (const store of sortedStores) {
            allCombinations.push({ date: day, store })
        }
    }

    const total = allCombinations.length;
    const paginatedCombinations = allCombinations.slice(skip, skip + limit);

    // Fetch matching reports in one query using OR
    let reports: any[] = [];
    if (paginatedCombinations.length > 0) {
        reports = await prisma.dailyReport.findMany({
            where: {
                OR: paginatedCombinations.map(c => ({
                    store_id: c.store.id,
                    report_date: new Date(`${c.date}T00:00:00.000Z`)
                }))
            },
            include: {
                store: { select: { name: true, city: true } },
                submitted_by: { select: { name: true } },
                assignees: { select: { name: true, role: true } }
            }
        })
    }

    const reportMap = new Map()
    reports.forEach(r => reportMap.set(`${r.store_id}_${r.report_date.toISOString().split('T')[0]}`, r))

    const finalData = paginatedCombinations.map(c => {
        const key = `${c.store.id}_${c.date}`
        if (reportMap.has(key)) return reportMap.get(key)

        return {
            id: `missing-${key}`,
            report_date: new Date(`${c.date}T00:00:00.000Z`),
            store: c.store,
            store_id: c.store.id,
            submitted_by: null,
            cash_amount: 0,
            card_amount: 0,
            total_amount: 0,
            status: 'Missing',
        }
    })

    return NextResponse.json({
        data: finalData,
        pagination: {
            total,
            page,
            totalPages: Math.ceil(total / limit)
        }
    })
}
