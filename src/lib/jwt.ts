import 'server-only';
import { SignJWT, jwtVerify } from 'jose';

const SECRET_KEY = process.env.ADMIN_PASSWORD;
if (!SECRET_KEY) {
    throw new Error('ADMIN_PASSWORD is not defined');
}
const secret = new TextEncoder().encode(SECRET_KEY);
const alg = 'HS256';

// JWTペイロードの型（型安全に定義）
export type JWTPayload = {
    sub: string; // ADMIN_ID
    iat?: number; // 発行時刻
    exp?: number; // 有効期限
};

/**
 * JWTを生成（署名）する
 * @param payload - トークンに含めるデータ
 * @returns 署名付きのJWT文字列
 */
export async function signToken(payload: JWTPayload): Promise<string> {
    return new SignJWT(payload)
        .setProtectedHeader({ alg })
        .setIssuedAt()
        .setExpirationTime('30m') // 有効期限
        .sign(secret);
}

/**
 * JWTを検証する
 * @param token - 検証対象のトークン文字列
 * @returns 検証成功時はpayload、失敗時はnull
 */
export async function verifyToken(token: string): Promise<JWTPayload | null> {
    try {
        const { payload } = await jwtVerify(token, secret);
        return payload as JWTPayload;
    } catch (error) {
        if (process.env.NODE_ENV === 'development') {
            // 開発環境のみコンソール出力
            console.error(error);
        }
        return null;
    }
}
