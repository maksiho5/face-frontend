import type { NextConfig } from "next";


/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        fs: false, // отключаем node-модуль 'fs' в браузере
      };
    }
    return config;
  },
};

module.exports = nextConfig;

export default nextConfig;
