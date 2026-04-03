import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { sendDailySummary } from '@/lib/email'
import { evaluateReportForAnomalies } from '@/lib/anomaly-engine'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(utc)
dayjs.extend(timezone)

const TIMEZONE = 'America/Los_Angeles'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user.role !== 'Admin' && session.user.role !== 'Manager')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { store_id, cash_amount, card_amount, expenses_amount, payouts_amount, report_date, category_id, time_in, time_out, notes, imageUrls, staff_ids, status, sale_items, inventory_usage } = body

    if (!store_id || cash_amount === undefined || card_amount === undefined) {
        return NextResponse.json({ error: 'Store ID, Cash, and Card amounts are required' }, { status: 400 })
    }

    // Tenancy Check
    const targetStore = await prisma.store.findFirst({
        where: { id: store_id, company_id: session.user.companyId }
    })
    if (!targetStore) {
        return NextResponse.json({ error: 'Store not found or unauthorized' }, { status: 404 })
    }

    if (!staff_ids || !Array.isArray(staff_ids) || staff_ids.length === 0) {
        return NextResponse.json({ error: 'At least one staff member must be assigned to the report' }, { status: 400 })
    }

    // Verify all staff_ids are actually members of this store
    const validMemberships = await prisma.storeMember.findMany({
        where: { store_id, user_id: { in: staff_ids }, status: 'Active' },
        select: { user_id: true }
    })
    const validUserIds = validMemberships.map(m => m.user_id)
    const invalidIds = staff_ids.filter(id => !validUserIds.includes(id))
    if (invalidIds.length > 0) {
        return NextResponse.json({ error: `Some staff members are not assigned to this store: ${invalidIds.join(', ')}` }, { status: 400 })
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

    const targetDateStr = report_date ? String(report_date).split('T')[0] : dayjs().tz(TIMEZONE).format('YYYY-MM-DD')
    const dateString = targetDateStr
    const reportDateObj = new Date(`${targetDateStr}T00:00:00`)

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

            const store = targetStore
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
    if (!session?.user || (session.user.role !== 'Admin' && session.user.role !== 'Manager')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const storeIdsParam = searchParams.get('storeIds') // comma-separated list e.g. "id1,id2,id3"
    const storeId = searchParams.get('storeId')          // legacy single-store filter
    const storeIds = storeIdsParam ? storeIdsParam.split(',').filter(Boolean) : storeId ? [storeId] : []
    const userId = searchParams.get('userId')
    const startDateStr = searchParams.get('startDate')
    const endDateStr = searchParams.get('endDate')

    const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 20
    const page = searchParams.get('page') ? Number(searchParams.get('page')) : 1
    const skip = (page - 1) * limit
    const search = searchParams.get('search')
    const statusFilter = searchParams.get('status') // 'Verified' | 'Submitted' | 'Missing' | null

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
    const where: any = { deleted_at: null }

    if (allowedStoreIds) {
        const filtered = storeIds.length > 0 ? storeIds.filter(id => allowedStoreIds!.includes(id)) : allowedStoreIds
        if (filtered.length === 0) return NextResponse.json({ data: [], pagination: { total: 0, page: 1, totalPages: 0 } })
        where.store_id = filtered.length === 1 ? filtered[0] : { in: filtered }
    } else if (storeIds.length > 0) {
        where.store_id = storeIds.length === 1 ? storeIds[0] : { in: storeIds }
    }

    // Retrieve Store IDs associated with the requested User Filter
    let userFilterStoreIds: string[] | null = null;
    if (userId) {
        const userMemberships = await prisma.storeMember.findMany({
            where: { user_id: userId, status: 'Active' },
            select: { store_id: true }
        })
        userFilterStoreIds = userMemberships.map(m => m.store_id)
        
        // If the user belongs to no stores, return an empty table immediately.
        if (userFilterStoreIds.length === 0) {
            return NextResponse.json({ data: [], pagination: { total: 0, page: 1, totalPages: 0 } })
        }
    }

    // Attempting to calculate the *final* permitted Store IDs array by 
    // merging the Admin/Manager's allowedStoreIds with the userFilterStoreIds
    let finalStoreIds: string[] | null = null;

    if (allowedStoreIds && userFilterStoreIds) {
        // Intersection of both permission arrays
        finalStoreIds = allowedStoreIds.filter(id => userFilterStoreIds!.includes(id))
        // If intersection is empty, no overlaps exist.
        if (finalStoreIds.length === 0) {
            return NextResponse.json({ data: [], pagination: { total: 0, page: 1, totalPages: 0 } })
        }
    } else if (allowedStoreIds) {
        finalStoreIds = allowedStoreIds
    } else if (userFilterStoreIds) {
        finalStoreIds = userFilterStoreIds
    }

    // IF search is provided OR status is Verified/Submitted, use direct DB query (skip missing-report logic)
    if (search || (statusFilter && statusFilter !== 'Missing')) {
        if (statusFilter && statusFilter !== 'Missing') {
            where.status = statusFilter
        }
        if (finalStoreIds) {
            const allowed = storeIds.length > 0 ? storeIds.filter(id => finalStoreIds!.includes(id)) : finalStoreIds
            where.store_id = allowed.length === 1 ? allowed[0] : { in: allowed }
        } else if (storeIds.length > 0) {
            where.store_id = storeIds.length === 1 ? storeIds[0] : { in: storeIds }
        }
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

        const reportsWithNet = reports.map(r => ({
            ...r,
            net_cash: Number(r.cash_amount) - Number(r.expenses_amount || 0) - Number(r.payouts_amount || 0)
        }))

        return NextResponse.json({
            data: reportsWithNet,
            pagination: {
                total,
                page,
                totalPages: Math.ceil(total / limit)
            }
        })
    }

    // Otherwise, Generate Cross Product of Dates x Stores to reveal MISSING reports
    const SYSTEM_EPOCH = dayjs.tz('2026-03-01T00:00:00', TIMEZONE)
    const nowTz = dayjs().tz(TIMEZONE)
    
    const end = endDateStr ? dayjs.tz(`${endDateStr}T00:00:00`, TIMEZONE) : nowTz.startOf('day')
    let start = startDateStr ? dayjs.tz(`${startDateStr}T00:00:00`, TIMEZONE) : end.clone().subtract(29, 'day').startOf('day')

    if (start.isBefore(SYSTEM_EPOCH)) {
        start = SYSTEM_EPOCH
    }

    const days: string[] = [];
    for (let d = end; d.isAfter(start) || d.isSame(start, 'day'); d = d.subtract(1, 'day')) {
        if (d.isBefore(SYSTEM_EPOCH, 'day')) break;
        days.push(d.format('YYYY-MM-DD'));
    }

    const storesQuery: any = { status: 'Active' }
    if (finalStoreIds) {
        const allowed = storeIds.length > 0 ? storeIds.filter(id => finalStoreIds!.includes(id)) : finalStoreIds
        storesQuery.id = allowed.length === 0 ? 'NO_ACCESS' : allowed.length === 1 ? allowed[0] : { in: allowed }
    } else if (storeIds.length > 0) {
        storesQuery.id = storeIds.length === 1 ? storeIds[0] : { in: storeIds }
    }

    const stores = await prisma.store.findMany({ where: storesQuery, select: { id: true, name: true, city: true } })

    // 1. Fetch ALL reports in the range for these stores
    const reportsForRange = await prisma.dailyReport.findMany({
        where: {
            store_id: storesQuery.id,
            report_date: {
                gte: start.toDate(),
                lte: end.toDate()
            },
            deleted_at: null
        },
        include: {
            store: { select: { name: true, city: true } },
            submitted_by: { select: { name: true } },
            assignees: { select: { name: true, role: true } }
        }
    })

    const reportMap = new Map()
    reportsForRange.forEach(r => reportMap.set(`${r.store_id}_${r.report_date.toISOString().split('T')[0]}`, r))

    // 2. Build and FILTER all combinations
    const filteredCombinations: any[] = []
    for (const day of days) {
        const sortedStores = [...stores].sort((a, b) => a.name.localeCompare(b.name))
        for (const store of sortedStores) {
            const key = `${store.id}_${day}`
            const hasReport = reportMap.has(key)

            if (statusFilter === 'Missing') {
                if (!hasReport) {
                    filteredCombinations.push({
                        id: `missing-${key}`,
                        report_date: new Date(`${day}T00:00:00.000Z`),
                        store,
                        store_id: store.id,
                        submitted_by: null,
                        cash_amount: 0,
                        card_amount: 0,
                        total_amount: 0,
                        net_cash: 0,
                        status: 'Missing',
                    })
                }
            } else if (statusFilter) {
                // If a specific real status is requested (Verified/Submitted), but we are in this logic block,
                // it means search was not provided. We only include if report exists and matches status.
                if (hasReport) {
                    const r = reportMap.get(key)
                    if (r.status === statusFilter) {
                        filteredCombinations.push({
                            ...r,
                            net_cash: Number(r.cash_amount) - Number(r.expenses_amount || 0) - Number(r.payouts_amount || 0)
                        })
                    }
                }
            } else {
                // No status filter: include everything
                if (hasReport) {
                    const r = reportMap.get(key)
                    filteredCombinations.push({
                        ...r,
                        net_cash: Number(r.cash_amount) - Number(r.expenses_amount || 0) - Number(r.payouts_amount || 0)
                    })
                } else {
                    filteredCombinations.push({
                        id: `missing-${key}`,
                        report_date: new Date(`${day}T00:00:00.000Z`),
                        store,
                        store_id: store.id,
                        submitted_by: null,
                        cash_amount: 0,
                        card_amount: 0,
                        total_amount: 0,
                        net_cash: 0,
                        status: 'Missing',
                    })
                }
            }
        }
    }

    const totalCount = filteredCombinations.length
    const paginatedData = filteredCombinations.slice(skip, skip + limit)

    return NextResponse.json({
        data: paginatedData,
        pagination: {
            total: totalCount,
            page,
            totalPages: Math.ceil(totalCount / limit) || 1
        }
    })
}
