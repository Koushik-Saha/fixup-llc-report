import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function test() {
    const reports = await prisma.dailyReport.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
            assignees: { select: { name: true } },
            store: { select: { name: true } }
        }
    })

    console.log(`Found ${reports.length} recent reports.`);
    for (const r of reports) {
        console.log(`- ID: ${r.id} | Date: ${r.report_date.toISOString()} | Store: ${r.store.name} | Status: ${r.status} | In: ${r.time_in} | Out: ${r.time_out}`);
        r.assignees.forEach(a => console.log(`  -> Assignee: ${a.name}`));
    }
}

test().catch(console.error).finally(() => prisma.$disconnect())
