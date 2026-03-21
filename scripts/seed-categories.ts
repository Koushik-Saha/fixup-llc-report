const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const categories = ['Shipping', 'US to BD', 'BD to US', 'Dropshipping']
  
  for (const name of categories) {
    await prisma.category.create({
      data: { name }
    })
    console.log(`Created category: ${name}`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
