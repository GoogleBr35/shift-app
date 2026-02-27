'use server';

import { getGoogleSheets } from '@/lib/GoogleSheets/google';

export type ShiftColumn = {
    startCol: number;
    endCol: number;
    date: string;
};

/**
 * シフト表の日付列一覧を取得する
 * Row 3（日にち行）を走査し、数字が入っているセルを Date 列として返す
 * 各日付は2列（入り/上がり）で構成される
 */
export const getShiftColumns = async (
    sheetName: string
): Promise<{ columns: ShiftColumn[] }> => {
    try {
        const doc = await getGoogleSheets();
        const sheet = doc.sheetsByTitle[sheetName];

        if (!sheet) {
            throw new Error(`Sheet "${sheetName}" not found`);
        }

        await sheet.loadCells();

        const columns: ShiftColumn[] = [];
        const colCount = sheet.columnCount;

        // Row 3 (0-indexed) = 日にち行
        for (let col = 0; col < colCount; col++) {
            const cell = sheet.getCell(3, col);
            const value = cell.value;

            // 数字（日にち）が入っているセルを Date 列とみなす
            // 2列構造: startCol = 現在の列, endCol = 次の列
            if (value !== null && value !== '' && !isNaN(Number(value))) {
                columns.push({
                    startCol: col,
                    endCol: col + 1,
                    date: String(value),
                });
            }
        }

        return { columns };
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error fetching shift columns:', error);
        return { columns: [] };
    }
};
