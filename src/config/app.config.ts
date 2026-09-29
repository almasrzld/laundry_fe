/**
 * Central application configuration for Web Frontend.
 * Architecture Flow: .env -> app.config.ts -> Application Code
 * Purely reads from environment variables without hardcoded fallbacks.
 */
export const appConfig = {
  appName: process.env.NEXT_PUBLIC_APP_NAME ?? '',
  appVersion: process.env.NEXT_PUBLIC_APP_VERSION ?? '',
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? '',
  apiPort: process.env.NEXT_PUBLIC_API_PORT ?? '',
  frontendUrl: process.env.NEXT_PUBLIC_FRONTEND_URL ?? '',
  backendUrl: process.env.NEXT_PUBLIC_BACKEND_URL ?? '',
  mobileAppUrl: process.env.NEXT_PUBLIC_MOBILE_APP_URL ?? '',
  inactivityTimeoutMinutes: Number(process.env.NEXT_PUBLIC_INACTIVITY_TIMEOUT_MINUTES),
  
  get inactivityTimeoutMs(): number {
    return this.inactivityTimeoutMinutes * 60 * 1000;
  },

  getApiBaseUrl(): string {
    return this.apiUrl;
  },
};
