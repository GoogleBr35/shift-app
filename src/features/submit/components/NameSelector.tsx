'use client';

import { useState } from 'react';
import { Button } from '@/components/elements';
import type { MemberData } from '@/lib/GoogleSheets/getMember';

type NameSelectorProps = {
    sheetName: string;
    memberList: MemberData;
    token: string;
};

type CategoryKey = keyof MemberData;

const categoryLabels: Record<CategoryKey, string> = {
    LunchStaff: 'ランチ 社員',
    LunchPartTime: 'ランチ アルバイト',
    DinnerStaff: 'ディナー 社員',
    DinnerPartTime: 'ディナー アルバイト',
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const NameSelector = ({ sheetName, memberList, token }: NameSelectorProps) => {
    const [selectedName, setSelectedName] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<CategoryKey | null>(null);

    const dateRange = sheetName.replace('_', ' 〜 ');

    const handleSelect = (name: string, category: CategoryKey) => {
        setSelectedName(name);
        setSelectedCategory(category);
    };

    const handleConfirm = () => {
        if (!selectedName || !selectedCategory) return;
        // TODO: シフト入力画面へ遷移
        alert(`${selectedName}（${categoryLabels[selectedCategory]}）を選択しました`);
    };

    const categories = (Object.keys(categoryLabels) as CategoryKey[]).filter(
        (key) => memberList[key].length > 0
    );

    return (
        <div className="w-full max-w-md flex flex-col items-center gap-6">
            <div className="w-full rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-bold text-center mb-2">
                    {dateRange}
                </h2>
                <h2 className="text-lg text-center mb-6">
                    のシフトを提出しましょう
                </h2>

                <p className="text-sm text-gray-600 mb-4">
                    あなたの名前を選択してください。
                </p>

                <div className="flex flex-col gap-4">
                    {categories.map((category) => (
                        <div key={category}>
                            <h3 className="text-sm font-semibold text-gray-500 mb-2">
                                {categoryLabels[category]}
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {memberList[category].map((name) => {
                                    const isSelected =
                                        selectedName === name &&
                                        selectedCategory === category;
                                    return (
                                        <button
                                            key={`${category}-${name}`}
                                            onClick={() =>
                                                handleSelect(name, category)
                                            }
                                            className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors duration-150
                                                ${
                                                    isSelected
                                                        ? 'bg-gray-800 text-white border-gray-800'
                                                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                                                }`}
                                        >
                                            {name}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <Button
                onClick={handleConfirm}
                disabled={!selectedName}
                className={`w-full sm:w-auto px-8! py-3! text-base! font-bold ${
                    !selectedName
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-gray-800! hover:bg-gray-900! active:bg-gray-700!'
                }`}
            >
                次へ
            </Button>
        </div>
    );
};
