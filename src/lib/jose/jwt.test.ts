import { describe, it, expect, vi } from 'vitest';

// jwt.ts はモジュールのトップレベルで process.env を読むため、
// vi.hoisted で import 前に環境変数を設定する
vi.hoisted(() => {
    process.env.JWT_SECRET =
        'test-secret-key-for-vitest-at-least-32-chars!!';
    process.env.SUBMIT_JWT_SECRET =
        'test-submit-secret-key-at-least-32-characters!!';
});

import {
    signToken,
    verifyToken,
    signSubmitToken,
    verifySubmitToken,
} from './jwt';
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
        // シグネチャ部分を完全に置き換えて改ざんを模擬
        const parts = token.split('.');
        parts[2] = 'invalid-signature-data';
        const tamperedToken = parts.join('.');
        const result = await verifyToken(tamperedToken);
        expect(result).toBeNull();
    });
});

describe('signSubmitToken / verifySubmitToken', () => {
    it('トークンを生成し検証できる', async () => {
        const token = await signSubmitToken('2024_01_01-2024_01_07', 7);
        expect(token.split('.')).toHaveLength(3);

        const result = await verifySubmitToken(token);
        expect(result).not.toBeNull();
        expect(result?.sheetName).toBe('2024_01_01-2024_01_07');
    });

    it('不正なトークンで null を返す', async () => {
        const result = await verifySubmitToken('invalid-token');
        expect(result).toBeNull();
    });

    it('改ざんされたトークンで null を返す', async () => {
        const token = await signSubmitToken('sheet1', 7);
        // シグネチャ部分を完全に置き換えて改ざんを模擬
        const parts = token.split('.');
        parts[2] = 'invalid-signature-data';
        const tamperedToken = parts.join('.');
        const result = await verifySubmitToken(tamperedToken);
        expect(result).toBeNull();
    });

    it('管理者用トークンでは提出用検証が失敗する（Secret分離）', async () => {
        const adminToken = await signToken({ sub: 'admin' });
        const result = await verifySubmitToken(adminToken);
        expect(result).toBeNull();
    });
});
