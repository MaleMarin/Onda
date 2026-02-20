import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const CHAT_PATH = "/chat";

export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  // Permitir que /chat se pueda embeber en iframes (Wix, etc.)
  if (req.nextUrl.pathname === CHAT_PATH) {
    res.headers.set("Content-Security-Policy", "frame-ancestors *");
  }
  return res;
}

export const config = {
  matcher: ["/((?!api).*)"],
};
