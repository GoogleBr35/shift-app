import { describe, it, expect } from 'vitest';
import { getDaysInMonth, generateCalendarGrid } from './calendar';

describe('getDaysInMonth', () => {
    it.each([
        { year: 2026, month: 0, expectedLength: 31, description: '31日の月（1月）' },
        { year: 2026, month: 3, expectedLength: 30, description: '30日の月（4月）' },
        { year: 2026, month: 1, expectedLength: 28, description: '2月（平年）' },
        { year: 2024, month: 1, expectedLength: 29, description: '2月（うるう年）' },
        { year: 2026, month: 11, expectedLength: 31, description: '12月' },
    ])('$descriptionの日数を正しく計算し、最初と最後の日付が一致すること', ({ year, month, expectedLength }) => {
        // Given (前提条件): 特定の年月が指定されている

        // When (実行): getDaysInMonth を呼び出す
        const days = getDaysInMonth(year, month);

        // Then (検証): 正しい日数の配列が返り、全日付がその年月に属する
        expect(days).toHaveLength(expectedLength);
        expect(days[0].getDate()).toBe(1);
        expect(days[expectedLength - 1].getDate()).toBe(expectedLength);
        expect(days.every((d) => d.getFullYear() === year && d.getMonth() === month)).toBe(true);
    });
});

describe('generateCalendarGrid', () => {
    it.each([
        { year: 2026, month: 1, expectedNulls: 0, description: '2026年2月（1日が日曜日）' },
        { year: 2026, month: 0, expectedNulls: 4, description: '2026年1月（1日が木曜日）' },
        { year: 2026, month: 4, expectedNulls: 5, description: '2026年5月（1日が金曜日）' },
    ])('$descriptionの開始曜日に合わせて適切なオフセットを持つグリッドを生成すること', ({ year, month, expectedNulls }) => {
        // Given (前提条件): 特定の年月が指定されている
        const daysInMonthCount = getDaysInMonth(year, month).length;

        // When (実行): generateCalendarGrid を呼び出す
        const grid = generateCalendarGrid(year, month);

        // Then (検証): 先頭に正しい数の null が入り、合計サイズが正しい
        const actualNulls = grid.filter((cell) => cell === null).length;
        const actualDates = grid.filter((cell) => cell !== null).length;

        expect(actualNulls).toBe(expectedNulls);
        expect(actualDates).toBe(daysInMonthCount);
        expect(grid.length).toBe(expectedNulls + daysInMonthCount);

        // 最初の日付が1日であることも確認
        const firstDate = grid.find((cell) => cell !== null);
        expect(firstDate?.getDate()).toBe(1);
    });
});
