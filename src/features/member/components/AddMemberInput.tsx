'use client';

import React, { useState } from 'react';
import { addMember } from '@/lib/GoogleSheets/addMember';

type AddMemberInputProps = {
    categoryKey: string;
};

export const AddMemberInput: React.FC<AddMemberInputProps> = ({
    categoryKey,
}) => {
    const [name, setName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            await addMember(name, categoryKey);
            setName('');
        } catch (error) {
            alert('メンバーの追加に失敗しました: ' + error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSubmit();
        }
    };

    return (
        <div className="flex items-center gap-2 p-2 mt-2 border-t border-gray-100">
            <div className="flex-1">
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="新しいメンバーを追加..."
                    disabled={isSubmitting}
                    className="w-full px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500 transition-colors"
                />
            </div>
            <button
                onClick={handleSubmit}
                disabled={isSubmitting || !name.trim()}
                className="p-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
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
                        d="M12 4.5v15m7.5-7.5h-15"
                    />
                </svg>
            </button>
        </div>
    );
};
