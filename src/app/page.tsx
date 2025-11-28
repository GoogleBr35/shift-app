'use client'

import { useState } from 'react';
import { testConnection } from './actions';

export default function Home() {
  const [status, setStatus] = useState<string>('ボタンを押して接続テストを開始');
  const [loading, setLoading] = useState(false);

  const handleTest = async () => {
    setLoading(true);
    setStatus('接続中...');

    const result = await testConnection();
    setStatus(result.message);
    setLoading(false);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50 text-black">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md text-center">
        <h1 className="text-2xl font-bold mb-6">Google Sheets 接続テスト</h1>

        <div className="mb-6 p-4 bg-gray-100 rounded-md min-h-[80px] flex items-center justify-center">
          <p className={status.includes('エラー') ? 'text-red-500' : 'text-gray-700'}>
            {status}
          </p>
        </div>

        <button
          onClick={handleTest}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg disabled:opacity-50 transition-all"
        >
          {loading ? '確認中...' : 'A1セルを読み取る'}
        </button>
      </div>
    </main>
  );
}