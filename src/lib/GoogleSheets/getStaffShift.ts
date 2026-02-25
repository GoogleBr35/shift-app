'use server';

import { getGoogleSheets } from '@/lib/GoogleSheets/google';

export type StaffShiftData = {
    submitted: boolean;
    shifts: { colIndex: number; date: string; value: string }[];
};

/**
 * スタッフの既存シフトデータを取得する
 * Member列から staffName の行を見つけ、各 Date 列のセル値を返す
 */
export const getStaffShift = async (
    sheetName: string,
    staffName: string,
    dateColumns: { index: number; date: string }[]
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
        // Member列は col.type === 'Member' の列（名前が入っている列）
        // Row 5+ がBody行
        let staffRow = -1;
        for (let row = 5; row < rowCount; row++) {
            // すべての列を走査して staffName を見つける
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
                    colIndex: dc.index,
                    date: dc.date,
                    value: '',
                })),
            };
        }

        // 各 Date 列のセル値を読み取り
        const shifts = dateColumns.map((dc) => {
            const cell = sheet.getCell(staffRow, dc.index);
            const value = cell.value !== null ? String(cell.value) : '';
            return {
                colIndex: dc.index,
                date: dc.date,
                value,
            };
        });

        // 1つでもデータが入っていれば submitted
        const submitted = shifts.some((s) => s.value !== '');

        return { submitted, shifts };
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error fetching staff shift:', error);
        return {
            submitted: false,
            shifts: dateColumns.map((dc) => ({
                colIndex: dc.index,
                date: dc.date,
                value: '',
            })),
        };
    }
};
