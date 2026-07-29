import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 容器化部署：产出自带 node_modules 的最小运行时目录
  output: "standalone",

  // 知识库是运行时读取的外部只读目录，任何页面都不应被静态化后长期缓存
  experimental: {
    staleTimes: { dynamic: 0, static: 0 },
  },

  poweredByHeader: false,

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "no-referrer" },
          // 私有阅读站不需要任何外部资源；脚本策略与"零客户端 JS"一致
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "img-src 'self' data:",
              "style-src 'self' 'unsafe-inline'",
              "script-src 'self'",
              "frame-ancestors 'none'",
              "base-uri 'none'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
