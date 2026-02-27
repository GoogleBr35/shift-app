'use server';

import { getGoogleSheets } from '@/lib/GoogleSheets/google';
import { verifySubmitToken } from '@/lib/jose/jwt';
import { deleteTokenFromStore } from '@/lib/GoogleSheets/tokenStore';

export type ShiftEntry = {
    startCol: number;
    endCol: number;
    startValue: number | null;
    endValue: number | null;
};

/**
 * シフトデータを Google Sheets に書き込む
 * token を再検証して sheetName を取得し、該当行に入り/上がりの値を書き込む
 */
export const submitShift = async (
    token: string,
    staffName: string,
    shifts: ShiftEntry[]
): Promise<{ success: boolean; error?: string }> => {
    const payload = token ? await verifySubmitToken(token) : null;

    if (!payload && token) {
        // 期限切れトークンのクリーンアップ
        await deleteTokenFromStore(token);
    }

    try {
        // トークン再検証
        if (!payload) {
            // トークンが無効または期限切れの場合、TokenStore から削除
            await deleteTokenFromStore(token);
            return { success: false, error: 'トークンが無効または期限切れです' };
        }

        const { sheetName } = payload;
        const doc = await getGoogleSheets();
        const sheet = doc.sheetsByTitle[sheetName];

        if (!sheet) {
            return { success: false, error: 'シフト表が見つかりません' };
        }

        await sheet.loadCells();

        const rowCount = sheet.rowCount;

        // staffName の行を検索
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
            return { success: false, error: 'スタッフが見つかりません' };
        }

        // 各シフト値を書き込み（入り列・上がり列）
        for (const entry of shifts) {
            const startCell = sheet.getCell(staffRow, entry.startCol);
            startCell.value = entry.startValue ?? '';
            startCell.horizontalAlignment = 'CENTER';
            startCell.verticalAlignment = 'MIDDLE';

            const endCell = sheet.getCell(staffRow, entry.endCol);
            endCell.value = entry.endValue ?? '';
            endCell.horizontalAlignment = 'CENTER';
            endCell.verticalAlignment = 'MIDDLE';
        }

        await sheet.saveUpdatedCells();

        return { success: true };
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error submitting shift:', error);
        return { success: false, error: 'シフトの提出に失敗しました' };
    }
};
