import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions)
    if (session?.user?.role !== 'Admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const id = (await params).id

    const report = await prisma.dailyReport.findUnique({
        where: { id },
        include: {
            images: true,
            store: { select: { name: true, city: true, state: true } },
            submitted_by: { select: { name: true, email: true } }
        }
    })

    if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json(report)
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions)
    if (session?.user?.role !== 'Admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const id = (await params).id

    const body = await req.json()
    const { status } = body

    const report = await prisma.dailyReport.update({
        where: { id },
        data: { status }
    })

    return NextResponse.json(report)
}
