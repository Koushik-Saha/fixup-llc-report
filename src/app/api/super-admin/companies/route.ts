import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export const dynamic = 'force-dynamic'

export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'SuperAdmin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const companies = await prisma.company.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
            _count: {
                select: { stores: true, users: true }
            }
        }
    })

    return NextResponse.json(companies)
}
