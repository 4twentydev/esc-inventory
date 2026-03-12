import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const isAuthPage = request.nextUrl.pathname.startsWith('/login');
  const sessionToken = request.cookies.get('esc_session')?.value;

  if (!sessionToken && !isAuthPage && !request.nextUrl.pathname.startsWith('/api/') && !request.nextUrl.pathname.match(/\.(png|jpg|jpeg|svg|webp|ico)$/)) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (sessionToken && isAuthPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
