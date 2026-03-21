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

    try {
        const totalCompanies = await prisma.company.count()
        const totalStores = await prisma.store.count()
        const totalUsers = await prisma.user.count()

        return NextResponse.json({
            totalCompanies,
            totalStores,
            totalUsers
        })
    } catch (error) {
        console.error('Super admin dashboard error:', error)
        return NextResponse.json({ error: 'Failed to fetch platform metrics' }, { status: 500 })
    }
}
