import { NextResponse } from 'next/server';

export async function GET() {
  return new NextResponse(
    JSON.stringify([
      {
        user_agent: 'prefetch-proxy',
        fraction: 1.0,
      },
    ]),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/trafficadvice+json',
      },
    }
  );
}
