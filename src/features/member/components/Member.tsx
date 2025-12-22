'use client';

import React, { useState } from 'react';
import { deleteMember } from '@/lib/GoogleSheets/deleteMember';

interface MemberProps {
    name: string;
    categoryKey: string;
}

export const Member: React.FC<MemberProps> = ({ name, categoryKey }) => {
    const [isDeleting, setIsDeleting] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            // 削除処理
            await deleteMember(name, categoryKey);
            setShowConfirm(false);
        } catch (error) {
            alert('削除に失敗しました: ' + error);
            setIsDeleting(false);
        }
    };

    if (showConfirm) {
        return (
            <div className="py-2 px-4 border-b border-gray-100 last:border-b-0 bg-red-50 flex items-center justify-between animate-in fade-in duration-200">
                <span className="text-sm text-red-800 font-medium">
                    本当に削除しますか？
                </span>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowConfirm(false)}
                        disabled={isDeleting}
                        className="text-xs px-2 py-1 rounded bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                    >
                        キャンセル
                    </button>
                    <button
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="text-xs px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                    >
                        {isDeleting ? '削除中...' : '削除'}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="py-2 px-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 text-gray-700 flex justify-between items-center group">
            <span>{name}</span>
            <button
                onClick={() => setShowConfirm(true)}
                className="text-gray-400 hover:text-red-500 transition-all p-1"
                aria-label="削除"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-5 h-5"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                    />
                </svg>
            </button>
        </div>
    );
};
