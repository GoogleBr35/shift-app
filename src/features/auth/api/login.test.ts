import { describe, it, expect, vi, beforeEach } from 'vitest';

// 全ての外部依存をモック（import 前に定義）
vi.mock('next/headers', () => ({
    cookies: vi.fn(),
}));

vi.mock('@/lib/jose/jwt', () => ({
    signToken: vi.fn(),
}));

vi.mock('bcryptjs', () => ({
    default: {
        compare: vi.fn(),
    },
}));

import { login } from './login';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { signToken } from '@/lib/jose/jwt';

const mockedBcryptCompare = vi.mocked(bcrypt.compare);
const mockedSignToken = vi.mocked(signToken);
const mockedCookies = vi.mocked(cookies);

describe('login', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.ADMIN_ID = 'admin';
        process.env.HASHED_ADMIN_PASSWORD = '$2a$10$hashedpassword';
    });

    it('IDとパスワードが空の場合、エラーを返す', async () => {
        const result = await login({ id: '', password: '' });
        expect(result.success).toBe(false);
        expect(result.message).toBe('IDとパスワードを入力してください');
    });

    it('IDのみ空の場合、エラーを返す', async () => {
        const result = await login({ id: '', password: 'pass' });
        expect(result.success).toBe(false);
        expect(result.message).toBe('IDとパスワードを入力してください');
    });

    it('パスワードのみ空の場合、エラーを返す', async () => {
        const result = await login({ id: 'admin', password: '' });
        expect(result.success).toBe(false);
        expect(result.message).toBe('IDとパスワードを入力してください');
    });

    it('環境変数が未設定の場合、システムエラーを返す', async () => {
        delete process.env.ADMIN_ID;
        delete process.env.HASHED_ADMIN_PASSWORD;
        const result = await login({ id: 'admin', password: 'pass' });
        expect(result.success).toBe(false);
        expect(result.message).toBe('システムエラーが発生しました');
    });

    it('IDが一致しない場合、認証失敗を返す', async () => {
        mockedBcryptCompare.mockResolvedValue(true as never);
        const result = await login({ id: 'wrong-id', password: 'pass' });
        expect(result.success).toBe(false);
        expect(result.message).toBe('IDまたはパスワードが正しくありません');
    });

    it('パスワードが一致しない場合、認証失敗を返す', async () => {
        mockedBcryptCompare.mockResolvedValue(false as never);
        const result = await login({ id: 'admin', password: 'wrong' });
        expect(result.success).toBe(false);
        expect(result.message).toBe('IDまたはパスワードが正しくありません');
    });

    it('認証成功時、JWTを生成しCookieを設定する', async () => {
        mockedBcryptCompare.mockResolvedValue(true as never);
        mockedSignToken.mockResolvedValue('mock-jwt-token');
        const mockSet = vi.fn();
        mockedCookies.mockResolvedValue({ set: mockSet } as never);

        const result = await login({ id: 'admin', password: 'correctpass' });

        expect(result.success).toBe(true);
        expect(mockedSignToken).toHaveBeenCalledWith({ sub: 'admin' });
        expect(mockSet).toHaveBeenCalledWith('auth_token', 'mock-jwt-token', {
            httpOnly: true,
            secure: true,
            sameSite: 'strict',
            path: '/',
            maxAge: 60 * 30,
        });
    });

    it('bcrypt.compare がエラーを投げた場合、エラーメッセージを返す', async () => {
        mockedBcryptCompare.mockRejectedValue(new Error('bcrypt error'));
        const result = await login({ id: 'admin', password: 'pass' });
        expect(result.success).toBe(false);
        expect(result.message).toContain('認証中にエラーが発生しました');
    });
});
