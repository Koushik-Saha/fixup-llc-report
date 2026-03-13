import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    const staffHash = await bcrypt.hash('Staff@123!', 10)
    const adminHash = await bcrypt.hash('Admin@123!', 10)
    const managerHash = await bcrypt.hash('Manager@123!', 10)

    const users = await prisma.user.findMany({
        orderBy: { role: 'asc' }
    })

    const emailsByRole: Record<string, string[]> = {
        'Admin': [],
        'Manager': [],
        'Staff': []
    }

    for (const user of users) {
        let newHash = ''
        if (user.role === 'Admin') newHash = adminHash
        else if (user.role === 'Manager') newHash = managerHash
        else newHash = staffHash // defaulting Staff or others

        await prisma.user.update({
            where: { id: user.id },
            data: { password_hash: newHash }
        })

        if (!emailsByRole[user.role]) {
            emailsByRole[user.role] = []
        }
        emailsByRole[user.role].push(user.email)
    }

    console.log("=== USERS BY ROLE ===")
    for (const role in emailsByRole) {
        console.log(`\n[${role}] Password: ${role}@123!`)
        emailsByRole[role].forEach(email => console.log(` - ${email}`))
    }

    console.log("\nAll passwords successfully updated!")
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
