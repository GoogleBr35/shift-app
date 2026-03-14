'use client';

import { useState } from 'react';
import type { MemberStatus } from '@/lib/GoogleSheets/getSubmissionStatus';
import { getPreviousSubmit } from '@/lib/GoogleSheets/getPreviousSubmit';
import type { PreviousShift } from '@/lib/GoogleSheets/getPreviousSubmit';
import { ShiftDetailModal } from './ShiftDetailModal';

type StatusBoardProps = {
    sheetName: string;
    members: MemberStatus[];
    shareUrl: string | null;
};

export const StatusBoard = ({ sheetName, members, shareUrl }: StatusBoardProps) => {
    const [copied, setCopied] = useState(false);
    const [modalData, setModalData] = useState<{ staffName: string; shifts: PreviousShift[] } | null>(null);
    const [loadingName, setLoadingName] = useState<string | null>(null);

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

    const handleViewShift = async (staffName: string) => {
        setLoadingName(staffName);
        try {
            const shifts = await getPreviousSubmit(sheetName, staffName);
            if (shifts && shifts.length > 0) {
                setModalData({ staffName, shifts });
            } else {
                alert('提出データが見つかりません');
            }
        } catch {
            alert('データの取得に失敗しました');
        } finally {
            setLoadingName(null);
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
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleViewShift(m.name)}
                                    disabled={!m.submitted || loadingName === m.name}
                                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors
                                        ${m.submitted
                                            ? 'bg-gray-800 text-white hover:bg-gray-900 active:bg-gray-700'
                                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                        }`}
                                >
                                    {loadingName === m.name ? '...' : '確認'}
                                </button>
                                <span className="text-xl">
                                    {m.submitted ? '✅' : '❌'}
                                </span>
                            </div>
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

            {/* Shift Detail Modal */}
            {modalData && (
                <ShiftDetailModal
                    staffName={modalData.staffName}
                    shifts={modalData.shifts}
                    onClose={() => setModalData(null)}
                />
            )}
        </div>
    );
};
