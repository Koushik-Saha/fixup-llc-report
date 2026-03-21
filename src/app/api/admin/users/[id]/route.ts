import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions)
    if (session?.user?.role !== 'Admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const id = (await params).id

    const user = await prisma.user.findUnique({
        where: { id },
        select: { id: true, name: true, email: true, role: true, status: true, pay_type: true, base_salary: true, tax_classification: true, tax_id: true }
    })
    if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json(user)
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions)
    if (session?.user?.role !== 'Admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const id = (await params).id
    const body = await req.json()
    const { name, email, role, status, pay_type, password, base_salary, tax_classification, tax_id } = body

    const updateData: any = { name, email, role, status, pay_type }
    if (tax_classification) updateData.tax_classification = tax_classification
    if (tax_id !== undefined) updateData.tax_id = tax_id
    if (base_salary !== undefined) {
        updateData.base_salary = Number(base_salary)
    }

    if (password) {
        updateData.password_hash = await bcrypt.hash(password, 10)
    }

    try {
        const user = await prisma.user.update({
            where: { id },
            data: updateData
        })

        await prisma.systemLog.create({
            data: {
                user_id: session.user.id,
                action: 'USER_UPDATE',
                entity: 'User',
                entity_id: user.id,
                details: JSON.stringify({ changes: updateData })
            }
        })

        return NextResponse.json({ id: user.id, name: user.name, email: user.email })
    } catch (err: any) {
        return NextResponse.json({ error: 'Update failed' }, { status: 400 })
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions)
    if (session?.user?.role !== 'Admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const id = (await params).id

    try {
        const user = await prisma.user.update({
            where: { id },
            data: { status: 'Inactive' }
        })

        await prisma.systemLog.create({
            data: {
                user_id: session.user.id,
                action: 'USER_DEACTIVATE',
                entity: 'User',
                entity_id: user.id,
                details: 'User soft deleted (deactivated)'
            }
        })

        return NextResponse.json({ success: true })
    } catch (err: any) {
        return NextResponse.json({ error: 'Deactivation failed' }, { status: 400 })
    }
}
