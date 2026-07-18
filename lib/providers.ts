// =============================================================
// Lớp adapter đa nhà cung cấp (multi-provider) cho sinh ảnh
// Mỗi provider tự map request chung -> API riêng, trả về data URL.
// =============================================================

export type GenMode = "text-to-image" | "image-to-image";

export interface GenerateInput {
  apiKey: string;
  model: string;
  prompt: string;
  mode: GenMode;
  size?: string; // ví dụ "1024x1024"
  n?: number; // số ảnh
  // Với image-to-image: ảnh gốc dạng base64 (không kèm tiền tố data:)
  imageBase64?: string;
  imageMimeType?: string; // ví dụ "image/png"
  strength?: number; // 0..1, mức độ giữ ảnh gốc (một số provider)
}

export interface GenerateResult {
  images: string[]; // danh sách data URL (data:image/...;base64,...)
  raw?: unknown;
}

export interface ProviderMeta {
  id: string;
  label: string;
  // Model gợi ý cho từng chế độ
  models: { value: string; label: string; modes: GenMode[] }[];
  supportsImg2Img: boolean;
  keyHint: string;
  note?: string;
  unofficial?: boolean;
}

// ---------- Danh mục provider hiển thị trên UI ----------
export const PROVIDERS: ProviderMeta[] = [
  {
    id: "pollinations",
    label: "Pollinations.ai (MIỄN PHÍ, không cần key)",
    keyHint: "Không cần API key — để trống cũng được",
    supportsImg2Img: false,
    note: "Miễn phí, không cần key. Dùng để test nhanh xem web có chạy không.",
    models: [
      { value: "flux", label: "flux", modes: ["text-to-image"] },
      { value: "turbo", label: "turbo (nhanh)", modes: ["text-to-image"] },
    ],
  },
  {
    id: "openai",
    label: "OpenAI (DALL·E / gpt-image-1)",
    keyHint: "Key bắt đầu bằng sk-... (platform.openai.com)",
    supportsImg2Img: true,
    models: [
      { value: "gpt-image-1", label: "gpt-image-1 (text + edit)", modes: ["text-to-image", "image-to-image"] },
      { value: "dall-e-3", label: "dall-e-3 (chỉ text-to-image)", modes: ["text-to-image"] },
      { value: "dall-e-2", label: "dall-e-2 (text + edit)", modes: ["text-to-image", "image-to-image"] },
    ],
  },
  {
    id: "google",
    label: "Google Gemini / Imagen",
    keyHint: "API key từ aistudio.google.com",
    supportsImg2Img: true,
    note: "Dùng model gemini-*-flash-image cho key AI Studio miễn phí. Model Imagen chỉ chạy với key ĐÃ bật thanh toán (billing).",
    models: [
      {
        value: "gemini-2.5-flash-image",
        label: "gemini-2.5-flash-image (text + edit) — khuyên dùng",
        modes: ["text-to-image", "image-to-image"],
      },
      {
        value: "gemini-2.5-flash-image-preview",
        label: "gemini-2.5-flash-image-preview",
        modes: ["text-to-image", "image-to-image"],
      },
      {
        value: "gemini-2.0-flash-preview-image-generation",
        label: "gemini-2.0-flash-image (text + edit)",
        modes: ["text-to-image", "image-to-image"],
      },
      {
        value: "imagen-3.0-generate-002",
        label: "imagen-3.0 (cần billing, chỉ text→img)",
        modes: ["text-to-image"],
      },
    ],
  },
  {
    id: "deepai",
    label: "DeepAI",
    keyHint: "API key từ deepai.org/dashboard/profile",
    supportsImg2Img: true,
    note: "DeepAI dùng model cố định (text2img / image-editor), không chọn model tự do.",
    models: [
      { value: "text2img", label: "text2img", modes: ["text-to-image"] },
      { value: "image-editor", label: "image-editor (img→img)", modes: ["image-to-image"] },
    ],
  },
  {
    id: "stability",
    label: "Stability AI (Stable Diffusion)",
    keyHint: "Key bắt đầu bằng sk-... (platform.stability.ai)",
    supportsImg2Img: true,
    models: [
      { value: "core", label: "Stable Image Core", modes: ["text-to-image", "image-to-image"] },
      { value: "sd3.5-large", label: "SD 3.5 Large", modes: ["text-to-image", "image-to-image"] },
      { value: "ultra", label: "Stable Image Ultra", modes: ["text-to-image", "image-to-image"] },
    ],
  },
  {
    id: "fal",
    label: "Fal.ai (Flux, SDXL...)",
    keyHint: "Key dạng key_id:key_secret (fal.ai/dashboard/keys)",
    supportsImg2Img: true,
    models: [
      { value: "fal-ai/flux/dev", label: "FLUX.1 [dev]", modes: ["text-to-image"] },
      { value: "fal-ai/flux/schnell", label: "FLUX.1 [schnell] (nhanh)", modes: ["text-to-image"] },
      { value: "fal-ai/flux/dev/image-to-image", label: "FLUX.1 img2img", modes: ["image-to-image"] },
    ],
  },
  {
    id: "midjourney",
    label: "Midjourney (không chính thức)",
    keyHint: "Cần dịch vụ proxy bên thứ 3 (không có API chính thức)",
    supportsImg2Img: true,
    unofficial: true,
    note: "Midjourney KHÔNG có API chính thức. Chỉ hoạt động nếu bạn có endpoint proxy riêng.",
    models: [{ value: "midjourney", label: "midjourney (qua proxy)", modes: ["text-to-image", "image-to-image"] }],
  },
];

