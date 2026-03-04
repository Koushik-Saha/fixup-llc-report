import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'Staff') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const storeId = session.user.storeId
    if (!storeId) {
        return NextResponse.json({ error: 'No active store assigned' }, { status: 400 })
    }

    const body = await req.json()
    const { cash_amount, card_amount, notes, imageUrls } = body

    if (cash_amount === undefined || card_amount === undefined) {
        return NextResponse.json({ error: 'Cash and Card amounts are required' }, { status: 400 })
    }

    const total = Number(cash_amount) + Number(card_amount)

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Check if report already exists for today
    const existingReport = await prisma.dailyReport.findUnique({
        where: {
            store_id_report_date: {
                store_id: storeId,
                report_date: today
            }
        }
    })

    if (existingReport) {
        return NextResponse.json({ error: 'A report for today has already been submitted for this store.' }, { status: 400 })
    }

    try {
        // We use a transaction to create the report and the images together
        const report = await prisma.$transaction(async (tx: any) => {
            const newReport = await tx.dailyReport.create({
                data: {
                    store_id: storeId,
                    report_date: today,
                    submitted_by_user_id: session.user.id,
                    cash_amount: Number(cash_amount),
                    card_amount: Number(card_amount),
                    total_amount: total,
                    notes: notes || null,
                    status: 'Submitted'
                }
            })

            if (imageUrls && imageUrls.length > 0) {
                await tx.reportImage.createMany({
                    data: imageUrls.map((url: string) => ({
                        report_id: newReport.id,
                        image_url: url
                    }))
                })
            }

            return newReport
        })

        return NextResponse.json(report)
    } catch (err: any) {
        console.error('Error creating report:', err)
        // To handle unique constraint technically just in case of race condition
        if (err.code === 'P2002') {
            return NextResponse.json({ error: 'Report already exists for today' }, { status: 400 })
        }
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'Staff') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const storeId = session.user.storeId
    if (!storeId) {
        return NextResponse.json({ error: 'No active store assigned' }, { status: 400 })
    }

    const { searchParams } = new URL(req.url)
    const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 30 // default 30 days

    const reports = await prisma.dailyReport.findMany({
        where: { store_id: storeId },
        orderBy: { report_date: 'desc' },
        take: limit,
        select: {
            id: true,
            report_date: true,
            total_amount: true,
            status: true,
            staff_edit_count: true,
        }
    })

    return NextResponse.json(reports)
}
