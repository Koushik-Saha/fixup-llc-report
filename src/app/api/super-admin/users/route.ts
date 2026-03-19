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

    const users = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
            company: { select: { name: true } }
        }
    })

    return NextResponse.json(users)
}
