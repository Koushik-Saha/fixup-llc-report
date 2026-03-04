import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export const dynamic = 'force-dynamic'

export async function PUT(req: Request, { params }: { params: Promise<{ member_id: string }> }) {
    const session = await getServerSession(authOptions)
    if (session?.user?.role !== 'Admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const member_id = (await params).member_id // This is member ID actually, let's parse from body if needed or we change URL pattern.
    // Wait, if url is /api/admin/stores/[id]/members/[memberId]/route.ts
    const body = await req.json()
    const { status, is_reporter } = body

    const member = await prisma.storeMember.update({
        where: { id: member_id }, // We will use this file for member detail
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
