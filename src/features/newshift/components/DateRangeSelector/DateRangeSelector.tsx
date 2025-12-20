'use client';

import { useState } from 'react';
import RouterCard from '@/components/elements/RouterCard';
import { CalendarGrid } from './CalendarGrid';
import { CalendarHeader } from './CalendarHeader';

export default function DateRangeSelector() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);

    // 日付クリック時 (日付選択ロジック)
    const handleDateClick = (date: Date) => {
        if (!startDate && !endDate) {
            // 開始日が未選択の場合は、開始日を設定
            setStartDate(date);
        } else if (startDate && !endDate) {
            // 終了日が未選択の場合は、終了日を設定
            if (date < startDate) {
                // 開始日の方が大きい場合は、開始日と終了日を入れ替える
                setEndDate(startDate);
                setStartDate(date);
            } else {
                // 開始日の方が小さい場合は、終了日を設定
                setEndDate(date);
            }
        } else if (startDate && endDate) {
            // 選択範囲が既に選択されている場合は、リセット
            setStartDate(date);
            setEndDate(null);
        }
    };

    // 前月のクリック時
    const handlePrevMonth = () => {
        setCurrentDate(
            new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
        );
    };

    // 次月のクリック時
    const handleNextMonth = () => {
        setCurrentDate(
            new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
        );
    };

    // 日付のフォーマット
    const formatDate = (date: Date) => {
        return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
    };

    // 決定のクリック時
    const handleConfirm = () => {
        if (startDate && endDate) {
            const startStr = formatDate(startDate);
            const endStr = formatDate(endDate);
            console.log(startStr, endStr);
        }
    };

    return (
        <div className="w-full flex flex-col items-center gap-6 p-4">
            <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <CalendarHeader
                    currentDate={currentDate}
                    onPrevMonth={handlePrevMonth}
                    onNextMonth={handleNextMonth}
                />
                <CalendarGrid
                    year={currentDate.getFullYear()}
                    month={currentDate.getMonth()}
                    startDate={startDate}
                    endDate={endDate}
                    onDateClick={handleDateClick}
                />
            </div>

            <RouterCard
                title="期間確定"
                description={
                    startDate && endDate
                        ? `開始: ${formatDate(startDate)}\n終了: ${formatDate(endDate)}`
                        : 'カレンダーから開始日と終了日を選択してください'
                }
                label="決定"
                buttonDisabled={!startDate || !endDate}
                path="/"
                onClick={handleConfirm}
            />
        </div>
    );
}
