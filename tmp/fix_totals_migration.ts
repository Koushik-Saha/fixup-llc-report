import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('--- Starting DailyReport Totals Migration ---')
    
    const reports = await prisma.dailyReport.findMany({
        where: {
            deleted_at: null
        },
        select: {
            id: true,
            report_date: true,
            cash_amount: true,
            card_amount: true,
            total_amount: true
        }
    })

    console.log(`Found ${reports.length} reports to check.`)

    let updatedCount = 0

    for (const report of reports) {
        const cash = Number(report.cash_amount)
        const card = Number(report.card_amount)
        const correctTotal = cash + card
        
        // Only update if current total is incorrect
        if (Number(report.total_amount).toFixed(2) !== correctTotal.toFixed(2)) {
            console.log(`Fixing report ${report.id} (${report.report_date.toISOString().split('T')[0]}): ${report.total_amount} -> ${correctTotal}`)
            
            await prisma.dailyReport.update({
                where: { id: report.id },
                data: {
                    total_amount: correctTotal
                }
            })
            updatedCount++
        }
    }

    console.log(`--- Finished. Updated ${updatedCount} reports. ---`)
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
