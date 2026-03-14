'use client';

import type { PreviousShift } from '@/lib/GoogleSheets/getPreviousSubmit';

type ShiftDetailModalProps = {
    staffName: string;
    shifts: PreviousShift[];
    onClose: () => void;
};

export const ShiftDetailModal = ({ staffName, shifts, onClose }: ShiftDetailModalProps) => {
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-xl shadow-lg w-full max-w-sm mx-4 p-5"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-800">
                        {staffName}
                    </h3>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center text-gray-400
                                   hover:text-gray-600 transition-colors text-lg"
                    >
                        ✕
                    </button>
                </div>

                {/* Shift list */}
                <div className="flex flex-col gap-1.5">
                    {shifts.map((s) => (
                        <div
                            key={s.date}
                            className="flex items-center gap-3 py-1.5 border-b border-gray-100 last:border-b-0"
                        >
                            <span className="w-8 text-right font-bold text-gray-700">
                                {s.date}日
                            </span>
                            <span className="text-gray-600">:</span>
                            <span className="text-base font-medium text-gray-800">
                                {s.start} ~ {s.end}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Close button */}
                <button
                    onClick={onClose}
                    className="w-full mt-4 px-4 py-2 text-sm font-medium bg-gray-800 text-white
                               rounded-lg hover:bg-gray-900 active:bg-gray-700 transition-colors"
                >
                    閉じる
                </button>
            </div>
        </div>
    );
};
