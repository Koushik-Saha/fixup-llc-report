import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function test() {
    const startDateStr = "2026-03-01"
    const endDateStr = "2026-03-07"

    const where: any = {
        report_date: {
            gte: new Date(`${startDateStr}T00:00:00.000Z`),
            lte: new Date(`${endDateStr}T23:59:59.999Z`)
        }
    }

    const reports = await prisma.dailyReport.findMany({
        where,
        include: {
            assignees: { select: { id: true, name: true, role: true, base_salary: true } },
            store: { select: { name: true } }
        }
    })

    console.log(`Found ${reports.length} valid reports in timeframe.`);
    for (const r of reports) {
        console.log(`- ${r.report_date.toISOString()} | Store: ${r.store.name} | Status: ${r.status} | In: ${r.time_in} | Out: ${r.time_out}`);
        r.assignees.forEach(a => console.log(`  -> Assignee: ${a.name}`));
    }
}

test().catch(console.error).finally(() => prisma.$disconnect())
