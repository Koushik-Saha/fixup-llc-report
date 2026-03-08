import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function test() {
    const todayStr = new Date().toISOString().split('T')[0]

    // Look for a report specifically made today
    const reports = await prisma.dailyReport.findMany({
        where: {
            report_date: new Date(`${todayStr}T00:00:00.000Z`)
        },
        include: {
            assignees: true,
            submitted_by: true
        }
    })

    console.log(`Found ${reports.length} reports for today.`)
    for (const r of reports) {
        console.log(`\nReport ID: ${r.id}`)
        console.log(`Submitted By: ${r.submitted_by.name} (${r.submitted_by.role})`)
        console.log(`Time In/Out: ${r.time_in} to ${r.time_out}`)
        console.log(`Assignees Count: ${r.assignees?.length}`)
        r.assignees?.forEach(a => console.log(`  - ${a.name} (${a.role})`))
    }
}

test().catch(e => console.error(e)).finally(() => prisma.$disconnect())
