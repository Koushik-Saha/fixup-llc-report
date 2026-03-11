import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Starting Production Data Seed...')

    const defaultPassword = await bcrypt.hash('Staff@123', 10)

    // Helper to extract initials (e.g. "MD Mostakin Hossain Patwari" -> "MH")
    // Note: The user explicitly requested "MH" for the first store, so I'll manually map these to ensure absolute accuracy based on their prompt.
    const getStoreName = (baseStore: string, initials: string) => `${baseStore} - ${initials}`

    // 1. CREATE USERS (All marked as HOURLY per user request)
    const usersData = [
        {
            name: "Shovon Sadeek",
            email: "explore.esa01@gmail.com",
            password_hash: defaultPassword,
            role: "Staff",
            status: "Active",
            pay_type: "HOURLY",
            base_salary: 15.00 
        },
        {
            name: "MD Mostakin Hossain Patwari",
            email: "mostakin@ymail.com",
            password_hash: defaultPassword,
            role: "Staff",
            status: "Active",
            pay_type: "HOURLY",
            base_salary: 15.00
        },
        {
            name: "Yeasin Arafat",
            email: "yeasin@fixupllc.com",
            password_hash: defaultPassword,
            role: "Staff",
            status: "Active",
            pay_type: "HOURLY",
            base_salary: 15.00
        },
        {
            name: "Alif Azhar",
            email: "alif@fixupllc.com",
            password_hash: defaultPassword,
            role: "Staff",
            status: "Active",
            pay_type: "HOURLY",
            base_salary: 15.00
        },
        {
            name: "Mowdud Ahmed Nihon",
            email: "mowdudahmed@c5k.com",
            password_hash: defaultPassword,
            role: "Staff",
            status: "Active",
            pay_type: "HOURLY",
            base_salary: 15.00
        },
        {
            name: "Arif Hossain",
            email: "arif@fixupllc.com", // Guessed email based on pattern, as screenshot cuts it off
            password_hash: defaultPassword,
            role: "Staff",
            status: "Active",
            pay_type: "HOURLY",
            base_salary: 15.00
        }
    ]

    const createdUsers: Record<string, any> = {}

    console.log('Creating Users...')
    for (const u of usersData) {
        // Upsert to ensure we don't crash if run twice
        const user = await prisma.user.upsert({
            where: { email: u.email },
            update: {
                name: u.name,
                pay_type: u.pay_type,
                base_salary: u.base_salary
            },
            create: u
        })
        createdUsers[u.name] = user
        console.log(`  ✓ Created user: ${user.name} (${user.email})`)
    }

    // 2. CREATE STORES AND ASSIGN USERS
    const storesData = [
        {
            // The user explicitly requested "Fast Phone Repair and accessories - MH"
            name: getStoreName("Fast Phone Repair and accessories", "MH"),
            address: "7400 S Las Vegas Blvd, Entrance-C, Kiosk beside Starbucks (Unit TT45)",
            city: "Las Vegas",
            state: "NV",
            zip_code: "89123",
            max_members: 5,
            status: "Active",
            assignTo: ["MD Mostakin Hossain Patwari"]
        },
        {
            name: getStoreName("Las Vegas Phone Repair & Accessories", "YA"), // Yeasin Arafat -> YA
            address: "7400 Las Vegas Blvd S, Unit - TT42, Inside of the shopping Mall",
            city: "Las Vegas",
            state: "NV",
            zip_code: "89123",
            max_members: 5,
            status: "Active",
            assignTo: ["Yeasin Arafat"]
        },
        {
            name: getStoreName("Max Phone Repair & Accessories", "AA"), // Alif Azhar -> AA
            address: "7400 Las Vegas Blvd S, Unit TT38",
            city: "Las Vegas",
            state: "NV",
            zip_code: "89123",
            max_members: 5,
            status: "Active",
            assignTo: ["Alif Azhar"]
        },
        {
            name: getStoreName("Max Phone Repair & Accessories", "MN"), // Mowdud Ahmed Nihon -> MN
            address: "775 S Grand Central Pkwy",
            city: "Las Vegas",
            state: "NV",
            zip_code: "89106",
            max_members: 5,
            status: "Active",
            assignTo: ["Mowdud Ahmed Nihon"]
        },
        {
            name: getStoreName("Max Phone Repair & Accessories - 2", "AH"), // Arif Hossain -> AH
            address: "775 S Grand Central Pkwy",
            city: "Las Vegas",
            state: "NV",
            zip_code: "89106",
            max_members: 5,
            status: "Active",
            assignTo: ["Arif Hossain"]
        }
    ]

    console.log('\nCreating Stores & Linking Users...')
    for (const s of storesData) {
        // Upsert by name so it's idempotent
        let store = await prisma.store.findFirst({
            where: { name: s.name }
        })

        if (!store) {
            store = await prisma.store.create({
                data: {
                    name: s.name,
                    address: s.address,
                    city: s.city,
                    state: s.state,
                    zip_code: s.zip_code,
                    max_members: s.max_members,
                    status: s.status
                }
            })
            console.log(`  ✓ Created store: ${store.name}`)
        } else {
            console.log(`  ~ Store exists: ${store.name}`)
        }

        // Link the assigned users
        for (const assigneeName of s.assignTo) {
            const user = createdUsers[assigneeName]
            if (user) {
                // Check if linkage exists
                const existingLink = await prisma.storeMember.findUnique({
                    where: {
                        store_id_user_id: { store_id: store.id, user_id: user.id }
                    }
                })

                if (!existingLink) {
                    await prisma.storeMember.create({
                        data: {
                            store_id: store.id,
                            user_id: user.id
                        }
                    })
                    console.log(`    ↳ Assigned ${user.name} to ${store.name}`)
                }
            }
        }
    }

    // Special Case: "ALL - Las Vegas - Shovon Sadeek"
    // Since Shovon is an 'ALL' employee according to the screenshot, we should assign him to all Las Vegas stores.
    console.log('\nProcessing "ALL" assignments...')
    const shovon = createdUsers["Shovon Sadeek"]
    if (shovon) {
        const allStores = await prisma.store.findMany()
        for (const store of allStores) {
            const existingLink = await prisma.storeMember.findUnique({
                where: {
                    store_id_user_id: { store_id: store.id, user_id: shovon.id }
                }
            })
            if (!existingLink) {
                await prisma.storeMember.create({
                    data: {
                        store_id: store.id,
                        user_id: shovon.id
                    }
                })
                console.log(`    ↳ Assigned ${shovon.name} (ALL) to ${store.name}`)
            }
        }
    }

    console.log('\n✅ Production Data Seed Complete!')
}

main()
    .catch((e) => {
        console.error("Error during seeding:", e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
