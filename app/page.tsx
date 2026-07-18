"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PROVIDERS, GenMode } from "@/lib/providers";

export default function Home() {
  const [providerId, setProviderId] = useState("openai");
  const [model, setModel] = useState(PROVIDERS[0].models[0].value);
  const [mode, setMode] = useState<GenMode>("text-to-image");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState("1024x1024");
  const [strength, setStrength] = useState(0.6);
  const [n, setN] = useState(1);

  const [srcImage, setSrcImage] = useState<{ base64: string; mime: string; url: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<string[]>([]);

  const provider = useMemo(() => PROVIDERS.find((p) => p.id === providerId)!, [providerId]);

  // Model khả dụng theo chế độ đang chọn
  const availableModels = useMemo(
    () => provider.models.filter((m) => m.modes.includes(mode)),
    [provider, mode]
  );

  // Load key đã lưu (theo từng provider) từ localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`aikey:${providerId}`);
    setApiKey(saved || "");
  }, [providerId]);

  // Khi đổi provider hoặc mode, đảm bảo model hợp lệ
  useEffect(() => {
    if (!availableModels.find((m) => m.value === model)) {
      setModel(availableModels[0]?.value || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerId, mode]);

  function saveKey() {
    localStorage.setItem(`aikey:${providerId}`, apiKey);
    alert("Đã lưu key vào trình duyệt của bạn (localStorage).");
  }

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      const base64 = url.split(",")[1];
      setSrcImage({ base64, mime: file.type || "image/png", url });
    };
    reader.readAsDataURL(file);
  }

  async function onGenerate() {
    setError(null);
    if (!apiKey && providerId !== "pollinations") return setError("Vui lòng nhập API key.");
    if (mode === "text-to-image" && !prompt.trim()) return setError("Vui lòng nhập prompt.");
    if (mode === "image-to-image" && !srcImage) return setError("Vui lòng tải ảnh gốc lên.");

    setLoading(true);
    setResults([]);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: providerId,
          apiKey,
          model,
          prompt,
          mode,
          size,
          n,
          strength,
          imageBase64: mode === "image-to-image" ? srcImage?.base64 : undefined,
          imageMimeType: mode === "image-to-image" ? srcImage?.mime : undefined,
        }),
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
        Text-to-image &amp; Image-to-image đa nhà cung cấp — dùng API key của chính bạn. Key chỉ được
        lưu trong trình duyệt và gửi trực tiếp tới nhà cung cấp.
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

          {/* Provider */}
          <div className="field">
            <label className="lbl">Nhà cung cấp</label>
            <select value={providerId} onChange={(e) => setProviderId(e.target.value)}>
              {PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
            {provider.note && <div className="note">⚠️ {provider.note}</div>}
          </div>

          {/* API key */}
          <div className="field">
            <label className="lbl">API Key</label>
            <div className="keyrow">
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={provider.keyHint}
              />
              <button onClick={() => setShowKey((s) => !s)}>{showKey ? "Ẩn" : "Hiện"}</button>
              <button onClick={saveKey}>Lưu</button>
            </div>
            <div className="hint">{provider.keyHint}</div>
          </div>

          {/* Model */}
          <div className="field">
            <label className="lbl">Model</label>
            <select value={model} onChange={(e) => setModel(e.target.value)}>
              {availableModels.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            {availableModels.length === 0 && (
              <div className="hint">Provider này không có model cho chế độ đã chọn.</div>
            )}
          </div>

          {/* Ảnh gốc cho img2img */}
          {mode === "image-to-image" && (
            <div className="field">
              <label className="lbl">Ảnh gốc</label>
              <div className="dropzone" onClick={() => fileRef.current?.click()}>
                {srcImage ? "Đổi ảnh khác…" : "Bấm để chọn ảnh (PNG/JPG)"}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={onPickFile}
              />
              {srcImage && <img className="preview-src" src={srcImage.url} alt="nguồn" />}
            </div>
          )}

          {/* Prompt */}
          <div className="field">
            <label className="lbl">
              Prompt {mode === "image-to-image" ? "(mô tả thay đổi mong muốn)" : ""}
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ví dụ: một chú mèo phi hành gia, phong cách tranh sơn dầu, ánh sáng điện ảnh"
            />
          </div>

          {/* Tùy chọn */}
          <div className="field row">
            <div>
              <label className="lbl">Kích thước</label>
              <select value={size} onChange={(e) => setSize(e.target.value)}>
                <option>1024x1024</option>
                <option>1024x1792</option>
                <option>1792x1024</option>
                <option>512x512</option>
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

          {mode === "image-to-image" && (
            <div className="field">
              <label className="lbl">Strength (giữ ảnh gốc: {strength})</label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={strength}
                onChange={(e) => setStrength(Number(e.target.value))}
              />
              <div className="hint">Cao = biến đổi mạnh hơn (áp dụng cho Stability/Fal).</div>
            </div>
          )}

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
              <div style={{ color: "var(--muted)", textAlign: "center" }}>Đang gọi model…</div>
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
