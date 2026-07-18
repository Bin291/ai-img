/** @type {import('next').NextConfig} */
const nextConfig = {
  // Cho phép body lớn (ảnh base64) khi gọi Server Action / route handler
  experimental: {
    serverActions: {
      bodySizeLimit: "15mb",
    },
  },
};

export default nextConfig;
