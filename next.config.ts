import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 兼容性：确保在边缘节点上路径解析一致
  trailingSlash: false,
  // 生产环境优化
  poweredByHeader: false,
  // 确保编译器不会误删代理需要的代码
  typescript: {
    ignoreBuildErrors: false,
  }
};

export default nextConfig;
