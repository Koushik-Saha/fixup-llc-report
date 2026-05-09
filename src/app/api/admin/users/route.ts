import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import bcrypt from 'bcryptjs'
import { getManagerPermissions } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user || !['Admin', 'SuperAdmin', 'Manager'].includes(session.user.role)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role === 'Manager') {
        const perms = await getManagerPermissions(session.user.companyId)
        if (!perms.users.view) return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const storeId = searchParams.get('storeId')

    if (storeId) {
        // Return ONLY users who are active members of this specific store
        const storeMembers = await prisma.storeMember.findMany({
            where: {
                store_id: storeId,
                status: 'Active',
                user: {
                    company_id: session.user.companyId,
                    ...(status ? { status } : {})
                }
            },
            select: {
                user: {
                    select: { id: true, name: true, role: true, status: true, pay_type: true, base_salary: true }
                }
            }
        })
        return NextResponse.json(storeMembers.map(m => m.user))
    }

    // Managers can only see Staff users in their own stores
    if (session.user.role === 'Manager') {
        const managerStores = await prisma.storeMember.findMany({
            where: { user_id: session.user.id, status: 'Active' },
            select: { store_id: true }
        })
        const managerStoreIds = managerStores.map((m: any) => m.store_id)

        const memberWhere: any = {
            store_id: { in: managerStoreIds },
            status: 'Active',
            user: {
                company_id: session.user.companyId,
                role: 'Staff',
                email: { not: 'koushik@freedomshippingllc.com' },
                ...(status ? { status } : {})
            }
        }

        const storeMembers = await prisma.storeMember.findMany({
            where: memberWhere,
            select: {
                user: {
                    select: {
                        id: true, name: true, email: true, role: true, status: true,
                        pay_type: true, base_salary: true, createdAt: true,
                        storeMembers: {
                            where: { status: 'Active' },
                            include: { store: { select: { name: true } } }
                        }
                    }
                }
            }
        })

        // Deduplicate users (a user may be in multiple stores)
        const seen = new Set<string>()
        const users = storeMembers
            .map((m: any) => m.user)
            .filter((u: any) => { if (seen.has(u.id)) return false; seen.add(u.id); return true })
            .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

        return NextResponse.json(users)
    }

    const where: any = { company_id: session.user.companyId, email: { not: 'koushik@freedomshippingllc.com' } }
    if (status) where.status = status

    const users = await prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true,
            pay_type: true,
            base_salary: true,
            createdAt: true,
            storeMembers: {
                where: { status: 'Active' },
                include: { store: { select: { name: true } } }
            }
        }
    })
    return NextResponse.json(users)
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user || !['Admin', 'SuperAdmin', 'Manager'].includes(session.user.role)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    let { name, email, password, role, status, pay_type, base_salary, phone } = body

    // Managers can only create Staff users, and need permission
    if (session.user.role === 'Manager') {
        const perms = await getManagerPermissions(session.user.companyId)
        if (!perms.users.create) return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
        role = 'Staff'
    }

    if (!name || !email || !password) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
        return NextResponse.json({ error: 'Email already exists' }, { status: 400 })
    }

    const password_hash = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
        data: {
            company_id: session.user.companyId,
            name,
            email,
            password_hash,
            role: role || 'Staff',
            status: status || 'Active',
            pay_type: pay_type || 'MONTHLY',
            base_salary: base_salary !== undefined ? Number(base_salary) : 0,
            phone: phone?.trim() || null,
        }
    })

    await prisma.systemLog.create({
        data: {
            user_id: session.user.id,
            action: 'USER_CREATE',
            entity: 'User',
            entity_id: user.id,
            details: JSON.stringify({ name: user.name, email: user.email, role: user.role, base_salary: Number(user.base_salary || 0) })
        }
    })

    return NextResponse.json({ id: user.id, name: user.name, email: user.email })
}
