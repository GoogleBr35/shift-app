'use server';

import 'server-only';
import { LoginCredentials, AuthResponse } from '../types';

/**
 * ログイン認証を行うServer Action
 *
 * @param credentials - IDとパスワード
 * @returns 認証結果
 */
export async function login(
    credentials: LoginCredentials
): Promise<AuthResponse> {
    const { id, password } = credentials;

    // バリデーション
    if (!id || !password) {
        return {
            success: false,
            message: 'IDとパスワードを入力してください',
        };
    }

    try {
        const adminId = process.env.ADMIN_ID;
        const adminPassword = process.env.ADMIN_PASSWORD;

        // 環境変数が設定されていない場合はログイン不可
        if (!adminId || !adminPassword) {
            return {
                success: false,
                message: 'システムエラーが発生しました',
            };
        }

        // 認証成功
        if (id === adminId && password === adminPassword) {
            return {
                success: true,
            };
        }

        // 認証失敗
        return {
            success: false,
            message: 'IDまたはパスワードが正しくありません',
        };
    } catch (error) {
        return {
            success: false,
            message: '認証中にエラーが発生しました: ' + error,
        };
    }
}
