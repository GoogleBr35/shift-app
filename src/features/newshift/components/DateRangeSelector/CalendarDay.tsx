'use client';

type CalendarDayProps = {
    date: Date | null;
    isSelected: boolean;
    isInRange: boolean;
    onClick: (date: Date) => void;
};

export const CalendarDay = ({
    date,
    isSelected,
    isInRange,
    onClick,
}: CalendarDayProps) => {
    // 日付がない場合は空の要素を返す
    if (!date) return <div className="aspect-square" />;

    // 日付を表示
    return (
        <div className="aspect-square">
            <button
                onClick={() => onClick(date)}
                className={`flex h-full w-full items-center justify-center rounded-lg text-base font-medium transition-colors touch-manipulation
                    ${isSelected ? 'bg-gray-800 font-bold text-white shadow-md' : ''}
                    ${isInRange ? 'bg-slate-200 text-gray-900' : ''}
                    ${!isSelected && !isInRange ? 'text-gray-700 hover:bg-gray-100 active:bg-gray-200' : ''}
                `}
                style={{
                    minHeight: '39px',
                    minWidth: '39px',
                }}
            >
                {date.getDate()}
            </button>
        </div>
    );
};
