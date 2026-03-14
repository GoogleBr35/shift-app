'use server';

import { getGoogleSheets } from '@/lib/GoogleSheets/google';

export type PreviousShift = {
    date: string;
    start: string;
    end: string;
};

/**
 * PreviousSubmit シートから指定スタッフの提出済みシフトを取得する。
 *
 * shifts 列のフォーマット: "日付-入り-上がり,日付-入り-上がり,..."
 * 例: "1-10-15,2-14-22,4-10-18"
 *
 * @returns パース済みシフト配列。見つからない場合は null。
 */
export const getPreviousSubmit = async (
    sheetName: string,
    staffName: string
): Promise<PreviousShift[] | null> => {
    try {
        const doc = await getGoogleSheets();
        const psSheet = doc.sheetsByTitle['PreviousSubmit'];

        if (!psSheet) return null;

        const rows = await psSheet.getRows();
        const row = rows.find(
            (r) => r.get('sheetName') === sheetName && r.get('staffName') === staffName
        );

        if (!row) return null;

        const shiftsStr = row.get('shifts');
        if (!shiftsStr || typeof shiftsStr !== 'string' || shiftsStr.trim() === '') {
            return null;
        }

        // "1-10-15,2-14-22" → [{date:"1", start:"10", end:"15"}, ...]
        const shifts: PreviousShift[] = shiftsStr.split(',').map((entry) => {
            const parts = entry.split('-');
            return {
                date: parts[0] ?? '',
                start: parts[1] ?? '',
                end: parts[2] ?? '',
            };
        });

        return shifts;
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error fetching previous submit:', error);
        return null;
    }
};
