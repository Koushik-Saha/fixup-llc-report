import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log("Starting assignees migration...")

    const reports = await prisma.dailyReport.findMany()
    console.log(`Found ${reports.length} reports to process.`)

    let migrated = 0

    for (const report of reports) {
        // Connect the single submitted_by user into the many-to-many list
        await prisma.dailyReport.update({
            where: { id: report.id },
            data: {
                assignees: {
                    connect: { id: report.submitted_by_user_id }
                }
            }
        })
        migrated++
        if (migrated % 50 === 0) {
            console.log(`Migrated ${migrated} / ${reports.length}`)
        }
    }

    console.log(`✅ Migration complete. Sucessfully ported ${migrated} reports to the new assignees structure.`)
}

main()
    .catch((e) => {
        console.error("Migration failed:", e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
