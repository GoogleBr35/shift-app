'use client';

import { Button } from '@/components/elements';

type ShiftEntry = {
    date: string;
    value: string;
};

type SubmissionCompleteProps = {
    staffName: string;
    shifts: ShiftEntry[];
    onEdit: () => void;
};

export const SubmissionComplete = ({
    staffName,
    shifts,
    onEdit,
}: SubmissionCompleteProps) => {
    return (
        <div className="w-full max-w-md flex flex-col items-center gap-6">
            <div className="w-full rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                {/* Success icon */}
                <div className="flex justify-center mb-4">
                    <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                        <svg
                            className="w-7 h-7 text-green-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                            />
                        </svg>
                    </div>
                </div>

                <h2 className="text-xl font-bold text-center mb-1">提出完了</h2>
                <p className="text-sm text-gray-500 text-center mb-6">
                    {staffName}さんのシフト
                </p>

                {/* Shift list */}
                <div className="flex flex-col gap-1">
                    {shifts.map((s) => (
                        <div
                            key={s.date}
                            className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-b-0"
                        >
                            <span className="w-8 text-right font-bold text-lg">
                                {s.date}
                            </span>
                            <span className="flex-1 text-center text-base font-medium text-gray-700">
                                {s.value || '-- ~ --'}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            <Button
                onClick={onEdit}
                className="w-full sm:w-auto px-8! py-3! text-base! font-bold bg-gray-800! hover:bg-gray-900! active:bg-gray-700!"
            >
                修正する
            </Button>
        </div>
    );
};
