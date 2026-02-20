'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button, Input } from '@/components/elements';
import { useRouter } from 'next/navigation';

type ShareUrlCardProps = {
    spreadsheetId: string;
};

export const ShareUrlCard = ({ spreadsheetId }: ShareUrlCardProps) => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [copied, setCopied] = useState(false);

    const sheetName = searchParams.get('sheet') ?? '';
    /******************/
    const url = spreadsheetId
        ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
        : '';
    /******************/

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            alert('コピーに失敗しました');
        }
    };

    // sheetName は "yyyy-mm-dd_yyyy-mm-dd" 形式
    const dateRange = sheetName
        ? sheetName.replace('_', ' 〜 ')
        : '';

    return (
        <div className="w-full max-w-md flex flex-col items-center gap-6">
            <div className="w-full rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-bold text-center mb-2">
                    シフト表を作成しました
                </h2>

                {dateRange && (
                    <p className="text-lg text-gray-500 text-center mb-10">
                        期間: {dateRange}
                    </p>
                )}

                <div>
                    <p className="text-sm text-gray-600 mb-2">
                        以下のURLをスタッフに共有してください。
                    </p>
                    <div className="flex gap-2">
                        <div className="flex-1">
                            <Input
                                value={url}
                                readOnly
                                className="bg-gray-50 text-sm font-mono w-full"
                            />
                        </div>
                        <Button
                            onClick={handleCopy}
                            className={`whitespace-nowrap px-4! ${copied ? 'bg-green-600! hover:bg-green-700!' : 'bg-gray-800! hover:bg-gray-900! active:bg-gray-700!'}`}
                        >
                            {copied ? '✓' : 'コピー'}
                        </Button>
                    </div>
                </div>
            </div>

            <Button
                onClick={() => router.push('/')}
                className="w-full sm:w-auto bg-gray-800! hover:bg-gray-900! active:bg-gray-700!"
            >
                トップへ戻る
            </Button>
        </div>
    );
};
