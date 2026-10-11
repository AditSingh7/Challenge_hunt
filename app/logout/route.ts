import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";

const NO_CACHE = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
};

function redirectAfterLogout() {
  // Keep this as a relative Location. Behind Railway's proxy, req.url can
  // contain the internal localhost:8080 origin, which must never reach users.
  return new NextResponse(null, {
    status: 303,
    headers: {
      ...NO_CACHE,
      Location: "/?loggedOut=1",
    },
  });
}

export async function GET() {
  await destroySession();
  return redirectAfterLogout();
}

export async function POST() {
  await destroySession();
  return redirectAfterLogout();
}
