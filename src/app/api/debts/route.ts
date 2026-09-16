import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth, unauthorized, badRequest, serverError } from '@/lib/auth-server';
import { getUserTier, FREE_DEBT_LIMIT, upgradeRequired } from '@/lib/gates';
import { countCountedDebts } from '@/lib/debtCap';
import { isDashboardV2 } from '@/lib/flags';
import { z } from 'zod';

const CreateDebtSchema = z.object({
  name: z.string().min(1, 'Debt name required'),
  category: z.enum(['Credit Card', 'Student Loan', 'Auto Loan', 'Mortgage', 'Personal Loan', 'Medical Debt', 'Other']),
  balance: z.number().min(0, 'Balance must be positive'),
  interestRate: z.number().min(0).max(100),
  minimumPayment: z.number().min(0),
  creditLimit: z.number().min(0).optional(),
  dueDate: z.number().min(1).max(31).optional(),
  // Dashboard v2 only (spec §6.3): past the Free cap, save the debt outside
  // the plan instead of refusing it. Honored only for flagged accounts.
  allowOutsidePlan: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.valid || !auth.user) return unauthorized();

  try {
    const rows = await prisma.debt.findMany({
      where: { userId: auth.user.id },
      orderBy: { createdAt: 'desc' },
      include: { plaidItem: { select: { needsReauth: true } } },
    });

    // Flatten the linked item's re-auth flag onto each debt; drop the nested
    // relation (and never expose the access token) from the response.
    const debts = rows.map(({ plaidItem, ...debt }) => ({
      ...debt,
      needsReauth: plaidItem?.needsReauth ?? false,
    }));

    return NextResponse.json({ debts });
  } catch (error) {
    console.error('Error fetching debts:', error);
    return serverError('Failed to fetch debts');
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.valid || !auth.user) return unauthorized();

  try {
    const body = await request.json();
    const validated = CreateDebtSchema.parse(body);

    // Free-tier debt limit. The cap counts in-plan debts, paid-off ones
    // included (spec §6.3). Past it, dashboard v2 saves the debt outside the
    // plan; every other client keeps today's 403.
    let outsidePlan = false;
    const tier = await getUserTier(auth.user.id);
    if (tier === 'free') {
      const counted = await countCountedDebts(auth.user.id);
      if (counted >= FREE_DEBT_LIMIT) {
        if (!validated.allowOutsidePlan || !isDashboardV2(auth.user.email)) {
          return upgradeRequired('Unlimited debts');
        }
        outsidePlan = true;
      }
    }

    const debt = await prisma.debt.create({
      data: {
        userId: auth.user.id,
        name: validated.name,
        category: validated.category,
        balance: validated.balance,
        originalBalance: validated.balance,
        interestRate: validated.interestRate,
        minimumPayment: validated.minimumPayment,
        creditLimit: validated.creditLimit || 0,
        dueDate: validated.dueDate,
        // Written only as false, so an in-plan save sends exactly today's payload.
        ...(outsidePlan ? { inPlan: false } : {}),
      },
    });

    return NextResponse.json(outsidePlan ? { debt, outsidePlan: true } : { debt }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message || 'Invalid request payload');
    }
    console.error('Error creating debt:', error);
    return serverError('Failed to create debt');
  }
}
