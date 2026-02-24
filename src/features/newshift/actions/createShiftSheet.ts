'use server';

import { getGoogleSheets } from '@/lib/GoogleSheets/google';
import { getMember } from '@/lib/GoogleSheets/getMember';
import { signSubmitToken } from '@/lib/jose/jwt';
import { format, eachDayOfInterval, isMonday, getDay } from 'date-fns';

// --- Helper Types ---

type RowDef = {
    type: 'LunchStaff' | 'LunchPartTime' | 'DinnerStaff' | 'DinnerPartTime' | 'Help' | 'Spacer';
    value?: string;
    templateRow?: number;
    members?: string[];
};

// --- Helper Functions ---

/** copyPaste リクエストを生成 */
const makeCopyPaste = (
    srcSheetId: number,
    dstSheetId: number,
    srcRow: number,
    srcRowEnd: number,
    srcCol: number,
    dstRow: number,
    dstCol: number,
    pasteType: string = 'PASTE_NORMAL',
    rowSpan: number = srcRowEnd - srcRow
) => ({
    copyPaste: {
        source: {
            sheetId: srcSheetId,
            startRowIndex: srcRow,
            endRowIndex: srcRowEnd,
            startColumnIndex: srcCol,
            endColumnIndex: srcCol + 1,
        },
        destination: {
            sheetId: dstSheetId,
            startRowIndex: dstRow,
            endRowIndex: dstRow + rowSpan,
            startColumnIndex: dstCol,
            endColumnIndex: dstCol + 1,
        },
        pasteType,
    },
});

/** updateCells リクエストを生成 */
const makeCellUpdate = (sheetId: number, row: number, col: number, value: string) => ({
    updateCells: {
        rows: [{ values: [{ userEnteredValue: { stringValue: value } }] }],
        start: { sheetId, rowIndex: row, columnIndex: col },
        fields: 'userEnteredValue',
    },
});

/** Body 部分のリクエスト配列を生成（Member列・Date列で共用） */
const buildBodyRequests = (
    layout: RowDef[],
    templateSheetId: number,
    newSheetId: number,
    srcCol: number,
    dstCol: number,
    isMemberCol: boolean,
    dateStr?: string
) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reqs: any[] = [];
    let row = 5;

    for (const def of layout) {
        if (def.type === 'Spacer') {
            reqs.push(makeCopyPaste(templateSheetId, newSheetId, 3, 5, srcCol, row, dstCol));
            // Spacer の1行目（row）は日にち行 → Date列の場合は日付を書き込む
            // Spacer の2行目（row+1）は曜日行 → テンプレートコピー（PASTE_NORMAL）で処理済み
            if (dateStr) {
                reqs.push(makeCellUpdate(newSheetId, row, dstCol, dateStr));
            }
            row += 2;
        } else if (def.members) {
            for (const member of def.members) {
                reqs.push(
                    makeCopyPaste(
                        templateSheetId, newSheetId,
                        def.templateRow!, def.templateRow! + 1,
                        srcCol, row, dstCol,
                        isMemberCol ? 'PASTE_FORMAT' : 'PASTE_FORMAT'
                    )
                );
                if (isMemberCol) {
                    reqs.push(makeCellUpdate(newSheetId, row, dstCol, member));
                } else {
                    reqs.push(makeCellUpdate(newSheetId, row, dstCol, ''));
                }
                row++;
            }
        } else {
            // 固定行 (Help etc)
            reqs.push(
                makeCopyPaste(
                    templateSheetId, newSheetId,
                    def.templateRow!, def.templateRow! + 1,
                    srcCol, row, dstCol
                )
            );
            row++;
        }
    }
    return reqs;
};

/** 曜日 → Templates シートの列インデックスを返す */
const dayToTemplateCol = (date: Date): number => {
    const d = getDay(date); // 0(Sun) - 6(Sat)
    return d === 0 ? 7 : d; // Sun→H(7), Mon→B(1), ..., Sat→G(6)
};

// --- Main Action ---

/**
 * シフト作成のサーバーアクション
 */
export const createShiftSheet = async (startDate: Date, endDate: Date) => {
    try {
        const doc = await getGoogleSheets();
        const templatesSheet = doc.sheetsByTitle['Templates'];
        const memberList = await getMember();

        if (!templatesSheet) {
            throw new Error('Templates sheet not found');
        }

        // シート名を決定し、既存の同名シートがあれば削除
        const sheetName = `${format(startDate, 'yyyy-MM-dd')}_${format(endDate, 'yyyy-MM-dd')}`;
        const existing = doc.sheetsByTitle[sheetName];
        if (existing) await existing.delete();

        const newSheet = await doc.addSheet({ title: sheetName });

        // レイアウト定義
        const layout: RowDef[] = [
            { type: 'LunchStaff', templateRow: 6, members: memberList.LunchStaff },
            { type: 'Help', value: 'ヘルプ', templateRow: 9 },
            { type: 'LunchPartTime', templateRow: 8, members: memberList.LunchPartTime },
            { type: 'DinnerStaff', templateRow: 7, members: memberList.DinnerStaff },
            { type: 'Help', value: 'ヘルプ', templateRow: 9 },
            { type: 'Spacer', templateRow: 3 },
            { type: 'DinnerPartTime', templateRow: 7, members: memberList.DinnerPartTime },
        ];

        // 総行数を計算
        const totalRows = 5 + layout.reduce((sum, item) => {
            if (item.type === 'Spacer') return sum + 2;
            if (item.members) return sum + item.members.length;
            return sum + 1;
        }, 0);

        // 列構成を決定
        type ColDef = { type: 'Member' | 'Date'; date?: Date };
        const columns: ColDef[] = [];
        const allDates = eachDayOfInterval({ start: startDate, end: endDate });

        for (const d of allDates) {
            // 月曜日ならその前に Member 列を挿入
            if (isMonday(d)) columns.push({ type: 'Member' });
            columns.push({ type: 'Date', date: d });
        }

        // バッチリクエスト構築
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const requests: any[] = [];
        const tplId = templatesSheet.sheetId;
        const newId = newSheet.sheetId;

        // Grid サイズ調整
        requests.push({
            updateSheetProperties: {
                properties: {
                    sheetId: newId,
                    gridProperties: {
                        rowCount: totalRows + 10,
                        columnCount: columns.length + 5,
                    },
                },
                fields: 'gridProperties.rowCount,gridProperties.columnCount',
            },
        });

        // 各列のデータ・スタイル設定
        columns.forEach((col, colIdx) => {
            if (col.type === 'Member') {
                // Header (A1:A5)
                requests.push(makeCopyPaste(tplId, newId, 0, 5, 0, 0, colIdx));
                // Body
                requests.push(...buildBodyRequests(layout, tplId, newId, 0, colIdx, true));
            } else if (col.date) {
                const srcCol = dayToTemplateCol(col.date);
                // Header
                requests.push(makeCopyPaste(tplId, newId, 0, 5, srcCol, 0, colIdx));
                // 日付を Row 3 (日にち行) に書き込み
                const dayStr = format(col.date, 'd');
                requests.push(makeCellUpdate(newId, 3, colIdx, dayStr));
                // Body
                requests.push(...buildBodyRequests(layout, tplId, newId, srcCol, colIdx, false, dayStr));
            }
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (doc as any)._makeBatchUpdateRequest(requests);

        const token = await signSubmitToken(sheetName, 7);
        return { success: true, sheetName, token };
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error creating shift sheet:', error);
        return { success: false, error: 'シフト表の作成に失敗しました' };
    }
};
