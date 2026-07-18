# AI Image Studio 🎨

Web Next.js cho phép **nhập API key của bạn** để sinh ảnh **Text-to-Image** và **Image-to-Image**, hỗ trợ nhiều nhà cung cấp AI.

## Provider được hỗ trợ

| Provider | Text→Img | Img→Img | Ghi chú |
|---|---|---|---|
| **OpenAI** (gpt-image-1, DALL·E) | ✅ | ✅ | Key `sk-...` từ platform.openai.com |
| **Google Gemini / Imagen** | ✅ | ✅ (Gemini) | Key từ aistudio.google.com |
| **Stability AI** (SD3.5, Core, Ultra) | ✅ | ✅ | Key `sk-...` từ platform.stability.ai |
| **Fal.ai** (FLUX, SDXL) | ✅ | ✅ | Key `id:secret` từ fal.ai |
| **Midjourney** | ⚠️ | ⚠️ | Không có API chính thức — cần proxy riêng |

> **DeepSeek** hiện chưa có model sinh ảnh nên không nằm trong danh sách.

## Chạy dev

```bash
npm install
npm run dev
```

Mở http://localhost:3000

## Cách dùng

1. Chọn **Chế độ** (Text→Image hoặc Image→Image).
2. Chọn **Nhà cung cấp** và dán **API key** của bạn (bấm *Lưu* để nhớ trong trình duyệt).
3. Chọn **Model**, nhập **Prompt** (và tải ảnh gốc nếu là Image→Image).
4. Bấm **Tạo ảnh**.

## Bảo mật

- API key **chỉ lưu trong `localStorage`** của trình duyệt bạn.
- Mỗi lần tạo ảnh, key được gửi tới route `/api/generate` (chạy server-side) rồi chuyển thẳng tới nhà cung cấp. **Không lưu vào database, không log ra file.**

## Thêm provider mới

Mở `lib/providers.ts`:
1. Thêm một mục vào mảng `PROVIDERS`.
2. Viết hàm `generateXxx(input)` gọi API tương ứng, trả về `{ images: string[] }` (mỗi phần tử là data URL hoặc http URL).
3. Thêm `case` trong hàm `generate()`.
