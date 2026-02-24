import { describe, it, expect, vi } from 'vitest';

// jwt.ts はモジュールのトップレベルで process.env.JWT_SECRET を読むため、
// vi.hoisted で import 前に環境変数を設定する
vi.hoisted(() => {
    process.env.JWT_SECRET =
        'test-secret-key-for-vitest-at-least-32-chars!!';
});

import { signToken, verifyToken } from './jwt';
import type { JWTPayload } from './jwt';

describe('signToken', () => {
    it('JWT文字列を生成できる', async () => {
        const payload: JWTPayload = { sub: 'admin' };
        const token = await signToken(payload);
        expect(token).toBeDefined();
        expect(typeof token).toBe('string');
        // JWT形式: header.payload.signature
        expect(token.split('.')).toHaveLength(3);
    });
});

describe('verifyToken', () => {
    it('有効なトークンを検証できる', async () => {
        const payload: JWTPayload = { sub: 'admin' };
        const token = await signToken(payload);
        const result = await verifyToken(token);
        expect(result).not.toBeNull();
        expect(result?.sub).toBe('admin');
    });

    it('ペイロードに iat と exp が含まれる', async () => {
        const payload: JWTPayload = { sub: 'test-user' };
        const token = await signToken(payload);
        const result = await verifyToken(token);
        expect(result?.iat).toBeDefined();
        expect(result?.exp).toBeDefined();
    });

    it('不正なトークンで null を返す', async () => {
        const result = await verifyToken('invalid-token');
        expect(result).toBeNull();
    });

    it('改ざんされたトークンで null を返す', async () => {
        const payload: JWTPayload = { sub: 'admin' };
        const token = await signToken(payload);
        // トークンの最後の文字を変更して改ざんを模擬
        const tamperedToken =
            token.slice(0, -1) + (token.endsWith('A') ? 'B' : 'A');
        const result = await verifyToken(tamperedToken);
        expect(result).toBeNull();
    });
});
