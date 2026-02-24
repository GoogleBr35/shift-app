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

/**
 * NextRequest のモック生成
 */
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

describe('proxy', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('未認証 + 非ログイン + 非公開ページ → / にリダイレクト', async () => {
        mockedVerifyToken.mockResolvedValue(null);
        const req = createMockRequest('/menu');

        await proxy(req);

        expect(NextResponse.redirect).toHaveBeenCalledWith(
            expect.objectContaining({
                pathname: '/',
            })
        );
    });

    it('認証済み + ログインページ → /menu にリダイレクト', async () => {
        mockedVerifyToken.mockResolvedValue({ sub: 'admin' });
        const req = createMockRequest('/', 'valid-token');

        await proxy(req);

        expect(NextResponse.redirect).toHaveBeenCalledWith(
            expect.objectContaining({
                pathname: '/menu',
            })
        );
    });

    it('認証済み + 通常ページ → NextResponse.next()', async () => {
        mockedVerifyToken.mockResolvedValue({ sub: 'admin' });
        const req = createMockRequest('/member', 'valid-token');

        await proxy(req);

        expect(NextResponse.next).toHaveBeenCalled();
        expect(NextResponse.redirect).not.toHaveBeenCalled();
    });

    it('未認証 + /submit (公開ページ) → NextResponse.next()', async () => {
        mockedVerifyToken.mockResolvedValue(null);
        const req = createMockRequest('/submit?token=xxx');

        await proxy(req);

        expect(NextResponse.next).toHaveBeenCalled();
        expect(NextResponse.redirect).not.toHaveBeenCalled();
    });

    it('未認証 + ログインページ → NextResponse.next()', async () => {
        mockedVerifyToken.mockResolvedValue(null);
        const req = createMockRequest('/');

        await proxy(req);

        expect(NextResponse.next).toHaveBeenCalled();
        expect(NextResponse.redirect).not.toHaveBeenCalled();
    });
});