// ---------- Tiện ích ----------
function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

async function toDataUrlFromResponseImage(res: Response): Promise<string> {
  const buf = Buffer.from(await res.arrayBuffer());
  const ct = res.headers.get("content-type") || "image/png";
  const mime = ct.startsWith("image/") ? ct : "image/png";
  return `data:${mime};base64,${buf.toString("base64")}`;
}

function base64ToBlob(base64: string, mime: string): Blob {
  const bytes = Buffer.from(base64, "base64");
  return new Blob([bytes], { type: mime });
}

// =============================================================
// OpenAI
// =============================================================
async function generateOpenAI(input: GenerateInput): Promise<GenerateResult> {
  const { apiKey, model, prompt, mode, size = "1024x1024", n = 1 } = input;

  if (mode === "text-to-image") {
    const body: Record<string, unknown> = { model, prompt, n, size };
    // dall-e-3/2 hỗ trợ response_format; gpt-image-1 luôn trả b64_json
    if (model !== "gpt-image-1") body.response_format = "b64_json";

    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error?.message || `OpenAI lỗi ${res.status}`);
    const images = (json.data as any[]).map((d) =>
      d.b64_json ? `data:image/png;base64,${d.b64_json}` : (d.url as string)
    );
    return { images, raw: json };
  }

  // image-to-image (edit)
  assert(input.imageBase64, "Cần ảnh gốc cho image-to-image");
  const form = new FormData();
  form.append("model", model);
  form.append("prompt", prompt);
  form.append("n", String(n));
  form.append("size", size);
  const mime = input.imageMimeType || "image/png";
  form.append("image", base64ToBlob(input.imageBase64!, mime), "image.png");

  const res = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message || `OpenAI lỗi ${res.status}`);
  const images = (json.data as any[]).map((d) =>
    d.b64_json ? `data:image/png;base64,${d.b64_json}` : (d.url as string)
  );
  return { images, raw: json };
}

