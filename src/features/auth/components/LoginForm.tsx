'use client';

import { useState } from 'react';
import { Button, Input } from '@/components/elements';
import { login } from '@/features/auth/actions/login';
import { LoginCredentials } from '@/features/auth/types';
import { useRouter } from 'next/navigation';

export default function LoginForm() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false); // ローディング状態
    const [error, setError] = useState<string | null>(null); // エラー
    const [formData, setFormData] = useState<LoginCredentials>({
        // ログインフォームの入力データ
        id: '',
        password: '',
    });

    // 入力値を更新する
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        // 入力値を更新
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
        // 入力時にエラーをクリア
        if (error) setError(null);
    };

    // ログイン認証を実行
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true); // ローディング状態を設定
        setError(null); // エラーをクリア

        try {
            // ログイン認証を実行
            const result = await login(formData);

            if (result.success) {
                // ログイン成功時、メニュー画面へ遷移
                router.push('/menu');
            } else {
                // ログイン失敗時、エラーを表示
                setError(result.message || 'ログインに失敗しました');
            }
        } catch {
            setError('ログイン処理中にエラーが発生しました');
        } finally {
            // ローディング状態を解除
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md rounded-lg outline outline-gray-200">
            <div className="bg-white shadow-lg p-8">
                <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
                    ログイン
                </h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <Input
                        label="ID"
                        type="text"
                        name="id"
                        value={formData.id}
                        onChange={handleChange}
                        placeholder="IDを入力"
                        autoComplete="username"
                        required
                    />

                    <Input
                        label="パスワード"
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="パスワードを入力"
                        autoComplete="current-password"
                        required
                    />

                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                            <p className="text-sm text-red-600">{error}</p>
                        </div>
                    )}

                    <Button
                        type="submit"
                        isLoading={isLoading}
                        className="w-full"
                    >
                        ログイン
                    </Button>
                </form>
            </div>
        </div>
    );
}
