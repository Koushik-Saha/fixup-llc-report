const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({ select: { name: true, role: true, status: true } });
  console.log("Users:", users);

  const members = await prisma.storeMember.findMany({ include: { user: true } });
  console.log("Members:", members.map(m => ({ store: m.store_id, name: m.user.name, user_status: m.user.status, member_status: m.status })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
