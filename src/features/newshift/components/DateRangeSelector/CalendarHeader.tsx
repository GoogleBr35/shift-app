'use client';

type CalendarHeaderProps = {
    currentDate: Date;
    onPrevMonth: () => void;
    onNextMonth: () => void;
};

export const CalendarHeader = ({
    currentDate,
    onPrevMonth,
    onNextMonth,
}: CalendarHeaderProps) => {
    return (
        <div className="mb-6 flex items-center justify-between">
            <button
                onClick={onPrevMonth}
                className="rounded-lg p-3 text-gray-600 hover:bg-gray-100"
            >
                &lt;
            </button>
            <h2 className="text-xl font-bold text-gray-800">
                {currentDate.getFullYear()}年 {currentDate.getMonth() + 1}月
            </h2>
            <button
                onClick={onNextMonth}
                className="rounded-lg p-3 text-gray-600 hover:bg-gray-100"
            >
                &gt;
            </button>
        </div>
    );
};
