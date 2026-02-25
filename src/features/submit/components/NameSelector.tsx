'use client';

import { useState } from 'react';
import { Button, Spinner } from '@/components/elements';
import type { MemberData } from '@/lib/GoogleSheets/getMember';
import { getShiftColumns } from '@/lib/GoogleSheets/getShiftColumns';
import { getStaffShift } from '@/lib/GoogleSheets/getStaffShift';
import { ShiftInput } from './ShiftInput';
import { SubmissionComplete } from './SubmissionComplete';

type NameSelectorProps = {
    sheetName: string;
    memberList: MemberData;
    token: string;
};

type ShiftData = {
    columns: { index: number; date: string }[];
    initialShifts: { colIndex: number; date: string; value: string }[];
};

type Step = 'select' | 'loading' | 'input' | 'complete';

export const NameSelector = ({ sheetName, memberList, token }: NameSelectorProps) => {
    // アルバイトのみ抽出（重複排除）
    const partTimeNames = [
        ...new Set([...memberList.LunchPartTime, ...memberList.DinnerPartTime]),
    ];

    const [selectedName, setSelectedName] = useState<string | null>(null);
    const [step, setStep] = useState<Step>('select');
    const [shiftData, setShiftData] = useState<ShiftData | null>(null);
    // 提出済みデータ（complete画面用）
    const [submittedShifts, setSubmittedShifts] = useState<{ date: string; value: string }[]>([]);

    const dateRange = sheetName.replace('_', ' 〜 ');

    const handleConfirm = async () => {
        if (!selectedName) return;

        setStep('loading');
        try {
            const { columns } = await getShiftColumns(sheetName);
            const { submitted, shifts } = await getStaffShift(sheetName, selectedName, columns);

            setShiftData({ columns, initialShifts: shifts });

            // 4-3: 提出済みなら SubmissionComplete を直接表示
            if (submitted) {
                setSubmittedShifts(
                    shifts.map((s) => ({ date: s.date, value: s.value }))
                );
                setStep('complete');
            } else {
                setStep('input');
            }
        } catch {
            alert('データの取得に失敗しました');
            setStep('select');
        }
    };

    // 4-2: 提出完了後に SubmissionComplete へ遷移
    const handleSubmitComplete = (data: { date: string; value: string }[]) => {
        setSubmittedShifts(data);
        // 修正フロー用に initialShifts も更新
        if (shiftData) {
            setShiftData({
                ...shiftData,
                initialShifts: shiftData.columns.map((col) => {
                    const found = data.find((d) => d.date === col.date);
                    return {
                        colIndex: col.index,
                        date: col.date,
                        value: found?.value ?? '',
                    };
                }),
            });
        }
        setStep('complete');
    };

    // 4-4: 修正ボタンから ShiftInput へ戻る
    const handleEdit = () => {
        setStep('input');
    };

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
    if (step === 'complete' && selectedName) {
        return (
            <SubmissionComplete
                staffName={selectedName}
                shifts={submittedShifts}
                onEdit={handleEdit}
            />
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

                <select
                    value={selectedName ?? ''}
                    onChange={(e) => setSelectedName(e.target.value || null)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white
                               text-base font-medium text-gray-700
                               focus:outline-none focus:border-gray-800 transition-colors cursor-pointer"
                >
                    <option value="">選択してください</option>
                    {partTimeNames.map((name) => (
                        <option key={name} value={name}>
                            {name}
                        </option>
                    ))}
                </select>
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
