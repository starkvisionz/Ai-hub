/** @type {import('next').NextConfig} */
const nextConfig = {
  // Emit a self-contained server bundle for a small Docker image (Coolify build).
  output: "standalone",
  reactStrictMode: true,
};

export default nextConfig;
