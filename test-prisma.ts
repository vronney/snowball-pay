import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  try {
    const now = new Date();
    const inactiveCutoff = new Date(now);
    inactiveCutoff.setDate(inactiveCutoff.getDate() - 30);
    const accountAgeCutoff = new Date(now);
    accountAgeCutoff.setDate(accountAgeCutoff.getDate() - 30);

    const candidates = await prisma.user.findMany({
      where: {
        createdAt: { lte: accountAgeCutoff },
        debts:     { some: {} },
        OR: [{ preferences: null }, { preferences: { emailOptOut: false } }],
      },
      include: {
        preferences: true,
        debts:  { select: { id: true, balance: true } },
        income: { select: { monthlyTakeHome: true } },
        payoffPlan: { select: { debtFreeDate: true } },
        paymentRecords: {
          where:   { paidAt: { gte: inactiveCutoff } },
          select:  { id: true },
          take:    1,
        },
      },
    });
    console.log("Win-back query success:", candidates.length);
  } catch (err) {
    console.error("Win-back query error:", err);
  } finally {
    await prisma.$disconnect();
  }
}
main();