// =============================================================
// Google Gemini / Imagen
// =============================================================
async function generateGoogle(input: GenerateInput): Promise<GenerateResult> {
  const { apiKey, model, prompt, mode } = input;

  // Imagen dùng endpoint :predict, chỉ text-to-image
  if (model.startsWith("imagen")) {
    assert(mode === "text-to-image", "Imagen chỉ hỗ trợ text-to-image");
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${encodeURIComponent(
      apiKey
    )}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: { sampleCount: input.n || 1 },
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error?.message || `Google lỗi ${res.status}`);
    const images = (json.predictions as any[]).map(
      (p) => `data:${p.mimeType || "image/png"};base64,${p.bytesBase64Encoded}`
    );
    return { images, raw: json };
  }

  // Gemini image model: generateContent, hỗ trợ cả text-to-img và img-to-img
  const parts: any[] = [{ text: prompt }];
  if (mode === "image-to-image") {
    assert(input.imageBase64, "Cần ảnh gốc cho image-to-image");
    parts.push({
      inlineData: { mimeType: input.imageMimeType || "image/png", data: input.imageBase64 },
    });
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
    apiKey
  )}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
    }),
  });
  const json = await res.json();
  if (!res.ok) {
    const m = json?.error?.message || `Google lỗi ${res.status}`;
    // Free tier có quota = 0 cho model sinh ảnh -> cần bật billing
    if (/quota|limit:\s*0|free_tier/i.test(m)) {
      throw new Error(
        "Google: Key free tier KHÔNG có hạn mức sinh ảnh (limit=0). Model ảnh của Gemini/Imagen cần BẬT THANH TOÁN (billing) trên Google Cloud. Hoặc hãy thử provider khác (DeepAI/Stability/Fal.ai) để test miễn phí."
      );
    }
    throw new Error(`Google: ${m}`);
  }
  // Bị chặn do an toàn nội dung?
  const blockReason = json?.promptFeedback?.blockReason;
  if (blockReason) throw new Error(`Google chặn nội dung: ${blockReason}`);

  const outParts = json?.candidates?.[0]?.content?.parts || [];
  const images = outParts
    .filter((p: any) => p.inlineData?.data)
    .map((p: any) => `data:${p.inlineData.mimeType || "image/png"};base64,${p.inlineData.data}`);
  if (images.length === 0) {
    const txt = outParts.find((p: any) => p.text)?.text;
    const finish = json?.candidates?.[0]?.finishReason;
    throw new Error(
      txt
        ? `Model trả về chữ thay vì ảnh: ${txt}`
        : `Model không trả ảnh (finishReason=${finish || "?"}). Hãy thử model gemini-2.5-flash-image.`
    );
  }
  return { images, raw: json };
}

// =============================================================
// DeepAI
// =============================================================
async function generateDeepAI(input: GenerateInput): Promise<GenerateResult> {
  const { apiKey, model, prompt, mode } = input;
  const form = new FormData();

  let endpoint: string;
  if (mode === "image-to-image" || model === "image-editor") {
    assert(input.imageBase64, "Cần ảnh gốc cho image-to-image");
    endpoint = "https://api.deepai.org/api/image-editor";
    form.append("text", prompt);
    form.append(
      "image",
      base64ToBlob(input.imageBase64!, input.imageMimeType || "image/png"),
      "image.png"
    );
  } else {
    endpoint = "https://api.deepai.org/api/text2img";
    form.append("text", prompt);
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "api-key": apiKey },
    body: form,
  });
  const json = await res.json();
  if (!res.ok || json?.status) {
    throw new Error(`DeepAI: ${json?.status || json?.err || `lỗi ${res.status}`}`);
  }
  if (!json?.output_url) throw new Error("DeepAI không trả về ảnh.");
  return { images: [json.output_url as string], raw: json };
}

