import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

// Nhận file từ trình duyệt -> up lên catbox.moe (ẩn danh, miễn phí) -> trả URL công khai
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: "Thiếu file" }, { status: 400 });
    }

    const out = new FormData();
    out.append("reqtype", "fileupload");
    const name = (file as any).name || "image.png";
    out.append("fileToUpload", file, name);

    const res = await fetch("https://catbox.moe/user/api.php", {
      method: "POST",
      body: out,
    });
    const text = (await res.text()).trim();
    if (!res.ok || !text.startsWith("http")) {
      return NextResponse.json(
        { error: `Upload thất bại: ${text || res.status}` },
        { status: 502 }
      );
    }
    return NextResponse.json({ url: text });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Lỗi upload" }, { status: 500 });
  }
}
