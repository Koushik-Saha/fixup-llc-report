import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (session?.user?.role !== 'Admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const limit = Number(searchParams.get('limit')) || 50
    const page = Number(searchParams.get('page')) || 1

    const logs = await prisma.errorLog.findMany({
        where: { company_id: session.user.companyId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
        include: {
            user: { select: { name: true, email: true } },
        }
    })

    const total = await prisma.errorLog.count({
        where: { company_id: session.user.companyId }
    })

    return NextResponse.json({ logs, total, page, limit })
}
