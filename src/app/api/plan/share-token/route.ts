import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, unauthorized } from "@/lib/auth-server";
import { signShareToken } from "@/lib/shareToken";

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.valid || !auth.user) return unauthorized();

  const token = signShareToken(auth.user.id);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return NextResponse.json({ token, url: `${appUrl}/plan/${token}` });
}
