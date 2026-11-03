import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  // 카카오 오픈빌더 연동용 터널(cloudflared/ngrok)로 개발 서버에 접속할 수 있게 허용
  allowedDevOrigins: ["*.trycloudflare.com", "*.ngrok-free.app", "*.ngrok.app"],
};

export default nextConfig;
