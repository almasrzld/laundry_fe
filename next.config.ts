import type { NextConfig } from "next";
import os from "os";

// Automatically and dynamically discover all active network interface IPs
function getDynamicDevOrigins(): string[] {
  const origins = new Set<string>([
    "localhost",
    "127.0.0.1",
    "::1",
    "*.local",
    "*.internal",
    "*.lan",
    "192.168.*",
    "10.*",
    "172.*",
  ]);

  try {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      const netList = interfaces[name];
      if (netList) {
        for (const net of netList) {
          if (net.address) {
            origins.add(net.address);
          }
        }
      }
    }
  } catch (error) {
    console.warn("Failed to retrieve network interfaces dynamically:", error);
  }

  // Support additional origins from environment variable
  const envOrigins = process.env.ALLOWED_DEV_ORIGINS || process.env.NEXT_PUBLIC_ALLOWED_DEV_ORIGINS;
  if (envOrigins) {
    envOrigins.split(",").forEach((item) => {
      const trimmed = item.trim();
      if (trimmed) origins.add(trimmed);
    });
  }

  return Array.from(origins);
}

import pkg from "./package.json";

const nextConfig: NextConfig = {
  allowedDevOrigins: getDynamicDevOrigins(),
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
  },
};

export default nextConfig;
