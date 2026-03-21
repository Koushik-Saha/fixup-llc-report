import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function GET(req: Request, { params }: { params: Promise<{ reportId: string }> }) {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user.role !== 'Admin' && session.user.role !== 'Manager')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { reportId } = await params
        
        const report = await prisma.categoryReport.findUnique({
            where: { id: reportId },
            include: {
                category: true,
                submitted_by: {
                    select: { name: true, role: true, email: true }
                },
                images: true
            }
        })

        if (!report) {
            return NextResponse.json({ error: 'Report not found' }, { status: 404 })
        }

        return NextResponse.json(report, { status: 200 })
    } catch (error: any) {
        console.error('Error fetching single category report:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
