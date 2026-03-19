import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.storeId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const inventory = await prisma.inventoryItem.findMany({
            where: { store_id: session.user.storeId },
            orderBy: [{ category: 'asc' }, { name: 'asc' }]
        })

        return NextResponse.json({ success: true, data: inventory })
    } catch (error: any) {
        console.error('Failed to fetch staff inventory:', error)
        return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
    }
}
