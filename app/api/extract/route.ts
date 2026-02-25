import { NextResponse } from "next/server";
import { extractArticle } from "@/lib/extractArticle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const urlParam = searchParams.get("url") ?? "";

  const result = await extractArticle(urlParam);

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: result.error === "invalid_url" ? 400 : 500 }
    );
  }

  return NextResponse.json(result);
}
