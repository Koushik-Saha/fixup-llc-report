import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { hash } from 'bcrypt'

export async function POST(req: Request) {
    try {
        const { companyName, subdomain, adminName, adminEmail, adminPassword } = await req.json()

        if (!companyName || !adminName || !adminEmail || !adminPassword) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // Check if email already exists globally
        const existingUser = await prisma.user.findUnique({
            where: { email: adminEmail }
        })

        if (existingUser) {
            return NextResponse.json({ error: 'Email is already in use' }, { status: 400 })
        }
        
        // Also verify subdomain if provided
        if (subdomain) {
            const existingCompany = await prisma.company.findUnique({
                where: { subdomain }
            })
            if (existingCompany) {
               return NextResponse.json({ error: 'Subdomain is already taken' }, { status: 400 })
            }
        }

        const hashedPassword = await hash(adminPassword, 12)

        // Atomic creation
        const result = await prisma.$transaction(async (tx: any) => {
            const company = await tx.company.create({
                data: {
                    name: companyName,
                    subdomain: subdomain || null,
                }
            })

            const defaultStore = await tx.store.create({
                data: {
                    company_id: company.id,
                    name: 'Main Location',
                    address: 'Update Me',
                    city: 'Update Me',
                    state: 'Update Me',
                    zip_code: '00000',
                }
            })

            const adminUser = await tx.user.create({
                data: {
                    company_id: company.id,
                    name: adminName,
                    email: adminEmail,
                    password: hashedPassword,
                    role: 'Admin'
                }
            })

            // Assign Admin to default store
            await tx.storeMember.create({
                data: {
                    user_id: adminUser.id,
                    store_id: defaultStore.id,
                    status: 'Active'
                }
            })

            // Auto-create a default category
            await tx.category.create({
                data: {
                    company_id: company.id,
                    name: 'General Repair',
                    description: 'General system repairs'
                }
            })

            return { company, adminUser }
        })

        return NextResponse.json({ success: true, company: result.company })
    } catch (error: any) {
        console.error('Registration error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
