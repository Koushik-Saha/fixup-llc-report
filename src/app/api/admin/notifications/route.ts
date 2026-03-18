import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import prisma from "@/lib/prisma"
import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
import timezone from "dayjs/plugin/timezone"

dayjs.extend(utc)
dayjs.extend(timezone)

const TIMEZONE = "America/Los_Angeles"

// GET — list notifications (latest 50)
export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user.role !== 'Admin' && session.user.role !== 'Manager')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const notifications = await prisma.notification.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50
    })
    const unreadCount = await prisma.notification.count({ where: { is_read: false } })

    return NextResponse.json({ notifications, unreadCount })
}

// POST — trigger notification generation (check missing reports + unverified)
export async function POST() {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'Admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = dayjs().tz(TIMEZONE)
    const todayStr = now.format('YYYY-MM-DD')
    const todayObj = new Date(`${todayStr}T00:00:00.000Z`)

    const activeStores = await prisma.store.findMany({
        where: { status: 'Active' },
        select: { id: true, name: true }
    })

    const todaysReports = await prisma.dailyReport.findMany({
        where: { report_date: todayObj },
        select: { store_id: true }
    })

    const reportedIds = new Set(todaysReports.map(r => r.store_id))
    const missingStores = activeStores.filter(s => !reportedIds.has(s.id))

    const created = []

    // Create one notification per missing store (if not already created today)
    for (const store of missingStores) {
        const existing = await prisma.notification.findFirst({
            where: {
                type: 'MISSING_REPORT',
                store_id: store.id,
                createdAt: { gte: todayObj }
            }
        })
        if (!existing) {
            const n = await prisma.notification.create({
                data: {
                    type: 'MISSING_REPORT',
                    title: `Missing Report — ${store.name}`,
                    message: `${store.name} has not submitted a daily report for ${now.format('MMMM D, YYYY')}.`,
                    store_id: store.id
                }
            })
            created.push(n)
        }
    }

    // Unverified report count alert
    const unverifiedCount = await prisma.dailyReport.count({ where: { status: 'Submitted' } })
    if (unverifiedCount > 0) {
        const existing = await prisma.notification.findFirst({
            where: { type: 'UNVERIFIED_REPORT', createdAt: { gte: todayObj } }
        })
        if (!existing) {
            const n = await prisma.notification.create({
                data: {
                    type: 'UNVERIFIED_REPORT',
                    title: `${unverifiedCount} Reports Awaiting Verification`,
                    message: `There are ${unverifiedCount} submitted reports that have not been verified yet.`
                }
            })
            created.push(n)
        }
    }

    // Payroll reminder — 1st or 15th of month
    const dayOfMonth = now.date()
    if (dayOfMonth === 1 || dayOfMonth === 15) {
        const existing = await prisma.notification.findFirst({
            where: { type: 'PAYROLL_DUE', createdAt: { gte: todayObj } }
        })
        if (!existing) {
            const n = await prisma.notification.create({
                data: {
                    type: 'PAYROLL_DUE',
                    title: 'Payroll Review Reminder',
                    message: `Today is the ${dayOfMonth === 1 ? '1st' : '15th'} — please review and process payroll for staff.`
                }
            })
            created.push(n)
        }
    }

    return NextResponse.json({ created: created.length, notifications: created })
}

// PATCH — mark all as read
export async function PATCH() {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user.role !== 'Admin' && session.user.role !== 'Manager')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await prisma.notification.updateMany({
        where: { is_read: false },
        data: { is_read: true }
    })

    return NextResponse.json({ success: true })
}
