/**
 * Import inventory from scripts/inventory-data.json
 * into the "FixUp Santa Barbara - KS" store.
 *
 * Run with:
 *   npx tsx scripts/import-inventory.ts
 */
import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

type InventoryRow = {
    name: string
    category: string
    quantity: number
    sku: string
}

async function main() {
    const jsonPath = path.join(__dirname, 'inventory-data.json')
    const items: InventoryRow[] = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'))
    console.log(`📦 Loaded ${items.length} inventory items from JSON\n`)

    // Find the Santa Barbara store
    const store = await prisma.store.findFirst({
        where: {
            name: { contains: 'Santa Barbara', mode: 'insensitive' },
            status: 'Active'
        },
        select: { id: true, name: true }
    })

    if (!store) {
        console.error('❌ Store "FixUp Santa Barbara - KS" not found.')
        process.exit(1)
    }
    console.log(`🏪 Found store: ${store.name} (${store.id})\n`)

    // Clear existing inventory for this store
    const deleted = await prisma.inventoryItem.deleteMany({ where: { store_id: store.id } })
    console.log(`🗑️  Cleared ${deleted.count} existing inventory items\n`)

    // Batch insert in chunks of 50
    let created = 0
    const chunkSize = 50
    for (let i = 0; i < items.length; i += chunkSize) {
        const batch = items.slice(i, i + chunkSize)
        await prisma.inventoryItem.createMany({
            data: batch.map(item => ({
                store_id:      store.id,
                name:          item.name,
                sku:           item.sku,
                category:      item.category,
                quantity:      item.quantity,
                unit_cost:     0,
                reorder_level: 1,
            }))
        })
        created += batch.length
        process.stdout.write(`\r   Inserted ${created}/${items.length}...`)
    }

    console.log(`\n\n✅ Done! Imported ${created} items into "${store.name}"`)

    // Summary
    const breakdown = items.reduce((acc, i) => {
        acc[i.category] = (acc[i.category] || 0) + 1
        return acc
    }, {} as Record<string, number>)
    console.log('\n📊 Breakdown:')
    for (const [cat, count] of Object.entries(breakdown)) {
        console.log(`   ${cat}: ${count} items`)
    }
}

main()
    .catch(e => { console.error('\n❌ Error:', e.message); process.exit(1) })
    .finally(() => prisma.$disconnect())
