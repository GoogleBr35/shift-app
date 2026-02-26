import { describe, it, expect, vi } from 'vitest';

// jwt.ts はモジュールのトップレベルで process.env を読むため、
// vi.hoisted で import 前に環境変数を設定する
vi.hoisted(() => {
    process.env.JWT_SECRET = 'test-secret-key-for-vitest-at-least-32-chars!!';
    process.env.SUBMIT_JWT_SECRET = 'test-submit-secret-key-at-least-32-characters!!';
});

import { signToken, verifyToken, signSubmitToken, verifySubmitToken } from './jwt';

describe('管理者ログイン用 JWT', () => {
    it('管理者用トークンを生成し、正常に検証できること', async () => {
        // Given (前提): 管理者用ペイロードが準備されている
        const payload = { sub: 'admin' };

        // When (実行): トークンを生成し、それを検証する
        const token = await signToken(payload);
        const result = await verifyToken(token);

        // Then (検証): 正しいJWT形式であり、ペイロードが復元されること
        expect(token.split('.')).toHaveLength(3);
        expect(result).not.toBeNull();
        expect(result?.sub).toBe('admin');
        expect(result?.iat).toBeDefined();
        expect(result?.exp).toBeDefined();
    });

    it.each([
        { token: 'invalid-token', description: 'デタラメな文字列' },
        { token: 'a.b.c', description: '不正な署名の形式' },
    ])('$description の場合、検証結果として null を返すこと', async ({ token }) => {
        // When: 検証を実行
        const result = await verifyToken(token);

        // Then: null が返る
        expect(result).toBeNull();
    });

    it('署名が改ざんされたトークンの場合、検証に失敗すること', async () => {
        // Given: 有効なトークンを作成し、署名部分を書き換える
        const validToken = await signToken({ sub: 'admin' });
        const parts = validToken.split('.');
        parts[2] = 'tampered-signature';
        const tamperedToken = parts.join('.');

        // When: 検証を実行
        const result = await verifyToken(tamperedToken);

        // Then: 失敗して null が返る
        expect(result).toBeNull();
    });
});

describe('提出リンク用 JWT', () => {
    it('提出用トークンを生成し、正常に検証できること', async () => {
        // Given (前提): 特定のシート名が指定されている
        const sheetName = '2024_01_01-2024_01_07';

        // When (実行): 提出用トークンを生成し、それを検証する
        const token = await signSubmitToken(sheetName, 7);
        const result = await verifySubmitToken(token);

        // Then (検証): 署名 Secret が適用され、シート名が正しく取得できること
        expect(token.split('.')).toHaveLength(3);
        expect(result).not.toBeNull();
        expect(result?.sheetName).toBe(sheetName);
    });

    it('管理者用トークンで提出用検証を行うと、Secretが異なるため失敗すること', async () => {
        // Given: 管理者用トークンを生成する
        const adminToken = await signToken({ sub: 'admin' });

        // When: 提出検証関数で検証を試みる
        const result = await verifySubmitToken(adminToken);

        // Then: 権限昇格防止のため失敗して null が返ること
        expect(result).toBeNull();
    });

    it.each([
        { token: 'invalid', description: '不正な文字列' },
        { token: 'sh.ee.t', description: '改ざんされた署名' },
    ])('$description の提出用トークンの場合、null を返すこと', async ({ token }) => {
        // When: 検証を実行
        const result = await verifySubmitToken(token);

        // Then: null が返る
        expect(result).toBeNull();
    });
});