// =============================================================
// Stability AI (v2beta stable-image)
// =============================================================
async function generateStability(input: GenerateInput): Promise<GenerateResult> {
  const { apiKey, model, prompt, mode } = input;
  const endpoint =
    model === "core"
      ? "https://api.stability.ai/v2beta/stable-image/generate/core"
      : model === "ultra"
      ? "https://api.stability.ai/v2beta/stable-image/generate/ultra"
      : "https://api.stability.ai/v2beta/stable-image/generate/sd3";

  const form = new FormData();
  form.append("prompt", prompt);
  form.append("output_format", "png");
  if (model.startsWith("sd3")) form.append("model", model);

  if (mode === "image-to-image") {
    assert(input.imageBase64, "Cần ảnh gốc cho image-to-image");
    form.append("mode", "image-to-image");
    form.append("strength", String(input.strength ?? 0.6));
    form.append(
      "image",
      base64ToBlob(input.imageBase64!, input.imageMimeType || "image/png"),
      "image.png"
    );
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, Accept: "image/*" },
    body: form,
  });
  if (!res.ok) {
    let msg = `Stability lỗi ${res.status}`;
    try {
      const j = await res.json();
      msg = j?.errors?.join(", ") || j?.message || msg;
    } catch {}
    throw new Error(msg);
  }
  const dataUrl = await toDataUrlFromResponseImage(res);
  return { images: [dataUrl] };
}

// =============================================================
// Fal.ai
// =============================================================
async function generateFal(input: GenerateInput): Promise<GenerateResult> {
  const { apiKey, model, prompt, mode } = input;
  const body: Record<string, unknown> = { prompt, num_images: input.n || 1 };

  if (mode === "image-to-image") {
    assert(input.imageBase64, "Cần ảnh gốc cho image-to-image");
    const mime = input.imageMimeType || "image/png";
    body.image_url = `data:${mime};base64,${input.imageBase64}`;
    if (input.strength != null) body.strength = input.strength;
  }

  const res = await fetch(`https://fal.run/${model}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Key ${apiKey}` },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.detail?.[0]?.msg || json?.detail || `Fal lỗi ${res.status}`);
  const imgs = (json.images || json.image ? [json.image, ...(json.images || [])] : []).filter(Boolean);
  const images = imgs.map((im: any) => (typeof im === "string" ? im : im.url));
  if (images.length === 0) throw new Error("Fal không trả về ảnh.");
  return { images, raw: json };
}

// =============================================================
// Midjourney (proxy bên thứ 3 — không chính thức)
// =============================================================
async function generateMidjourney(_input: GenerateInput): Promise<GenerateResult> {
  throw new Error(
    "Midjourney không có API chính thức. Hãy cấu hình endpoint proxy riêng của bạn trong lib/providers.ts (hàm generateMidjourney)."
  );
}

// =============================================================
// Pollinations.ai (miễn phí, không cần key)
// =============================================================
async function generatePollinations(input: GenerateInput): Promise<GenerateResult> {
  const { model, prompt, size = "1024x1024" } = input;
  const [w, h] = size.split("x");
  const seed = Math.floor(Math.random() * 1_000_000);
  const url =
    `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` +
    `?width=${w || 1024}&height=${h || 1024}&model=${encodeURIComponent(model || "flux")}` +
    `&seed=${seed}&nologo=true`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Pollinations lỗi ${res.status}`);
  const dataUrl = await toDataUrlFromResponseImage(res);
  return { images: [dataUrl] };
}

// ---------- Bộ định tuyến ----------
export async function generate(providerId: string, input: GenerateInput): Promise<GenerateResult> {
  // Pollinations không cần key
  if (providerId !== "pollinations") assert(input.apiKey, "Thiếu API key");
  assert(input.prompt || input.mode === "image-to-image", "Thiếu prompt");
  switch (providerId) {
    case "pollinations":
      return generatePollinations(input);
    case "openai":
      return generateOpenAI(input);
    case "google":
      return generateGoogle(input);
    case "stability":
      return generateStability(input);
    case "fal":
      return generateFal(input);
    case "deepai":
      return generateDeepAI(input);
    case "midjourney":
      return generateMidjourney(input);
    default:
      throw new Error(`Provider không hỗ trợ: ${providerId}`);
  }
}
