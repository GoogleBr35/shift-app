'use client';

import { useState } from 'react';
import { Button } from '@/components/elements';
import { submitShift } from '@/features/submit/actions/submitShift';
import { TimePickerModal } from './TimePickerModal';

type ShiftValue = {
    startHour: number;
    startMinute: number;
    endHour: number;
    endMinute: number;
};

type ShiftInputProps = {
    token: string;
    sheetName: string;
    staffName: string;
    columns: { index: number; date: string }[];
    initialShifts: { colIndex: number; date: string; value: string }[];
    onSubmitComplete: (submittedShifts: { date: string; value: string }[]) => void;
};

/** 時間を hh.m 形式に変換 */
const formatTime = (hour: number, minute: number): string => {
    const m = minute === 30 ? '.5' : '.0';
    return `${hour}${m}`;
};

/** hh.m ~ hh.m 形式で表示 */
const formatShiftDisplay = (sv: ShiftValue): string => {
    return `${formatTime(sv.startHour, sv.startMinute)} ~ ${formatTime(sv.endHour, sv.endMinute)}`;
};

/** "hh.m ~ hh.m" 文字列をパース */
const parseShiftValue = (value: string): ShiftValue | null => {
    const match = value.match(/^(\d+)\.(\d)\s*~\s*(\d+)\.(\d)$/);
    if (!match) return null;
    const startHour = parseInt(match[1], 10);
    const startFrac = parseInt(match[2], 10);
    const endHour = parseInt(match[3], 10);
    const endFrac = parseInt(match[4], 10);
    return {
        startHour,
        startMinute: startFrac === 5 ? 30 : 0,
        endHour,
        endMinute: endFrac === 5 ? 30 : 0,
    };
};

/** シフト値を保存用文字列に変換 */
const shiftToString = (sv: ShiftValue): string => {
    return `${formatTime(sv.startHour, sv.startMinute)} ~ ${formatTime(sv.endHour, sv.endMinute)}`;
};

export const ShiftInput = ({
    token,
    sheetName,
    staffName,
    columns,
    initialShifts,
    onSubmitComplete,
}: ShiftInputProps) => {
    // 初期値をパース
    const initValues: Record<string, ShiftValue | null> = {};
    for (const shift of initialShifts) {
        initValues[shift.date] = shift.value ? parseShiftValue(shift.value) : null;
    }

    const [shifts, setShifts] = useState<Record<string, ShiftValue | null>>(initValues);
    const [modalDate, setModalDate] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const dateRange = sheetName.replace('_', ' 〜 ');
    const allDates = columns.map((c) => c.date);

    const handleSetShift = (
        date: string,
        startHour: number,
        startMinute: number,
        endHour: number,
        endMinute: number
    ) => {
        setShifts((prev) => ({
            ...prev,
            [date]: { startHour, startMinute, endHour, endMinute },
        }));
    };

    const handleClearShift = (date: string) => {
        setShifts((prev) => ({
            ...prev,
            [date]: null,
        }));
    };

    const handleApplyToOthers = (
        selectedDates: string[],
        startHour: number,
        startMinute: number,
        endHour: number,
        endMinute: number
    ) => {
        setShifts((prev) => {
            const next = { ...prev };
            for (const d of selectedDates) {
                next[d] = { startHour, startMinute, endHour, endMinute };
            }
            return next;
        });
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const shiftEntries = columns.map((col) => {
                const sv = shifts[col.date];
                return {
                    colIndex: col.index,
                    value: sv ? shiftToString(sv) : '',
                };
            });

            const result = await submitShift(token, staffName, shiftEntries);
            if (result.success) {
                const submittedData = columns.map((col) => {
                    const sv = shifts[col.date];
                    return { date: col.date, value: sv ? shiftToString(sv) : '' };
                });
                onSubmitComplete(submittedData);
            } else {
                alert(result.error ?? 'シフトの提出に失敗しました');
            }
        } catch {
            alert('シフトの提出に失敗しました');
        } finally {
            setIsSubmitting(false);
        }
    };

    const currentShift = modalDate ? shifts[modalDate] : null;

    return (
        <div className="w-full max-w-md flex flex-col items-center gap-4">
            <div className="w-full rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                {/* Header */}
                <h2 className="text-lg font-bold text-center mb-1">{staffName}</h2>
                <p className="text-sm text-gray-500 text-center mb-4">{dateRange}</p>

                {/* Date rows */}
                <div className="flex flex-col gap-2">
                    {columns.map((col) => {
                        const sv = shifts[col.date];
                        return (
                            <div
                                key={col.date}
                                className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-b-0"
                            >
                                {/* Date */}
                                <span className="w-8 text-right font-bold text-lg">
                                    {col.date}
                                </span>

                                {/* Time display */}
                                <span className="flex-1 text-center text-base font-medium text-gray-700">
                                    {sv ? formatShiftDisplay(sv) : '-- ~ --'}
                                </span>

                                {/* Action buttons */}
                                <div className="flex items-center justify-start gap-1 w-24">
                                    {sv ? (
                                        <>
                                            <button
                                                onClick={() => setModalDate(col.date)}
                                                className="px-3 py-1.5 text-sm font-medium bg-gray-800 text-white rounded-lg
                                                           hover:bg-gray-900 active:bg-gray-700 transition-colors"
                                            >
                                                変更
                                            </button>
                                            <button
                                                onClick={() => handleClearShift(col.date)}
                                                className="w-8 h-8 flex items-center justify-center text-gray-400
                                                           hover:text-red-500 transition-colors text-lg"
                                            >
                                                ✕
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            onClick={() => setModalDate(col.date)}
                                            className="w-full px-3 py-1.5 text-sm font-medium bg-gray-800 text-white rounded-lg
                                                       hover:bg-gray-900 active:bg-gray-700 transition-colors"
                                        >
                                            出勤
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Submit button */}
            <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                isLoading={isSubmitting}
                className={`w-full sm:w-auto px-8! py-3! text-base! font-bold ${isSubmitting
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gray-800! hover:bg-gray-900! active:bg-gray-700!'
                    }`}
            >
                提出
            </Button>

            {/* Time Picker Modal */}
            {modalDate && (
                <TimePickerModal
                    date={modalDate}
                    dates={allDates}
                    initialStartHour={currentShift?.startHour ?? 10}
                    initialStartMinute={currentShift?.startMinute ?? 0}
                    initialEndHour={currentShift?.endHour ?? 18}
                    initialEndMinute={currentShift?.endMinute ?? 0}
                    onConfirm={(sh, sm, eh, em) => {
                        handleSetShift(modalDate, sh, sm, eh, em);
                    }}
                    onApplyToOthers={(dates, sh, sm, eh, em) => {
                        handleSetShift(modalDate, sh, sm, eh, em);
                        handleApplyToOthers(dates, sh, sm, eh, em);
                    }}
                    onClose={() => setModalDate(null)}
                />
            )}
        </div>
    );
};
