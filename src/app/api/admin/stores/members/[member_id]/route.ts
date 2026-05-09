import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { getManagerPermissions } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

async function isManagerAuthorizedForMember(managerId: string, memberId: string): Promise<boolean> {
    const member = await prisma.storeMember.findUnique({
        where: { id: memberId },
        select: { store_id: true }
    })
    if (!member) return false
    const managerMembership = await prisma.storeMember.findFirst({
        where: { user_id: managerId, store_id: member.store_id, status: 'Active' }
    })
    return !!managerMembership
}

export async function PUT(req: Request, { params }: { params: Promise<{ member_id: string }> }) {
    const session = await getServerSession(authOptions)
    if (!session?.user || !['Admin', 'Manager'].includes(session.user.role)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const member_id = (await params).member_id

    if (session.user.role === 'Manager') {
        const [perms, authorized] = await Promise.all([
            getManagerPermissions(session.user.companyId),
            isManagerAuthorizedForMember(session.user.id, member_id)
        ])
        if (!perms.stores.manage_members) return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
        if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { status, is_reporter } = body

    const member = await prisma.storeMember.update({
        where: { id: member_id },
        data: { status, is_reporter }
    })

    await prisma.systemLog.create({
        data: {
            user_id: session.user.id,
            action: 'MEMBER_STATUS_UPDATE',
            entity: 'StoreMember',
            entity_id: member.id,
            details: JSON.stringify({ status, is_reporter })
        }
    })

    return NextResponse.json(member)
}

export async function DELETE(req: Request, { params }: { params: Promise<{ member_id: string }> }) {
    const session = await getServerSession(authOptions)
    if (!session?.user || !['Admin', 'Manager'].includes(session.user.role)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const member_id = (await params).member_id

    if (session.user.role === 'Manager') {
        const [perms, authorized] = await Promise.all([
            getManagerPermissions(session.user.companyId),
            isManagerAuthorizedForMember(session.user.id, member_id)
        ])
        if (!perms.stores.manage_members) return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
        if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const member = await prisma.storeMember.delete({
        where: { id: member_id }
    })

    await prisma.systemLog.create({
        data: {
            user_id: session.user.id,
            action: 'MEMBER_REMOVE',
            entity: 'StoreMember',
            entity_id: member_id,
            details: JSON.stringify({ store_id: member.store_id, user_email: member.user_id })
        }
    })

    return NextResponse.json({ success: true })
}
