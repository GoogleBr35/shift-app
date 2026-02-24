'use client';

import { useState } from 'react';
import { Button } from '@/components/elements';

type TimePickerModalProps = {
    date: string;
    dates: string[];
    initialStartHour?: number;
    initialStartMinute?: number;
    initialEndHour?: number;
    initialEndMinute?: number;
    onConfirm: (startHour: number, startMinute: number, endHour: number, endMinute: number) => void;
    onApplyToOthers: (
        selectedDates: string[],
        startHour: number,
        startMinute: number,
        endHour: number,
        endMinute: number
    ) => void;
    onClose: () => void;
};

export const TimePickerModal = ({
    date,
    dates,
    initialStartHour = 10,
    initialStartMinute = 0,
    initialEndHour = 18,
    initialEndMinute = 0,
    onConfirm,
    onApplyToOthers,
    onClose,
}: TimePickerModalProps) => {
    const [mode, setMode] = useState<'pick' | 'apply'>('pick');
    const [startHour, setStartHour] = useState(initialStartHour);
    const [startMinute, setStartMinute] = useState(initialStartMinute);
    const [endHour, setEndHour] = useState(initialEndHour);
    const [endMinute, setEndMinute] = useState(initialEndMinute);
    const [selectedDates, setSelectedDates] = useState<string[]>([]);

    const handleOk = () => {
        if (mode === 'pick') {
            onConfirm(startHour, startMinute, endHour, endMinute);
        } else {
            onApplyToOthers(selectedDates, startHour, startMinute, endHour, endMinute);
        }
        onClose();
    };

    const toggleDate = (d: string) => {
        setSelectedDates((prev) =>
            prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/30 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal Card */}
            <div className="relative bg-white rounded-2xl shadow-xl p-6 w-[320px] max-w-[90vw] flex flex-col items-center gap-5">
                {mode === 'pick' ? (
                    <>
                        <h3 className="text-2xl font-bold">{date}日</h3>

                        {/* Start Time */}
                        <div className="flex items-center gap-2">
                            <HourInput value={startHour} onChange={setStartHour} />
                            <span className="text-2xl font-bold">:</span>
                            <MinuteSelect value={startMinute} onChange={setStartMinute} />
                        </div>

                        <span className="text-lg text-gray-500">から</span>

                        {/* End Time */}
                        <div className="flex items-center gap-2">
                            <HourInput value={endHour} onChange={setEndHour} />
                            <span className="text-2xl font-bold">:</span>
                            <MinuteSelect value={endMinute} onChange={setEndMinute} />
                        </div>

                        <Button
                            onClick={handleOk}
                            className="w-full bg-gray-800! hover:bg-gray-900! active:bg-gray-700!"
                        >
                            OK
                        </Button>

                        <button
                            onClick={() => setMode('apply')}
                            className="text-sm text-gray-600 border border-gray-300 rounded-lg px-4 py-2 hover:bg-gray-50 transition-colors"
                        >
                            他の日にも適用する
                        </button>
                    </>
                ) : (
                    <>
                        {/* Apply to other dates grid */}
                        <div className="grid grid-cols-4 gap-2 w-full">
                            {dates.map((d) => {
                                const isCurrentDate = d === date;
                                const isSelected = selectedDates.includes(d);
                                return (
                                    <button
                                        key={d}
                                        onClick={() => {
                                            if (!isCurrentDate) toggleDate(d);
                                        }}
                                        disabled={isCurrentDate}
                                        className={`
                                            aspect-square rounded-lg text-lg font-medium
                                            flex items-center justify-center transition-colors
                                            ${
                                                isCurrentDate
                                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                                    : isSelected
                                                      ? 'bg-gray-800 text-white'
                                                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }
                                        `}
                                    >
                                        {d}
                                    </button>
                                );
                            })}
                        </div>

                        <Button
                            onClick={handleOk}
                            className="w-full bg-gray-800! hover:bg-gray-900! active:bg-gray-700!"
                        >
                            OK
                        </Button>
                    </>
                )}
            </div>
        </div>
    );
};

/** 時（0-23）の入力 */
const HourInput = ({
    value,
    onChange,
}: {
    value: number;
    onChange: (v: number) => void;
}) => (
    <input
        type="number"
        min={0}
        max={23}
        value={value}
        onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            if (!isNaN(v) && v >= 0 && v <= 23) onChange(v);
        }}
        className="w-16 h-16 text-3xl font-bold text-center border-2 border-gray-200 rounded-xl
                   focus:outline-none focus:border-gray-800 appearance-none
                   [&::-webkit-inner-spin-button]:appearance-none
                   [&::-webkit-outer-spin-button]:appearance-none"
    />
);

/** 分（00 / 30）のセレクト */
const MinuteSelect = ({
    value,
    onChange,
}: {
    value: number;
    onChange: (v: number) => void;
}) => (
    <div className="relative">
        <select
            value={value}
            onChange={(e) => onChange(parseInt(e.target.value, 10))}
            className="w-16 h-16 text-3xl font-bold text-center border-2 border-gray-200 rounded-xl
                       focus:outline-none focus:border-gray-800 appearance-none bg-white cursor-pointer"
        >
            <option value={0}>00</option>
            <option value={30}>30</option>
        </select>
        <div className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none flex flex-col text-gray-400">
            <span className="text-xs leading-none">▲</span>
            <span className="text-xs leading-none">▼</span>
        </div>
    </div>
);
