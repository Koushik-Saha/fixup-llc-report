import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { Resend } from 'resend'

// Tell Next.js to always execute this function on request, without caching
export const dynamic = 'force-dynamic'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM_EMAIL = process.env.SMTP_FROM_EMAIL || 'noreply@c5k.co'
const FROM_NAME = process.env.SMTP_FROM_NAME || 'C5K Platform'

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
    try {
        // Optional Vercel Cron Security: Ensure Request is authorized
        const authHeader = req.headers.get('authorization');
        if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const now = new Date()
        const lastWeek = new Date(now)
        lastWeek.setDate(lastWeek.getDate() - 7)

        // 1. Fetch submitted & verified reports over the final 7 days
        const reports = await prisma.dailyReport.findMany({
            where: {
                report_date: {
                    gte: lastWeek,
                    lte: now
                },
                status: { in: ['Submitted', 'Verified'] },
                deleted_at: null
            },
            include: {
                assignees: { select: { id: true, name: true, role: true, pay_type: true } },
                store: { select: { name: true } }
            }
        })

        if (reports.length === 0) {
            return NextResponse.json({ message: 'No reports found for the last 7 days.' })
        }

        // 2. Aggregate hours per user
        const userAggregates = new Map<string, any>()

        for (const report of reports) {
            const duration = calculateDuration(report.time_in, report.time_out)

            for (const user of report.assignees) {
                if (!userAggregates.has(user.id)) {
                    userAggregates.set(user.id, {
                        name: user.name,
                        role: user.role,
                        pay_type: user.pay_type,
                        shifts_count: 0,
                        total_hours: 0,
                    })
                }

                const agg = userAggregates.get(user.id)
                agg.shifts_count += 1
                agg.total_hours += duration
            }
        }

        // 3. Sort by most hours
        const results = Array.from(userAggregates.values()).sort((a, b) => b.total_hours - a.total_hours)

        // 4. Generate HTML Table
        const rowsHtml = results.map(u => `
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>${u.name}</strong><br><span style="font-size: 12px; color: #666;">${u.role}</span></td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">${u.pay_type}</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">${u.shifts_count}</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right; color: #2563eb; font-weight: bold;">${u.total_hours.toFixed(2)} hrs</td>
            </tr>
        `).join('')

        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                <h2 style="color: #1e3a8a;">Weekly Staff Hours Report</h2>
                <p>Hello Admin,</p>
                <p>Here is a summary of the verified hours tracked over the last 7 days (${lastWeek.toISOString().split('T')[0]} to ${now.toISOString().split('T')[0]}):</p>
                
                <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                    <thead style="background-color: #f3f4f6;">
                        <tr>
                            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Staff</th>
                            <th style="padding: 10px; text-align: center; border-bottom: 2px solid #ddd;">Pay Type</th>
                            <th style="padding: 10px; text-align: center; border-bottom: 2px solid #ddd;">Shifts</th>
                            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Total Hours</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
                <br>
                <p style="font-size: 12px; color: #666;">This is an automated report generated by the C5K Platform system.</p>
            </div>
        `

        // 5. Query all Admins to receive the email
        const admins = await prisma.user.findMany({
            where: { role: 'Admin', status: 'Active' },
            select: { email: true }
        })

        const adminEmails = admins.map(a => a.email).filter(e => e !== 'koushik@freedomshippingllc.com')

        if (adminEmails.length === 0) {
             return NextResponse.json({ message: 'No valid admin emails found to send to.' })
        }

        // 6. Send the bulk email
        const { data, error } = await resend.emails.send({
            from: `${FROM_NAME} <${FROM_EMAIL}>`,
            to: adminEmails,
            subject: '🕰️ Weekly Staff Hours Report',
            html: html,
        });

        if (error) {
            console.error('Resend Error:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, deliveredTo: adminEmails, recordsProcessed: results.length })

    } catch (e: any) {
        console.error('Weekly Hours Cron Error:', e)
        return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 })
    }
}
