// One-time category taxonomy setup: reparents existing flat categories under sensible parents
// and adds the missing categories the user asked for (utilities/bills, transport, health, lifestyle).
// Idempotent — safe to re-run.
import "dotenv/config";
import { prisma } from "./prisma";

async function findByName(name: string) {
  return prisma.category.findFirst({ where: { name } });
}

async function findOrCreate(name: string, group: string, parentId: number | null = null) {
  const existing = await findByName(name);
  if (existing) return existing;
  return prisma.category.create({ data: { name, group, parentId } });
}

async function reparentAndRename(currentName: string, newName: string, parentId: number) {
  const existing = await findByName(currentName);
  if (!existing) return;
  await prisma.category.update({ where: { id: existing.id }, data: { name: newName, parentId } });
}

async function reparent(name: string, parentId: number) {
  const existing = await findByName(name);
  if (!existing) return;
  await prisma.category.update({ where: { id: existing.id }, data: { parentId } });
}

async function main() {
  // --- Grocery subcategories ---
  const grocery = await findOrCreate("Grocery", "expense");
  await reparentAndRename("Milk", "Dairy", grocery.id);
  await reparentAndRename("Vegetable", "Vegetables", grocery.id);
  await findOrCreate("Meat", "expense", grocery.id);
  await findOrCreate("Fruits", "expense", grocery.id);
  await findOrCreate("Bakery products", "expense", grocery.id);

  // --- Utilities & Bills ---
  const utilities = await findOrCreate("Utilities & Bills", "expense");
  await reparent("Broadband", utilities.id);
  await reparent("Mobile Recharge - JIO", utilities.id);
  await reparent("Mobile Recharge - AIRTEL", utilities.id);
  await findOrCreate("Electricity", "expense", utilities.id);
  await findOrCreate("Water", "expense", utilities.id);
  await findOrCreate("Gas", "expense", utilities.id);
  await findOrCreate("DTH/Cable", "expense", utilities.id);
  await findOrCreate("OTT Subscriptions", "expense", utilities.id);

  // --- Transport & Dining ---
  const transportDining = await findOrCreate("Transport & Dining", "expense");
  await findOrCreate("Fuel/Transport", "expense", transportDining.id);
  await findOrCreate("Dining/Restaurants", "expense", transportDining.id);

  // --- Health & Insurance ---
  const health = await findOrCreate("Health & Insurance", "expense");
  await findOrCreate("Healthcare/Medical", "expense", health.id);
  await findOrCreate("Insurance", "expense", health.id);

  // --- Lifestyle & Misc ---
  const lifestyle = await findOrCreate("Lifestyle & Misc", "expense");
  await findOrCreate("Shopping/Clothing", "expense", lifestyle.id);
  await findOrCreate("Travel", "expense", lifestyle.id);
  await findOrCreate("Education", "expense", lifestyle.id);
  await findOrCreate("EMI/Loan", "expense", lifestyle.id);
  await findOrCreate("Gifts/Donations", "expense", lifestyle.id);
  await findOrCreate("Misc", "expense", lifestyle.id);

  console.log("Category tree seeded.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
