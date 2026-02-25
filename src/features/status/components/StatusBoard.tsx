'use client';

import { useState } from 'react';
import type { MemberStatus } from '@/lib/GoogleSheets/getSubmissionStatus';

type StatusBoardProps = {
    sheetName: string;
    members: MemberStatus[];
    shareUrl: string | null;
};

export const StatusBoard = ({ sheetName, members, shareUrl }: StatusBoardProps) => {
    const [copied, setCopied] = useState(false);

    const dateRange = sheetName.replace('_', ' 〜 ');
    const submittedCount = members.filter((m) => m.submitted).length;

    const handleCopy = async () => {
        if (!shareUrl) return;
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            alert('コピーに失敗しました');
        }
    };

    return (
        <div className="w-full max-w-md flex flex-col gap-4">
            {/* Header */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-bold text-center mb-1">{dateRange}</h2>
                <p className="text-sm text-gray-500 text-center">
                    提出済み: {submittedCount} / {members.length}
                </p>
            </div>

            {/* Member list */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-1">
                    {members.map((m) => (
                        <div
                            key={m.name}
                            className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0"
                        >
                            <span className="text-base font-medium text-gray-700">
                                {m.name}
                            </span>
                            <span className="text-xl">
                                {m.submitted ? '✅' : '❌'}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Share URL */}
            {shareUrl && (
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <p className="text-sm font-semibold text-gray-600 mb-2">共有URL</p>
                    <div className="flex gap-2">
                        <input
                            readOnly
                            value={shareUrl}
                            className="flex-1 px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg
                                       truncate focus:outline-none"
                        />
                        <button
                            onClick={handleCopy}
                            className="px-4 py-2 text-sm font-medium bg-gray-800 text-white rounded-lg
                                       hover:bg-gray-900 active:bg-gray-700 transition-colors whitespace-nowrap"
                        >
                            {copied ? 'コピー済み' : 'コピー'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
