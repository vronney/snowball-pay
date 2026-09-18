import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth, unauthorized, badRequest, serverError, isValidId } from '@/lib/auth-server';
import { markPlanEdited } from '@/lib/planEdits';

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  // Next 15: route handler params is a Promise.
  const params = await context.params;
  if (!isValidId(params.id)) return badRequest('Invalid id');
  const auth = await verifyAuth(request);
  if (!auth.valid || !auth.user) return unauthorized();

  try {
    const expense = await prisma.expense.findUnique({
      where: { id: params.id },
    });

    if (!expense || expense.userId !== auth.user.id) {
      return badRequest('Expense not found');
    }

    await prisma.expense.delete({ where: { id: params.id } });
    // The delete leaves no row timestamp behind; stamp the user so lifecycle
    // emails read it as plan activity. Best-effort, never fails the delete.
    await markPlanEdited(auth.user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting expense:', error);
    return serverError('Failed to delete expense');
  }
}
