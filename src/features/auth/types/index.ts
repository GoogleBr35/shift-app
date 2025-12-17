/**
 * ログインフォームの入力データ
 */
export interface LoginCredentials {
    id: string;
    password: string;
}

/**
 * 認証APIのレスポンス
 */
export interface AuthResponse {
    success: boolean;
    message?: string;
}
