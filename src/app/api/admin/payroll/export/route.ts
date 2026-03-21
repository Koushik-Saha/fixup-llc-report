import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'Admin') {
        return new NextResponse('Unauthorized', { status: 401 })
    }

    try {
        const { searchParams } = new URL(req.url)
        const year = searchParams.get('year') || new Date().getFullYear().toString()
        const format = searchParams.get('format') || 'csv'

        // Fetch all users with their payroll records for the specified year
        const users = await prisma.user.findMany({
            where: {
                payroll_records: {
                    some: {
                        month_year: { startsWith: year }
                    }
                }
            },
            include: {
                payroll_records: {
                    where: { month_year: { startsWith: year } }
                }
            },
            orderBy: { name: 'asc' }
        })

        const exportData = users.map(user => {
            const totalGross = user.payroll_records.reduce((sum, r) => sum + Number(r.base_salary), 0)
            const totalPaid = user.payroll_records.reduce((sum, r) => sum + Number(r.total_paid), 0)
            
            // Estimated Flat Tax Calculations
            let estFedTax = 0
            let estStateTax = 0
            
            if (user.tax_classification === 'W-2') {
                estFedTax = totalGross * 0.15 // 15% estimated federal
                estStateTax = totalGross * 0.05 // 5% estimated state
            } else if (user.tax_classification === '1099') {
                // 1099 are typically responsible for their own taxes, but let's show an estimate of self-employment tax
                estFedTax = totalGross * 0.153 // 15.3% SE tax
                estStateTax = 0
            }

            return {
                Name: user.name,
                Email: user.email,
                Role: user.role,
                TaxClassification: user.tax_classification,
                TaxID: user.tax_id ? '***-**-' + user.tax_id.slice(-4) : 'N/A', // Masked
                TotalGross: totalGross.toFixed(2),
                TotalPaid: totalPaid.toFixed(2),
                EstimatedFedTax: estFedTax.toFixed(2),
                EstimatedStateTax: estStateTax.toFixed(2),
                EstimatedNet: (totalGross - estFedTax - estStateTax).toFixed(2)
            }
        })

        if (format === 'csv') {
            if (exportData.length === 0) {
                return new NextResponse('No payroll records found for the specified year', { status: 404 })
            }

            const header = Object.keys(exportData[0]).join(',')
            const rows = exportData.map(obj => Object.values(obj).map(val => `"${val}"`).join(','))
            const csvText = [header, ...rows].join('\n')

            const response = new NextResponse(csvText, { status: 200 })
            response.headers.set('Content-Type', 'text/csv; charset=utf-8')
            response.headers.set('Content-Disposition', `attachment; filename="payroll_tax_export_${year}.csv"`)
            return response
        }

        // Just return JSON if not formatted or formatted as json
        return NextResponse.json({ year, records: exportData })

    } catch (error) {
        console.error('Error exporting payroll:', error)
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}
