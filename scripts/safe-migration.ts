import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    console.log('Starting safe data migration...')

    // 1. Create the companies table manually so we can reference it
    await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "companies" (
            "id" TEXT NOT NULL,
            "name" TEXT NOT NULL,
            "subdomain" TEXT NOT NULL,
            "logo_url" TEXT,
            "primary_color" TEXT NOT NULL DEFAULT '#6366f1',
            "stripe_customer" TEXT,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
        );
    `)
    try {
        await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "companies_subdomain_key" ON "companies"("subdomain");`)
    } catch (e) { console.log('Index maybe already exists.') }

    // 2. Add columns optionally
    console.log('Adding optional company_id columns...')
    const tables = ['categories', 'stores', 'users', 'notifications']
    for (const table of tables) {
        try {
            await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "company_id" TEXT;`)
        } catch (e) {
            console.log(`Column might already exist on ${table}.`)
        }
    }

    // 3. Create default company
    const companies = await prisma.$queryRaw<any[]>`SELECT * FROM "companies" LIMIT 1`
    let defaultCompanyId = ''
    if (companies.length > 0) {
        defaultCompanyId = companies[0].id
        console.log(`Found existing company ID: ${defaultCompanyId}`)
    } else {
        const id = 'cm0company0001xyz' // mock valid cuid format
        await prisma.$executeRawUnsafe(`
            INSERT INTO "companies" ("id", "name", "subdomain", "updatedAt") 
            VALUES ('${id}', 'FixUp System', 'fixup', CURRENT_TIMESTAMP)
        `)
        defaultCompanyId = id
        console.log(`Created default company ID: ${defaultCompanyId}`)
    }

    // 4. Update all existing records
    console.log('Backfilling company_id on existing rows...')
    for (const table of tables) {
        await prisma.$executeRawUnsafe(`UPDATE "${table}" SET "company_id" = '${defaultCompanyId}' WHERE "company_id" IS NULL;`)
    }

    console.log('Pre-migration complete! Now safe to run: npx prisma db push')
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
