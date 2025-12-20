/**
 * 指定された年月の日付を配列で返す
 * @param year
 * @param month
 * @returns
 */
export const getDaysInMonth = (year: number, month: number) => {
    const date = new Date(year, month, 1);
    const days: Date[] = [];
    while (date.getMonth() === month) {
        // 月が同じ限り
        // 日付を配列に追加
        days.push(new Date(date));
        date.setDate(date.getDate() + 1);
    }
    return days;
};

/**
 * 指定された年月のカレンダーを配列で返す
 * @param year
 * @param month
 * @returns
 */
export const generateCalendarGrid = (year: number, month: number) => {
    const daysInMonth = getDaysInMonth(year, month);

    const firstDayOfMonth = daysInMonth[0].getDay(); // 1日目の曜日
    const grid: (Date | null)[] = [];

    // 空の日付を追加
    for (let i = 0; i < firstDayOfMonth; i++) {
        grid.push(null);
    }

    grid.push(...daysInMonth); // 日付を追加

    return grid;
};
