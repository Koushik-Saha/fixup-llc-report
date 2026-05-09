import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import prisma from '@/lib/prisma'
import {
    DEFAULT_MANAGER_PERMISSIONS, getManagerPermissions,
    DEFAULT_STAFF_PERMISSIONS, getStaffPermissions
} from '@/lib/permissions'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user || !['Admin', 'Manager'].includes(session.user.role)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [manager, staff] = await Promise.all([
        getManagerPermissions(session.user.companyId),
        getStaffPermissions(session.user.companyId)
    ])
    return NextResponse.json({ manager, staff })
}

export async function PUT(req: Request) {
    const session = await getServerSession(authOptions)
    if (session?.user?.role !== 'Admin') {
        return NextResponse.json({ error: 'Only admins can update permissions' }, { status: 403 })
    }

    const body = await req.json()
    const { role, config } = body

    if (!['Manager', 'Staff'].includes(role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    let merged: any
    if (role === 'Manager') {
        merged = {
            users: { ...DEFAULT_MANAGER_PERMISSIONS.users, ...config.users },
            expenses: { ...DEFAULT_MANAGER_PERMISSIONS.expenses, ...config.expenses },
            stores: { ...DEFAULT_MANAGER_PERMISSIONS.stores, ...config.stores },
            reports: { ...DEFAULT_MANAGER_PERMISSIONS.reports, ...config.reports },
            schedule: { ...DEFAULT_MANAGER_PERMISSIONS.schedule, ...config.schedule },
        }
    } else {
        merged = {
            reports: { ...DEFAULT_STAFF_PERMISSIONS.reports, ...config.reports },
            schedule: { ...DEFAULT_STAFF_PERMISSIONS.schedule, ...config.schedule },
            monthly_report: { ...DEFAULT_STAFF_PERMISSIONS.monthly_report, ...config.monthly_report },
        }
    }

    await prisma.permissionConfig.upsert({
        where: { company_id_role: { company_id: session.user.companyId, role } },
        create: { company_id: session.user.companyId, role, config: merged },
        update: { config: merged }
    })

    await prisma.systemLog.create({
        data: {
            user_id: session.user.id,
            action: 'PERMISSION_UPDATE',
            entity: 'PermissionConfig',
            entity_id: session.user.companyId,
            details: JSON.stringify({ role, config: merged })
        }
    })

    return NextResponse.json({ success: true, config: merged })
}
