'use server';

import 'server-only';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { signToken } from '@/lib/jwt';
import { LoginCredentials, AuthResponse } from '../types';

/**
 * ログイン認証を行うServer Action
 *
 * @param formData - ログインフォームの入力データ
 * @returns 認証結果
 */
export async function login(formData: LoginCredentials): Promise<AuthResponse> {
    const { id, password } = formData;

    // バリデーション
    if (!id || !password) {
        return {
            success: false,
            message: 'IDとパスワードを入力してください',
        };
    }

    try {
        const adminId = process.env.ADMIN_ID;
        const hashedAdminPassword = process.env.HASHED_ADMIN_PASSWORD;

        // 環境変数が設定されていない場合はログイン不可
        if (!adminId || !hashedAdminPassword) {
            return {
                success: false,
                message: 'システムエラーが発生しました',
            };
        }

        // IDとパスワードの一致を検証
        const isIdMatch = id === adminId;
        const isPasswordMatch = await bcrypt.compare(
            password,
            hashedAdminPassword
        );

        // 認証成功
        if (isIdMatch && isPasswordMatch) {
            // JWTを生成（署名）
            const token = await signToken({ sub: 'admin' });

            // Cookieを設定
            const cookieStore = await cookies();
            cookieStore.set('auth_token', token, {
                httpOnly: true,
                secure: true,
                sameSite: 'strict',
                path: '/',
                maxAge: 60 * 30,
            });

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
