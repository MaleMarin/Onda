import { NextResponse } from "next/server";
import { extractArticle, type ExtractError } from "@/lib/extractArticle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function statusForExtractError(error: ExtractError): number {
  switch (error) {
    case "invalid_url":
      return 400;
    case "blocked_url":
      return 403;
    case "too_large":
      return 413;
    case "timeout":
      return 504;
    case "fetch_failed":
      return 502;
    default:
      return 400;
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const urlParam = searchParams.get("url") ?? "";

  const result = await extractArticle(urlParam);

  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: result.error,
        ...(result.host != null ? { host: result.host } : {}),
        ...(result.meta != null ? { meta: result.meta } : {}),
      },
      { status: statusForExtractError(result.error) }
    );
  }

  return NextResponse.json(result);
}
