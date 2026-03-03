import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const report_id = (await params).id

    const report = await prisma.dailyReport.findUnique({
        where: { id: report_id },
        include: {
            images: true,
            store: { select: { name: true, city: true, state: true } },
            submitted_by: { select: { name: true, email: true } }
        }
    })

    if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // If staff, verify accessing their own store's report
    if (session.user.role === 'Staff' && session.user.storeId !== report.store_id) {
        return NextResponse.json({ error: 'Unauthorized to view this report' }, { status: 403 })
    }

    return NextResponse.json(report)
}
