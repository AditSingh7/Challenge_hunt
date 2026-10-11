import { NextRequest, NextResponse } from "next/server";
import { heartbeatSession, markSessionClosed } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const action = typeof body?.action === "string" ? body.action : null;

  if (action === "close") {
    await markSessionClosed();
    return new NextResponse(null, { status: 204 });
  }

  if (action === "ping" || action === "resume") {
    const alive = await heartbeatSession(action);
    if (!alive) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
