import { NextResponse, type NextRequest } from 'next/server';

/**
 * Lightweight route guard. The refresh token is opaque and stored in
 * localStorage, which is not readable by middleware, so this only performs a
 * coarse check and never treats the presence of a cookie as authorization —
 * the API enforces every permission. Its purpose is to avoid rendering the
 * shell for clearly unauthenticated visitors.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPublic = pathname === '/login';
  const hasSession = req.cookies.has('atair.session');

  if (!isPublic && !hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }
  if (isPublic && hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|webp|svg|ico|gif)$).*)',
  ],
};
