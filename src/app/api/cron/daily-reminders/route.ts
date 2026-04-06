import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { sendMissingReportReminder } from '@/lib/email'

dayjs.extend(utc)
dayjs.extend(timezone)

const TIMEZONE = 'America/Los_Angeles'

// Vercel CRON or external generic CRON hook
export async function GET(req: Request) {
    // 1. Verify authorization (Bearer token or Vercel CRON secret)
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    // In local dev, we might not have a cron secret, so allow bypass or strict check
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const nowTz = dayjs().tz(TIMEZONE)
        const yesterdayStr = nowTz.subtract(1, 'day').format('YYYY-MM-DD')
        const yesterdayObj = new Date(`${yesterdayStr}T00:00:00.000Z`)

        // Fetch all active stores
        const stores = await prisma.store.findMany({
            where: { status: 'Active' },
            select: {
                id: true,
                name: true,
                members: {
                    where: { 
                        status: 'Active',
                        user: { status: 'Active', role: 'Staff' }
                    },
                    select: {
                        user: { select: { id: true, name: true, email: true } }
                    }
                }
            }
        })

        let emailsSent = 0
        let logs = []

        // Iterate through stores
        for (const store of stores) {
            // Check if there is an existing report for yesterday
            const existingReport = await prisma.dailyReport.findUnique({
                where: {
                    store_id_report_date: {
                        store_id: store.id,
                        report_date: yesterdayObj
                    }
                }
            })

            // If a report is genuinely missing
            if (!existingReport && store.members.length > 0) {
                logs.push(`Missing report for ${store.name}. Messaging ${store.members.length} active staff.`)
                
                for (const member of store.members) {
                    const { email, name } = member.user
                    await sendMissingReportReminder(email, name, store.name, yesterdayStr)
                    emailsSent++
                }
            }
        }

        return NextResponse.json({
            success: true,
            targetDate: yesterdayStr,
            storesChecked: stores.length,
            missingReportsFound: logs.length,
            emailsDispatched: emailsSent,
            logs
        })

    } catch (error: any) {
        console.error('Error dispatching daily reminders:', error)
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 })
    }
}
