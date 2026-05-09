import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { getManagerPermissions } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

async function isManagerAuthorizedForStore(managerId: string, storeId: string): Promise<boolean> {
    const membership = await prisma.storeMember.findFirst({
        where: { user_id: managerId, store_id: storeId, status: 'Active' }
    })
    return !!membership
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions)
    if (!session?.user || !['Admin', 'Manager'].includes(session.user.role)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const id = (await params).id

    if (session.user.role === 'Manager') {
        const [perms, authorized] = await Promise.all([
            getManagerPermissions(session.user.companyId),
            isManagerAuthorizedForStore(session.user.id, id)
        ])
        if (!perms.stores.view) return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
        if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const store = await prisma.store.findFirst({
        where: { id, company_id: session.user.companyId }
    })
    if (!store) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json(store)
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions)
    if (!session?.user || !['Admin', 'Manager'].includes(session.user.role)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const id = (await params).id

    if (session.user.role === 'Manager') {
        const [perms, authorized] = await Promise.all([
            getManagerPermissions(session.user.companyId),
            isManagerAuthorizedForStore(session.user.id, id)
        ])
        if (!perms.stores.edit) return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
        if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { name, address, city, state, zip_code, block, max_members, status, operating_hours } = body

    const existingStore = await prisma.store.findFirst({
        where: { id, company_id: session.user.companyId }
    })
    if (!existingStore) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Managers cannot change store status
    const updateData: any = { name, address, city, state, zip_code, block: block || null, max_members: Number(max_members), operating_hours }
    if (session.user.role !== 'Manager') {
        updateData.status = status
    }

    const store = await prisma.store.update({
        where: { id },
        data: updateData
    })

    await prisma.systemLog.create({
        data: {
            user_id: session.user.id,
            action: 'STORE_UPDATE',
            entity: 'Store',
            entity_id: store.id,
            details: JSON.stringify({ changes: { name, address, city, state, zip_code, block, max_members, status } })
        }
    })

    return NextResponse.json(store)
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions)
    if (session?.user?.role !== 'Admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const id = (await params).id

    try {
        const existingStore = await prisma.store.findFirst({
            where: { id, company_id: session.user.companyId }
        })
        if (!existingStore) return NextResponse.json({ error: 'Not found' }, { status: 404 })

        const store = await prisma.store.update({
            where: { id },
            data: { status: 'Inactive' }
        })

        await prisma.systemLog.create({
            data: {
                user_id: session.user.id,
                action: 'STORE_DEACTIVATE',
                entity: 'Store',
                entity_id: store.id,
                details: 'Store soft deleted (deactivated)'
            }
        })

        return NextResponse.json({ success: true })
    } catch (err: any) {
        return NextResponse.json({ error: 'Deactivation failed' }, { status: 400 })
    }
}
