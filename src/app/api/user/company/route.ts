import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) return NextResponse.json(null)

    const company = await prisma.company.findUnique({
        where: { id: session.user.companyId },
        select: { name: true, logo_url: true, primary_color: true }
    })
    return NextResponse.json(company)
}
