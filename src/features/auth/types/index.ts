/**
 * ログインフォームの入力データ
 */
export type LoginCredentials = {
    id: string;
    password: string;
};

/**
 * 認証APIのレスポンス
 */
export type AuthResponse = {
    success: boolean;
    message?: string;
};
