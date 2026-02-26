import { describe, it, expect, vi, beforeEach } from 'vitest';
import { proxy } from './proxy';

// NextResponse をモック
vi.mock('next/server', () => ({
    NextResponse: {
        redirect: vi.fn((url: URL) => ({ type: 'redirect', url })),
        next: vi.fn(() => ({ type: 'next' })),
    },
}));

// verifyToken をモック
vi.mock('@/lib/jose/jwt', () => ({
    verifyToken: vi.fn(),
}));

import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jose/jwt';

const mockedVerifyToken = vi.mocked(verifyToken);

/** NextRequest のモック生成 */
function createMockRequest(pathname: string, authToken?: string) {
    return {
        nextUrl: {
            pathname,
        },
        cookies: {
            get: vi.fn((name: string) =>
                name === 'auth_token' && authToken
                    ? { value: authToken }
                    : undefined
            ),
        },
        url: `http://localhost:3000${pathname}`,
    } as unknown as Parameters<typeof proxy>[0];
}

describe('proxy (ミドルウェア/アクセス制御)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('未認証のユーザーが管理者専用ページ（/menu 等）にアクセスした場合、トップページへリダイレクトすること', async () => {
        // Given (前提): トークンが無効であり、保護されたパスへのリクエスト
        mockedVerifyToken.mockResolvedValue(null);
        const req = createMockRequest('/menu');

        // When (実行): proxy 処理を通す
        await proxy(req);

        // Then (検証): トップページ (/) へのリダイレクトが指示されること
        expect(NextResponse.redirect).toHaveBeenCalledWith(
            expect.objectContaining({
                pathname: '/',
            })
        );
    });

    it('既に認証済みのユーザーがログインページ（/）にアクセスした場合、メニュー（/menu）へリダイレクトすること', async () => {
        // Given: 有効なトークンを保持してトップページを開く
        mockedVerifyToken.mockResolvedValue({ sub: 'admin' });
        const req = createMockRequest('/', 'valid-token');

        // When: proxy 処理を通す
        await proxy(req);

        // Then: メニューページ (/menu) へのリダイレクトが指示されること
        expect(NextResponse.redirect).toHaveBeenCalledWith(
            expect.objectContaining({
                pathname: '/menu',
            })
        );
    });

    it('認証済みユーザーが管理者ページにアクセスした場合、そのままアクセスを許可すること', async () => {
        // Given: 有効な認証を持ち、保護パス (/member) へアクセス
        mockedVerifyToken.mockResolvedValue({ sub: 'admin' });
        const req = createMockRequest('/member', 'valid-token');

        // When: proxy 処理を通す
        await proxy(req);

        // Then: リダイレクトせず、次の処理 (next) へ進むこと
        expect(NextResponse.next).toHaveBeenCalled();
        expect(NextResponse.redirect).not.toHaveBeenCalled();
    });

    it.each([
        { path: '/submit?token=xxx', description: '提出用公開ページ (/submit)' },
        { path: '/', description: '未認証でのログインページ' },
    ])('公開されているパス $description へのアクセスは、未認証でも許可すること', async ({ path }) => {
        // Given: 未認証状態
        mockedVerifyToken.mockResolvedValue(null);
        const req = createMockRequest(path);

        // When: proxy 処理を通す
        await proxy(req);

        // Then: アクセスが許可されること
        expect(NextResponse.next).toHaveBeenCalled();
        expect(NextResponse.redirect).not.toHaveBeenCalled();
    });
});
