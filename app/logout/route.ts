import { NextRequest, NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";

const NO_CACHE = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
};

export async function GET(req: NextRequest) {
  await destroySession();
  return NextResponse.redirect(new URL("/?loggedOut=1", req.url), { headers: NO_CACHE });
}

export async function POST(req: NextRequest) {
  await destroySession();
  return NextResponse.redirect(new URL("/?loggedOut=1", req.url), { headers: NO_CACHE });
}
