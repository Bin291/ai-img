"use client";

import { useEffect, useRef, useState } from "react";
import { MODELS, SIZES, GenMode } from "@/lib/providers";

export default function Home() {
  const [mode, setMode] = useState<GenMode>("text-to-image");
  const [model, setModel] = useState(MODELS[0].value);
  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState(SIZES[0]);
  const [n, setN] = useState(1);
  const [imageUrl, setImageUrl] = useState("");
  const [token, setToken] = useState("");

  // Nhớ token trong trình duyệt
  useEffect(() => {
    setToken(localStorage.getItem("pollinations_token") || "");
  }, []);
  function saveToken(v: string) {
    setToken(v);
    localStorage.setItem("pollinations_token", v);
  }

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload thất bại");
      setImageUrl(json.url);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function onGenerate() {
    setError(null);
    if (!prompt.trim()) return setError("Vui lòng nhập prompt.");
    if (mode === "image-to-image" && !imageUrl.trim())
      return setError("Vui lòng dán URL ảnh gốc.");

    setLoading(true);
    setResults([]);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, model, prompt, size, n, imageUrl, token }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `Lỗi ${res.status}`);
      setResults(json.images || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <div className="header">
        <div className="logo">🎨</div>
        <div>
          <h1>AI Image Studio</h1>
        </div>
      </div>
      <p className="subtitle">
        Tạo ảnh bằng Pollinations.ai — miễn phí, không cần API key.
      </p>

      <div className="grid">
        {/* ---------------- Bảng điều khiển ---------------- */}
        <div className="panel">
          {/* Chế độ */}
          <div className="field">
            <label className="lbl">Chế độ</label>
            <div className="seg">
              <button
                className={mode === "text-to-image" ? "active" : ""}
                onClick={() => setMode("text-to-image")}
              >
                Text → Image
              </button>
              <button
                className={mode === "image-to-image" ? "active" : ""}
                onClick={() => setMode("image-to-image")}
              >
                Image → Image
              </button>
            </div>
          </div>

          {/* Ảnh gốc (img2img) */}
          {mode === "image-to-image" && (
            <>
              <div className="field">
                <label className="lbl">Token Pollinations (bắt buộc cho img2img)</label>
                <input
                  type="password"
                  value={token}
                  onChange={(e) => saveToken(e.target.value)}
                  placeholder="Dán token từ enter.pollinations.ai"
                />
                <div className="hint">
                  Img2img (model kontext) cần token miễn phí. Lấy tại{" "}
                  <a href="https://enter.pollinations.ai" target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>
                    enter.pollinations.ai
                  </a>
                  .
                </div>
              </div>
              <div className="field">
                <label className="lbl">Ảnh gốc</label>
                <div className="dropzone" onClick={() => fileRef.current?.click()}>
                  {uploading ? "Đang tải ảnh lên…" : imageUrl ? "Đổi ảnh khác…" : "Bấm để chọn ảnh từ máy (PNG/JPG)"}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={onPickFile}
                />
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="…hoặc dán URL ảnh: https://.../anh.jpg"
                  style={{ marginTop: 8 }}
                />
                <div className="hint">
                  Ảnh sẽ được up lên host công khai (catbox.moe) để Pollinations tải về.
                </div>
                {imageUrl.trim() && !uploading && (
                  <img className="preview-src" src={imageUrl} alt="ảnh gốc" />
                )}
              </div>
            </>
          )}

          {/* Prompt */}
          <div className="field">
            <label className="lbl">
              Prompt {mode === "image-to-image" ? "(mô tả thay đổi mong muốn)" : "(mô tả ảnh)"}
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                mode === "image-to-image"
                  ? "Ví dụ: đổi nền thành bãi biển hoàng hôn"
                  : "Ví dụ: một chú mèo phi hành gia, phong cách tranh sơn dầu, ánh sáng điện ảnh"
              }
            />
          </div>

          {/* Model (chỉ text-to-image) */}
          {mode === "text-to-image" && (
            <div className="field">
              <label className="lbl">Model</label>
              <select value={model} onChange={(e) => setModel(e.target.value)}>
                {MODELS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Tùy chọn */}
          <div className="field row">
            <div>
              <label className="lbl">Kích thước</label>
              <select value={size} onChange={(e) => setSize(e.target.value)}>
                {SIZES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="lbl">Số ảnh</label>
              <input
                type="number"
                min={1}
                max={4}
                value={n}
                onChange={(e) => setN(Number(e.target.value))}
              />
            </div>
          </div>

          <button className="btn" disabled={loading} onClick={onGenerate}>
            {loading ? "Đang tạo…" : "✨ Tạo ảnh"}
          </button>

          {error && <div className="error">❌ {error}</div>}
        </div>

        {/* ---------------- Kết quả ---------------- */}
        <div className={`panel results ${results.length === 0 && !loading ? "empty" : ""}`}>
          {loading ? (
            <div>
              <div className="spinner" />
              <div style={{ color: "var(--muted)", textAlign: "center" }}>Đang tạo ảnh…</div>
            </div>
          ) : results.length === 0 ? (
            <div>
              <div style={{ fontSize: 40, marginBottom: 8 }}>🖼️</div>
              <div>Ảnh tạo ra sẽ hiển thị ở đây</div>
            </div>
          ) : (
            results.map((src, i) => (
              <div className="card" key={i}>
                <img src={src} alt={`kết quả ${i + 1}`} />
                <div className="bar">
                  <a href={src} download={`ai-image-${i + 1}.png`}>
                    ⬇ Tải về
                  </a>
                  <a href={src} target="_blank" rel="noreferrer">
                    ↗ Mở
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
