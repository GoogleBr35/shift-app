'use client';

import { useState } from 'react';
import { Button, Spinner } from '@/components/elements';
import type { MemberData } from '@/lib/GoogleSheets/getMember';
import { getShiftColumns } from '@/lib/GoogleSheets/getShiftColumns';
import { getStaffShift } from '@/lib/GoogleSheets/getStaffShift';
import { ShiftInput } from './ShiftInput';

type NameSelectorProps = {
    sheetName: string;
    memberList: MemberData;
    token: string;
};

type CategoryKey = keyof MemberData;

type ShiftData = {
    columns: { index: number; date: string }[];
    initialShifts: { colIndex: number; date: string; value: string }[];
};

type Step = 'select' | 'loading' | 'input' | 'complete';

const categoryLabels: Record<CategoryKey, string> = {
    LunchStaff: 'ランチ 社員',
    LunchPartTime: 'ランチ アルバイト',
    DinnerStaff: 'ディナー 社員',
    DinnerPartTime: 'ディナー アルバイト',
};

export const NameSelector = ({ sheetName, memberList, token }: NameSelectorProps) => {
    const [selectedName, setSelectedName] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<CategoryKey | null>(null);
    const [step, setStep] = useState<Step>('select');
    const [shiftData, setShiftData] = useState<ShiftData | null>(null);

    const dateRange = sheetName.replace('_', ' 〜 ');

    const handleSelect = (name: string, category: CategoryKey) => {
        setSelectedName(name);
        setSelectedCategory(category);
    };

    const handleConfirm = async () => {
        if (!selectedName || !selectedCategory) return;

        setStep('loading');
        try {
            const { columns } = await getShiftColumns(sheetName);
            const { shifts } = await getStaffShift(sheetName, selectedName, columns);
            setShiftData({ columns, initialShifts: shifts });
            setStep('input');
        } catch {
            alert('データの取得に失敗しました');
            setStep('select');
        }
    };

    const handleSubmitComplete = () => {
        setStep('complete');
    };

    const categories = (Object.keys(categoryLabels) as CategoryKey[]).filter(
        (key) => memberList[key].length > 0
    );

    // Step: loading
    if (step === 'loading') {
        return (
            <div className="w-full max-w-md flex flex-col items-center gap-4 py-12">
                <Spinner size="lg" />
                <p className="text-gray-500">データを読み込んでいます...</p>
            </div>
        );
    }

    // Step: input
    if (step === 'input' && shiftData && selectedName) {
        return (
            <ShiftInput
                token={token}
                sheetName={sheetName}
                staffName={selectedName}
                columns={shiftData.columns}
                initialShifts={shiftData.initialShifts}
                onSubmitComplete={handleSubmitComplete}
            />
        );
    }

    // Step: complete
    if (step === 'complete') {
        return (
            <div className="w-full max-w-md flex flex-col items-center gap-6 py-8">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-800">提出完了</h2>
                <p className="text-gray-500 text-sm text-center">
                    {selectedName}さんのシフトを提出しました。
                </p>
            </div>
        );
    }

    // Step: select (default)
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
