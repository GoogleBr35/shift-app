import { describe, it, expect, vi, beforeEach } from 'vitest';

// 外部依存をモック
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

describe('login (管理者ログイン)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.ADMIN_ID = 'admin';
        process.env.HASHED_ADMIN_PASSWORD = '$2a$10$hashedpassword';
    });

    it.each([
        { id: '', password: '', description: 'IDとパスワードが両方空' },
        { id: '', password: 'password', description: 'IDのみ空' },
        { id: 'admin', password: '', description: 'パスワードのみ空' },
    ])('$description の場合、入力エラーを返すこと', async ({ id, password }) => {
        // Given: 入力値が不足している
        // When: ログイン処理を呼び出す
        const result = await login({ id, password });
        // Then: 入力を促すエラーメッセージが返る
        expect(result.success).toBe(false);
        expect(result.message).toBe('IDとパスワードを入力してください');
    });

    it('環境変数が未設定の場合、システムエラーを返すこと', async () => {
        // Given: 管理者情報がシステムに設定されていない
        delete process.env.ADMIN_ID;
        delete process.env.HASHED_ADMIN_PASSWORD;

        // When: ログイン処理を呼び出す
        const result = await login({ id: 'admin', password: 'password' });

        // Then: 続行不能のためシステムエラーが返る
        expect(result.success).toBe(false);
        expect(result.message).toBe('システムエラーが発生しました');
    });

    it.each([
        { id: 'wrong', password: 'password', compare: true, description: 'IDが登録されているものと異なる' },
        { id: 'admin', password: 'wrong', compare: false, description: 'パスワードが間違っている' },
    ])('$description の場合、認証失敗を返すこと', async ({ id, password, compare }) => {
        // Given: パスワード検証結果をモック
        mockedBcryptCompare.mockResolvedValue(compare as never);

        // When: ログイン処理を呼び出す
        const result = await login({ id, password });

        // Then: IDまたはパスワードの誤りを示すメッセージが返る
        expect(result.success).toBe(false);
        expect(result.message).toBe('IDまたはパスワードが正しくありません');
    });

    it('認証に成功した場合、JWTを生成し、SecureなCookieに保存すること', async () => {
        // Given (前提): 正しい管理者のIDとパスワードが入力されている
        mockedBcryptCompare.mockResolvedValue(true as never);
        mockedSignToken.mockResolvedValue('mock-jwt-token');
        const mockSet = vi.fn();
        mockedCookies.mockResolvedValue({ set: mockSet } as never);

        // When (実行): ログイン処理を行う
        const result = await login({ id: 'admin', password: 'correct' });

        // Then (検証): 成功が返り、トークン署名とCookie保存が行われること
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

    it('内部処理で例外が発生した場合、エラーをキャッチしてメッセージを返すこと', async () => {
        // Given: bcrypt の比較中にエラーが発生した
        const error = new Error('Bcrypt hash mismatch');
        mockedBcryptCompare.mockRejectedValue(error);

        // When: ログイン処理を実行
        const result = await login({ id: 'admin', password: 'any' });

        // Then: 失敗結果が返り、内容にエラー情報が含まれること
        expect(result.success).toBe(false);
        expect(result.message).toContain('認証中にエラーが発生しました');
        expect(result.message).toContain(error.message);
    });
});
