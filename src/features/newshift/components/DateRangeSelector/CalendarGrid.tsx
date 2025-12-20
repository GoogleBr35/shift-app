'use client';

import { generateCalendarGrid } from '@/utils/calendar';
import { CalendarDay } from './CalendarDay';

const DAYS_OF_WEEK = [
    { key: 'sun', label: '日' },
    { key: 'mon', label: '月' },
    { key: 'tue', label: '火' },
    { key: 'wed', label: '水' },
    { key: 'thu', label: '木' },
    { key: 'fri', label: '金' },
    { key: 'sat', label: '土' },
];

type CalendarGridProps = {
    year: number;
    month: number;
    startDate: Date | null;
    endDate: Date | null;
    onDateClick: (date: Date) => void;
};

export const CalendarGrid = ({
    year,
    month,
    startDate,
    endDate,
    onDateClick,
}: CalendarGridProps) => {
    // カレンダー生成
    const calendarGrid = generateCalendarGrid(year, month);

    // 選択されている日付
    const isSelected = (date: Date) => {
        if (startDate && date.getTime() === startDate.getTime()) return true;
        if (endDate && date.getTime() === endDate.getTime()) return true;
        return false;
    };

    // 選択範囲内
    const isInRange = (date: Date) => {
        if (!startDate || !endDate) return false; // 選択範囲がない場合はfalse
        return date > startDate && date < endDate; // 選択範囲内
    };

    return (
        <div className="grid grid-cols-7 gap-2 text-center text-base">
            {DAYS_OF_WEEK.map((day) => (
                <div key={day.key} className="py-3 font-semibold text-gray-500">
                    {day.label}
                </div>
            ))}

            {calendarGrid.map((date, index) => (
                <CalendarDay
                    key={index}
                    date={date}
                    isSelected={date ? isSelected(date) : false}
                    isInRange={date ? isInRange(date) : false}
                    onClick={onDateClick}
                />
            ))}
        </div>
    );
};
