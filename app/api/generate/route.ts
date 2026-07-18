import { NextRequest, NextResponse } from "next/server";
import { generate, GenerateInput } from "@/lib/providers";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { provider, ...input } = body as { provider: string } & GenerateInput;

    if (!provider) return NextResponse.json({ error: "Thiếu provider" }, { status: 400 });
    if (!input.apiKey && provider !== "pollinations")
      return NextResponse.json({ error: "Thiếu API key" }, { status: 400 });

    const result = await generate(provider, input);
    return NextResponse.json({ images: result.images });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Lỗi không xác định" }, { status: 500 });
  }
}
