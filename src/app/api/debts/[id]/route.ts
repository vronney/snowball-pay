import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth, unauthorized, badRequest, serverError } from '@/lib/auth-server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifyAuth(request);
  if (!auth.valid || !auth.user) return unauthorized();

  try {
    const debt = await prisma.debt.findUnique({
      where: { id: params.id },
    });

    if (!debt || debt.userId !== auth.user.id) {
      return badRequest('Debt not found');
    }

    return NextResponse.json({ debt });
  } catch (error) {
    console.error('Error fetching debt:', error);
    return serverError('Failed to fetch debt');
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifyAuth(request);
  if (!auth.valid || !auth.user) return unauthorized();

  try {
    // First, verify the debt belongs to the user
    const existingDebt = await prisma.debt.findUnique({
      where: { id: params.id },
    });

    if (!existingDebt || existingDebt.userId !== auth.user.id) {
      return badRequest('Debt not found');
    }

    const body = await request.json();
    const updatedDebt = await prisma.debt.update({
      where: { id: params.id },
      data: body,
    });

    return NextResponse.json({ debt: updatedDebt });
  } catch (error) {
    console.error('Error updating debt:', error);
    return serverError('Failed to update debt');
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifyAuth(request);
  if (!auth.valid || !auth.user) return unauthorized();

  try {
    // First, verify the debt belongs to the user
    const existingDebt = await prisma.debt.findUnique({
      where: { id: params.id },
    });

    if (!existingDebt || existingDebt.userId !== auth.user.id) {
      return badRequest('Debt not found');
    }

    await prisma.debt.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting debt:', error);
    return serverError('Failed to delete debt');
  }
}
