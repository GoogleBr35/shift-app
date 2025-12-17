import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/jwt';

export async function proxy(request: NextRequest) {
    const token = request.cookies.get('auth_token')?.value; // Cookieからトークンを取得
    const isLoginPage = request.nextUrl.pathname === '/'; // ログインページかどうか

    const payload = token ? await verifyToken(token) : null; // トークンを検証
    const isValid = !!payload; // トークンが有効かどうか

    // 未認証（トークンなし or 検証失敗）かつ、ログインページ以外へのアクセス
    if (!isValid && !isLoginPage) {
        return NextResponse.redirect(new URL('/', request.url));
    }

    // 認証済み（検証成功）かつ、ログインページへのアクセス
    if (isValid && isLoginPage) {
        return NextResponse.redirect(new URL('/menu', request.url));
    }

    return NextResponse.next();
}

// 適用するルートの設定
export const config = {
    matcher: [
        /*
         * マッチしないパス:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};
