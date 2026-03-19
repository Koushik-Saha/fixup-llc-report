import prisma from '@/lib/prisma'

export async function evaluateReportForAnomalies(reportId: string) {
    try {
        const report = await prisma.dailyReport.findUnique({
            where: { id: reportId },
            include: { store: true }
        })

        if (!report) return

        const anomaliesToCreate: any[] = []

        // Rule 1: Severe Cash Discrepancy
        if (report.expected_cash !== null) {
            const expected = Number(report.expected_cash)
            const actual = Number(report.cash_amount)
            const diff = Math.abs(actual - expected)
            
            if (diff > 50 || (expected > 0 && diff > expected * 0.1)) {
                anomaliesToCreate.push({
                    report_id: report.id,
                    type: 'CASH_VARIANCE',
                    description: `Severe cash discrepancy detected. Expected: $${expected.toFixed(2)}, Actual: $${actual.toFixed(2)}, Variance: $${(actual - expected).toFixed(2)}.`,
                    severity: diff > 100 ? 'High' : 'Medium'
                })
            }
        }

        // Rule 2: High Expense Ratio
        const totalRev = Number(report.total_amount)
        const expenses = Number(report.expenses_amount)

        if (totalRev > 100 && expenses > totalRev * 0.3) {
            anomaliesToCreate.push({
                report_id: report.id,
                type: 'HIGH_EXPENSES',
                description: `Unusually high expense ratio. Expenses ($${expenses.toFixed(2)}) account for ${(expenses / totalRev * 100).toFixed(1)}% of total daily revenue ($${totalRev.toFixed(2)}).`,
                severity: expenses > totalRev * 0.5 ? 'High' : 'Medium'
            })
        }

        // Rule 3: Revenue Freefall (40%+ drop vs 30-day average)
        // Fetch last 30 reports for this store BEFORE today
        const pastReports = await prisma.dailyReport.findMany({
            where: {
                store_id: report.store_id,
                report_date: { lt: report.report_date }
            },
            orderBy: { report_date: 'desc' },
            take: 30,
            select: { total_amount: true }
        })

        if (pastReports.length >= 7) { // Need at least a week of data to establish a baseline
            const sum = pastReports.reduce((acc, r) => acc + Number(r.total_amount), 0)
            const avg = sum / pastReports.length

            if (avg > 200 && totalRev < avg * 0.6) {
                const dropPercent = ((avg - totalRev) / avg * 100).toFixed(1)
                anomaliesToCreate.push({
                    report_id: report.id,
                    type: 'REVENUE_DROP',
                    description: `Sudden revenue freefall detected. Today's revenue ($${totalRev.toFixed(2)}) is ${dropPercent}% lower than the store's ${pastReports.length}-day average ($${avg.toFixed(2)}).`,
                    severity: totalRev < avg * 0.4 ? 'High' : 'Medium'
                })
            }
        }

        // Insert anomalies if any
        if (anomaliesToCreate.length > 0) {
            // First clear any existing open anomalies for this report (useful if report is edited)
            await prisma.anomaly.deleteMany({
                where: { report_id: report.id, status: 'Open' }
            })

            await prisma.anomaly.createMany({
                data: anomaliesToCreate
            })
        }

    } catch (error) {
        console.error('Error in anomaly detection engine:', error)
    }
}
