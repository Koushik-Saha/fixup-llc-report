import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const updatedUser = await prisma.user.update({
        where: { email: 'explore.esa01@gmail.com' },
        data: { role: 'Manager' }
    })
    console.log(`Successfully updated ${updatedUser.name} (${updatedUser.email}) to role: ${updatedUser.role}`)
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
