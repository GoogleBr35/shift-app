/**
 * ログインフォームの入力データ
 */
export interface LoginCredentials {
    id: string;
    password: string;
}

/**
 * ユーザー情報
 */
export interface User {
    id: string;
    name: string;
}

/**
 * 認証APIのレスポンス
 */
export interface AuthResponse {
    success: boolean;
    message?: string;
    user?: User;
}
