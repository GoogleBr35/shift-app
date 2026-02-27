'use client';

import { useState } from 'react';
import { Button } from '@/components/elements';
import { submitShift } from '@/features/submit/actions/submitShift';
import { TimePickerModal } from './TimePickerModal';
import type { ShiftColumn } from '@/lib/GoogleSheets/getShiftColumns';
import type { StaffShiftEntry } from '@/lib/GoogleSheets/getStaffShift';

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
    columns: ShiftColumn[];
    initialShifts: StaffShiftEntry[];
    onSubmitComplete: (submittedShifts: { date: string; startValue: number | null; endValue: number | null }[]) => void;
};

/** 時間を数値に変換 (e.g. 10, 0 → 10.0 / 10, 30 → 10.5) */
const toNumericTime = (hour: number, minute: number): number => {
    return hour + (minute === 30 ? 0.5 : 0);
};

/** 時間を表示用文字列に変換 */
const formatTime = (hour: number, minute: number): string => {
    const m = minute === 30 ? '.5' : '.0';
    return `${hour}${m}`;
};

/** hh.m ~ hh.m 形式で表示 */
const formatShiftDisplay = (sv: ShiftValue): string => {
    return `${formatTime(sv.startHour, sv.startMinute)} ~ ${formatTime(sv.endHour, sv.endMinute)}`;
};

/** 開始/終了の数値から ShiftValue をパース */
const parseShiftValues = (startValue: number | null, endValue: number | null): ShiftValue | null => {
    if (startValue === null && endValue === null) return null;
    const parseOne = (val: number | null) => {
        if (val === null) return null;
        const hour = Math.floor(val);
        const minute = (val % 1) >= 0.25 ? 30 : 0;
        return { hour, minute };
    };
    const start = parseOne(startValue);
    const end = parseOne(endValue);
    if (!start || !end) return null;
    return {
        startHour: start.hour,
        startMinute: start.minute,
        endHour: end.hour,
        endMinute: end.minute,
    };
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
        initValues[shift.date] = parseShiftValues(shift.startValue, shift.endValue);
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
                    startCol: col.startCol,
                    endCol: col.endCol,
                    startValue: sv ? toNumericTime(sv.startHour, sv.startMinute) : null,
                    endValue: sv ? toNumericTime(sv.endHour, sv.endMinute) : null,
                };
            });

            const result = await submitShift(token, staffName, shiftEntries);
            if (result.success) {
                const submittedData = columns.map((col) => {
                    const sv = shifts[col.date];
                    return {
                        date: col.date,
                        startValue: sv ? toNumericTime(sv.startHour, sv.startMinute) : null,
                        endValue: sv ? toNumericTime(sv.endHour, sv.endMinute) : null,
                    };
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
                                <div className="flex items-center gap-1">
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
                                            className="px-3 py-1.5 text-sm font-medium bg-gray-800 text-white rounded-lg
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
