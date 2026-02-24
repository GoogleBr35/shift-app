import 'server-only';
import { SignJWT, jwtVerify } from 'jose';

const secret = new TextEncoder().encode(process.env.JWT_SECRET);
const submitSecret = new TextEncoder().encode(process.env.SUBMIT_JWT_SECRET);
const alg = 'HS256';

// --- 管理者ログイン用 JWT ---

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

// --- 提出リンク用 JWT ---

export type SubmitJWTPayload = {
    sheetName: string;
    iat?: number;
    exp?: number;
};

/**
 * 提出リンク用JWTを生成する
 * @param sheetName - シフト表のシート名
 * @param expiresInDays - 有効期限（日数）
 * @returns 署名付きのJWT文字列
 */
export async function signSubmitToken(
    sheetName: string,
    expiresInDays: number
): Promise<string> {
    return new SignJWT({ sheetName })
        .setProtectedHeader({ alg })
        .setIssuedAt()
        .setExpirationTime(`${expiresInDays}d`)
        .sign(submitSecret);
}

/**
 * 提出リンク用JWTを検証する
 * @param token - 検証対象のトークン文字列
 * @returns 検証成功時はpayload、失敗時はnull
 */
export async function verifySubmitToken(
    token: string
): Promise<SubmitJWTPayload | null> {
    try {
        const { payload } = await jwtVerify(token, submitSecret);
        return payload as unknown as SubmitJWTPayload;
    } catch (error) {
        if (process.env.NODE_ENV === 'development') {
            console.error(error);
        }
        return null;
    }
}
