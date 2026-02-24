import { describe, it, expect } from 'vitest';
import { getDaysInMonth, generateCalendarGrid } from './calendar';

describe('getDaysInMonth', () => {
    it('31日の月（1月）の日数を正しく返す', () => {
        const days = getDaysInMonth(2026, 0); // 2026年1月
        expect(days).toHaveLength(31);
        expect(days[0].getDate()).toBe(1);
        expect(days[30].getDate()).toBe(31);
    });

    it('30日の月（4月）の日数を正しく返す', () => {
        const days = getDaysInMonth(2026, 3); // 2026年4月
        expect(days).toHaveLength(30);
    });

    it('2月（平年）の日数を正しく返す', () => {
        const days = getDaysInMonth(2026, 1); // 2026年2月（平年）
        expect(days).toHaveLength(28);
    });

    it('2月（うるう年）の日数を正しく返す', () => {
        const days = getDaysInMonth(2024, 1); // 2024年2月（うるう年）
        expect(days).toHaveLength(29);
    });

    it('12月（month=11）の日数を正しく返す', () => {
        const days = getDaysInMonth(2026, 11); // 2026年12月
        expect(days).toHaveLength(31);
    });

    it('返される日付がすべて同じ月に属する', () => {
        const days = getDaysInMonth(2026, 2); // 2026年3月
        for (const day of days) {
            expect(day.getMonth()).toBe(2);
            expect(day.getFullYear()).toBe(2026);
        }
    });
});

describe('generateCalendarGrid', () => {
    it('月初の曜日分だけ null が先頭に入る', () => {
        // 2026年2月1日は日曜日 → getDay() === 0 → nullは0個
        const grid = generateCalendarGrid(2026, 1);
        // 先頭のnullを数える
        let nullCount = 0;
        for (const cell of grid) {
            if (cell === null) nullCount++;
            else break;
        }
        const firstDay = new Date(2026, 1, 1).getDay();
        expect(nullCount).toBe(firstDay);
    });

    it('グリッド内の日付が1日から始まり末日で終わる', () => {
        const grid = generateCalendarGrid(2026, 0); // 2026年1月
        const dates = grid.filter((d): d is Date => d !== null);
        expect(dates[0].getDate()).toBe(1);
        expect(dates[dates.length - 1].getDate()).toBe(31);
    });

    it('グリッドの合計要素数 = null数 + 日数', () => {
        const year = 2026;
        const month = 3; // 4月
        const grid = generateCalendarGrid(year, month);
        const nulls = grid.filter((d) => d === null).length;
        const dates = grid.filter((d) => d !== null).length;
        const daysInMonth = getDaysInMonth(year, month).length;
        expect(nulls + dates).toBe(grid.length);
        expect(dates).toBe(daysInMonth);
    });
});
