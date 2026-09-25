import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const AUTH_COOKIE = 'almas_is_authenticated';
const TOKEN_COOKIE = 'almas_auth_token';

// Public route paths that do not require authentication
const PUBLIC_PATHS = ['/auth/login', '/auth/register'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Ignore static assets, Next.js internal files, favicon, etc.
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(TOKEN_COOKIE)?.value;
  const isAuth = request.cookies.get(AUTH_COOKIE)?.value === 'true';
  const isAuthenticated = Boolean(token && isAuth);

  const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  // 1. If not authenticated and trying to access protected route -> Redirect to /auth/login
  if (!isAuthenticated && !isPublicPath) {
    const loginUrl = new URL('/auth/login', request.url);
    if (pathname !== '/') {
      loginUrl.searchParams.set('from', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  // 2. If already authenticated and trying to access login/register -> Redirect to /dashboard
  if (isAuthenticated && isPublicPath) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

// Backward compatibility
export const middleware = proxy;

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
