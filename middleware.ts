// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const USER = process.env.BASIC_AUTH_USER!;
const PASS = process.env.BASIC_AUTH_PASS!;

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // let assets/metadata through (adjust as needed)
  if (
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml'
  ) {
    return NextResponse.next();
  }

  const auth = req.headers.get('authorization') ?? '';
  if (auth.startsWith('Basic ')) {
    const [u, p] = atob(auth.slice(6)).split(':');
    if (u === USER && p === PASS) return NextResponse.next();
  }

  return new NextResponse('Authentication required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="ReadReceipt"' },
  });
}

export const config = { matcher: ['/(.*)'] };
