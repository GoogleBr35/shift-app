'use server';

import { getGoogleSheets } from '@/lib/GoogleSheets/google';
import type { ShiftEntry } from '@/features/submit/actions/submitShift';

/**
 * シフト提出時のスナップショットを PreviousSubmit シートに保存する。
 * 1スタッフ = 1行を維持し、既存行があれば上書きする。
 *
 * 行構造: sheetName | staffName | shifts
 * shifts 列は全シフトをカンマ区切りで格納。
 * 各エントリは "日付-入り-上がり" 形式（例: "1-10-15,2-14-22,4-10-18"）。
 * 休みの日（入り・上がり共にnull）は省略される。
 *
 * @param sheetName - シフトシート名（例: "2026-03-10_2026-03-16"）
 * @param staffName - スタッフ名
 * @param shifts    - 提出されたシフトデータ配列
 * @param dates     - 各シフトに対応する日付文字列の配列（Row 3 から取得）
 */
export const savePreviousSubmit = async (
    sheetName: string,
    staffName: string,
    shifts: ShiftEntry[],
    dates: string[]
): Promise<void> => {
    const doc = await getGoogleSheets();

    // PreviousSubmit シートの取得または作成
    let psSheet = doc.sheetsByTitle['PreviousSubmit'];
    if (!psSheet) {
        psSheet = await doc.addSheet({
            title: 'PreviousSubmit',
            headerValues: ['sheetName', 'staffName', 'shifts'],
        });
    }

    // シフトデータを "日付-入り-上がり" 形式のカンマ区切り文字列に変換
    // 休みの日（両方null）は省略
    const shiftEntries: string[] = [];
    for (let i = 0; i < shifts.length; i++) {
        const s = shifts[i];
        if (s.startValue === null && s.endValue === null) continue;
        const date = dates[i] ?? '';
        shiftEntries.push(`${date}-${s.startValue ?? ''}-${s.endValue ?? ''}`);
    }
    const shiftsStr = shiftEntries.join(',');

    // staffName で既存行を検索
    const rows = await psSheet.getRows();
    const existingRow = rows.find((r) => r.get('staffName') === staffName);

    if (existingRow) {
        // 既存行を上書き（sheetName とシフトデータを更新）
        existingRow.set('sheetName', sheetName);
        existingRow.set('shifts', shiftsStr);
        await existingRow.save();
    } else {
        // 新規行を追加
        await psSheet.addRow({ sheetName, staffName, shifts: shiftsStr });
    }
};
