'use server';

import { getGoogleSheets } from '@/lib/GoogleSheets/google';
import type { ShiftColumn } from '@/lib/GoogleSheets/getShiftColumns';

export type StaffShiftEntry = {
    startCol: number;
    endCol: number;
    date: string;
    startValue: string;
    endValue: string;
};

export type StaffShiftData = {
    submitted: boolean;
    shifts: StaffShiftEntry[];
};

/**
 * スタッフの既存シフトデータを取得する
 * Member列から staffName の行を見つけ、各 Date 列の入り/上がりセル値を返す
 */
export const getStaffShift = async (
    sheetName: string,
    staffName: string,
    dateColumns: ShiftColumn[]
): Promise<StaffShiftData> => {
    try {
        const doc = await getGoogleSheets();
        const sheet = doc.sheetsByTitle[sheetName];

        if (!sheet) {
            throw new Error(`Sheet "${sheetName}" not found`);
        }

        await sheet.loadCells();

        const rowCount = sheet.rowCount;

        // Member列（メンバー名が書かれている列）から staffName の行を検索
        // Row 5+ がBody行
        let staffRow = -1;
        for (let row = 5; row < rowCount; row++) {
            for (let col = 0; col < sheet.columnCount; col++) {
                const cell = sheet.getCell(row, col);
                if (cell.value !== null && String(cell.value).trim() === staffName) {
                    staffRow = row;
                    break;
                }
            }
            if (staffRow !== -1) break;
        }

        if (staffRow === -1) {
            // スタッフが見つからない場合、空データを返す
            return {
                submitted: false,
                shifts: dateColumns.map((dc) => ({
                    startCol: dc.startCol,
                    endCol: dc.endCol,
                    date: dc.date,
                    startValue: '',
                    endValue: '',
                })),
            };
        }

        // 各 Date 列の入り/上がりセル値を読み取り
        const shifts: StaffShiftEntry[] = dateColumns.map((dc) => {
            const startCell = sheet.getCell(staffRow, dc.startCol);
            const endCell = sheet.getCell(staffRow, dc.endCol);
            const startValue = startCell.value !== null ? String(startCell.value) : '';
            const endValue = endCell.value !== null ? String(endCell.value) : '';
            return {
                startCol: dc.startCol,
                endCol: dc.endCol,
                date: dc.date,
                startValue,
                endValue,
            };
        });

        // 1つでもデータが入っていれば submitted
        const submitted = shifts.some((s) => s.startValue !== '' || s.endValue !== '');

        return { submitted, shifts };
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error fetching staff shift:', error);
        return {
            submitted: false,
            shifts: dateColumns.map((dc) => ({
                startCol: dc.startCol,
                endCol: dc.endCol,
                date: dc.date,
                startValue: '',
                endValue: '',
            })),
        };
    }
};
