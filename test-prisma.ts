import { prisma } from './src/lib/prisma';

async function main() {
  try {
    // 1. Create a user with NO preferences
    const testUser = await prisma.user.create({
      data: {
        email: 'test-no-prefs@example.com',
        auth0Id: 'test-no-prefs',
        debts: {
          create: {
            name: 'Test Debt',
            category: 'Other',
            balance: 1000,
            dueDate: 15
          }
        }
      }
    });

    console.log(`Created user ${testUser.id} with no preferences`);

    // 2. Query debts where user has NO preferences using the exact OR logic
    const debts = await prisma.debt.findMany({
      where: {
        user: {
          OR: [
            { preferences: { is: null } },
            { preferences: { notifyDueDates: true, emailOptOut: false } },
          ],
        },
      },
      select: {
        id: true,
        user: {
          select: {
            id: true,
            email: true,
            preferences: true
          }
        }
      }
    });

    const foundTestDebt = debts.find(d => d.user.email === 'test-no-prefs@example.com');
    console.log(`Found test debt with is: null? ${!!foundTestDebt}`);

    // Cleanup
    await prisma.user.delete({ where: { id: testUser.id } });

  } catch (e) {
    console.error(e);
  }
}
main();
