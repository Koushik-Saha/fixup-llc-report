import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user.role !== 'Admin' && session.user.role !== 'Manager')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await req.json()
        const {
            category_id,
            report_date,
            cash_amount,
            card_amount,
            expenses_amount,
            payouts_amount,
            notes,
            imageUrls
        } = body

        if (!category_id) {
            return NextResponse.json({ error: 'Category ID is required' }, { status: 400 })
        }
        if (cash_amount === undefined || card_amount === undefined) {
            return NextResponse.json({ error: 'Cash and Card amounts are required' }, { status: 400 })
        }

        const reportDateObj = new Date(report_date)
        if (isNaN(reportDateObj.getTime())) {
            return NextResponse.json({ error: 'Invalid report date' }, { status: 400 })
        }

        const netCash = Number(cash_amount) - (Number(expenses_amount) || 0) - (Number(payouts_amount) || 0)
        const total = Number(cash_amount) + Number(card_amount)

        // Prevent exact duplicates for a category on the identical date
        const existing = await prisma.categoryReport.findUnique({
            where: {
                category_id_report_date: {
                    category_id,
                    report_date: reportDateObj
                }
            }
        })
        if (existing) {
            return NextResponse.json({ error: 'A report for this Category already exists on this date.' }, { status: 400 })
        }

        const transaction = await prisma.$transaction(async (tx) => {
            const report = await tx.categoryReport.create({
                data: {
                    category_id: category_id,
                    report_date: reportDateObj,
                    submitted_by_user_id: session.user.id,
                    cash_amount: Number(cash_amount),
                    card_amount: Number(card_amount),
                    expenses_amount: Number(expenses_amount) || 0,
                    payouts_amount: Number(payouts_amount) || 0,
                    total_amount: total,
                    notes: notes || null,
                    status: 'Submitted'
                }
            })

            if (imageUrls && imageUrls.length > 0) {
                await tx.categoryReportImage.createMany({
                    data: imageUrls.map((url: string) => ({
                        category_report_id: report.id,
                        image_url: url
                    }))
                })
            }

            await tx.systemLog.create({
                data: {
                    user_id: session.user.id,
                    action: 'CREATE_CATEGORY_REPORT',
                    entity: 'CategoryReport',
                    entity_id: report.id,
                    details: `Created category report for Category ${category_id} on ${report_date}`
                }
            })

            return report
        })

        return NextResponse.json(transaction, { status: 201 })
    } catch (error: any) {
        console.error('Error creating category report:', error)
        return NextResponse.json({ error: error.message || 'Internal server error while creating Category Report' }, { status: 500 })
    }
}
