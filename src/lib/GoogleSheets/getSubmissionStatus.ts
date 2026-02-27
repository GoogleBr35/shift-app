'use server';

import { getGoogleSheets } from '@/lib/GoogleSheets/google';
import { getMember } from '@/lib/GoogleSheets/getMember';

export type MemberStatus = {
    name: string;
    submitted: boolean;
};

/**
 * 全アルバイトメンバーの提出状況を返す
 * シートを1回だけ読み込み、全メンバーを一括チェック
 */
export const getSubmissionStatus = async (
    sheetName: string
): Promise<{ members: MemberStatus[] }> => {
    try {
        const memberData = await getMember();

        // アルバイトのみ（重複排除）
        const partTimeNames = [
            ...new Set([...memberData.LunchPartTime, ...memberData.DinnerPartTime]),
        ];

        const doc = await getGoogleSheets();
        const sheet = doc.sheetsByTitle[sheetName];
        if (!sheet) {
            return { members: partTimeNames.map((name) => ({ name, submitted: false })) };
        }

        await sheet.loadCells();
        const rowCount = sheet.rowCount;

        // 日にち列（Row 3 に数字が入っているセル）を特定
        // 2列構造: startCol と endCol (= startCol + 1) のペアで管理
        const dateCols: { startCol: number; endCol: number }[] = [];
        for (let col = 0; col < sheet.columnCount; col++) {
            const cell = sheet.getCell(3, col);
            if (cell.value !== null && cell.value !== '' && !isNaN(Number(cell.value))) {
                dateCols.push({ startCol: col, endCol: col + 1 });
            }
        }

        // 全行を走査して名前→行マッピングを作成
        const nameRowMap = new Map<string, number>();
        for (let row = 5; row < rowCount; row++) {
            for (let col = 0; col < sheet.columnCount; col++) {
                const cell = sheet.getCell(row, col);
                if (cell.value !== null) {
                    const name = String(cell.value).trim();
                    if (partTimeNames.includes(name) && !nameRowMap.has(name)) {
                        nameRowMap.set(name, row);
                    }
                }
            }
        }

        // 各メンバーの提出状況を判定
        const members: MemberStatus[] = partTimeNames.map((name) => {
            const row = nameRowMap.get(name);
            if (row === undefined) {
                return { name, submitted: false };
            }
            // 入り列または上がり列のいずれかにデータがあれば提出済み
            const submitted = dateCols.some(({ startCol, endCol }) => {
                const startCell = sheet.getCell(row, startCol);
                const endCell = sheet.getCell(row, endCol);
                const hasStart = startCell.value !== null && String(startCell.value).trim() !== '';
                const hasEnd = endCell.value !== null && String(endCell.value).trim() !== '';
                return hasStart || hasEnd;
            });
            return { name, submitted };
        });

        return { members };
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error fetching submission status:', error);
        return { members: [] };
    }
};

/**
 * シフト表のシート名一覧を返す（日付形式のシート名のみ）
 */
export const getShiftSheetNames = async (): Promise<string[]> => {
    try {
        const doc = await getGoogleSheets();
        const sheetNames = Object.keys(doc.sheetsByTitle);
        // yyyy-MM-dd_yyyy-MM-dd 形式のシート名のみ抽出
        const datePattern = /^\d{4}-\d{2}-\d{2}_\d{4}-\d{2}-\d{2}$/;
        return sheetNames
            .filter((name) => datePattern.test(name))
            .sort()
            .reverse();
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error fetching sheet names:', error);
        return [];
    }
};
