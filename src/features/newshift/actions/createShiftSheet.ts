'use server';

import { getGoogleSheets } from '@/lib/GoogleSheets/google';
import { getMember } from '@/lib/GoogleSheets/getMember';
import { signSubmitToken } from '@/lib/jose/jwt';
import { format, eachDayOfInterval, isMonday, getDay, parseISO } from 'date-fns';

// --- Helper Types ---

type RowDef = {
    type: 'LunchStaff' | 'LunchPartTime' | 'DinnerStaff' | 'DinnerPartTime' | 'Help' | 'Spacer';
    value?: string;
    templateRow?: number;
    members?: string[];
};

// --- Helper Functions ---

/** copyPaste リクエストを生成（colSpan 列分コピー） */
const makeCopyPaste = (
    srcSheetId: number,
    dstSheetId: number,
    srcRow: number,
    srcRowEnd: number,
    srcCol: number,
    dstRow: number,
    dstCol: number,
    pasteType: string = 'PASTE_NORMAL',
    colSpan: number = 2,
    rowSpan: number = srcRowEnd - srcRow
) => ({
    copyPaste: {
        source: {
            sheetId: srcSheetId,
            startRowIndex: srcRow,
            endRowIndex: srcRowEnd,
            startColumnIndex: srcCol,
            endColumnIndex: srcCol + colSpan,
        },
        destination: {
            sheetId: dstSheetId,
            startRowIndex: dstRow,
            endRowIndex: dstRow + rowSpan,
            startColumnIndex: dstCol,
            endColumnIndex: dstCol + colSpan,
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

/** mergeCells リクエストを生成（1行 × 2列を結合） */
const makeMerge = (sheetId: number, row: number, col: number) => ({
    mergeCells: {
        range: {
            sheetId,
            startRowIndex: row,
            endRowIndex: row + 1,
            startColumnIndex: col,
            endColumnIndex: col + 2,
        },
        mergeType: 'MERGE_ALL',
    },
});

/** セル結合が必要な行かどうかを判定する */
const isMergeRow = (rowIndex: number, headerRowCount: number): boolean => {
    // ヘッダー部の Row 0〜4（昼本数/夜本数/深夜本数/日にち/曜日）
    return rowIndex < headerRowCount;
};

/** Body 部分のリクエスト配列を生成（Member列・Date列で共用） */
const buildBodyRequests = (
    layout: RowDef[],
    templateSheetId: number,
    newSheetId: number,
    srcCol: number,
    dstCol: number,
    isMemberCol: boolean,
    colSpan: number,
    dateStr?: string
) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reqs: any[] = [];
    let row = 5;

    for (const def of layout) {
        if (def.type === 'Spacer') {
            reqs.push(makeCopyPaste(templateSheetId, newSheetId, 3, 5, srcCol, row, dstCol, 'PASTE_NORMAL', colSpan));
            // Spacer の1行目（row）は日にち行 → Date列の場合は日付を書き込む
            // Spacer の2行目（row+1）は曜日行 → テンプレートコピーで処理済み
            if (dateStr) {
                reqs.push(makeCellUpdate(newSheetId, row, dstCol, dateStr));
            }
            // Date列の Spacer 行はセル結合（日にち行・曜日行）
            if (!isMemberCol) {
                reqs.push(makeMerge(newSheetId, row, dstCol));     // 日にち行
                reqs.push(makeMerge(newSheetId, row + 1, dstCol)); // 曜日行
            }
            row += 2;
        } else if (def.members) {
            for (const member of def.members) {
                reqs.push(
                    makeCopyPaste(
                        templateSheetId, newSheetId,
                        def.templateRow!, def.templateRow! + 1,
                        srcCol, row, dstCol,
                        'PASTE_FORMAT', colSpan
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
                    srcCol, row, dstCol,
                    'PASTE_NORMAL', colSpan
                )
            );
            row++;
        }
    }
    return reqs;
};

/**
 * 曜日 → Templates シートの列インデックスを返す（2列幅対応）
 * Mon→1, Tue→3, Wed→5, Thu→7, Fri→9, Sat→11, Sun→13
 */
const dayToTemplateCol = (date: Date): number => {
    const d = getDay(date); // 0(Sun) - 6(Sat)
    if (d === 0) return 13; // Sun → col 13,14 (N,O)
    return (d - 1) * 2 + 1; // Mon→1, Tue→3, Wed→5, Thu→7, Fri→9, Sat→11
};

// --- Main Action ---

/**
 * シフト作成のサーバーアクション
 */
export const createShiftSheet = async (startDateStr: string, endDateStr: string) => {
    try {
        const startDate = parseISO(startDateStr);
        const endDate = parseISO(endDateStr);
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

        // 列構成を決定（1日 = 2列）
        type ColDef = { type: 'Member' | 'Date'; date?: Date };
        const columns: ColDef[] = [];
        const allDates = eachDayOfInterval({ start: startDate, end: endDate });

        for (const d of allDates) {
            // 月曜日ならその前に Member 列を挿入
            if (isMonday(d)) columns.push({ type: 'Member' });
            columns.push({ type: 'Date', date: d });
        }

        // 実際の列数を計算: Member=1列、Date=2列
        const totalCols = columns.reduce((sum, col) => sum + (col.type === 'Member' ? 1 : 2), 0);

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
                        columnCount: totalCols + 5,
                    },
                },
                fields: 'gridProperties.rowCount,gridProperties.columnCount',
            },
        });

        // 全セルを中央揃えに設定
        requests.push({
            repeatCell: {
                range: {
                    sheetId: newId,
                    startRowIndex: 0,
                    endRowIndex: totalRows + 10,
                    startColumnIndex: 0,
                    endColumnIndex: totalCols + 5,
                },
                cell: {
                    userEnteredFormat: {
                        horizontalAlignment: 'CENTER',
                        verticalAlignment: 'MIDDLE',
                    },
                },
                fields: 'userEnteredFormat(horizontalAlignment,verticalAlignment)',
            },
        });

        // 各列のデータ・スタイル設定
        let colIdx = 0;
        for (const col of columns) {
            if (col.type === 'Member') {
                // Member 列は1列幅
                // Header (A1:A5)
                requests.push(makeCopyPaste(tplId, newId, 0, 5, 0, 0, colIdx, 'PASTE_NORMAL', 1));
                // Body
                requests.push(...buildBodyRequests(layout, tplId, newId, 0, colIdx, true, 1));
                colIdx += 1;
            } else if (col.date) {
                const srcCol = dayToTemplateCol(col.date);
                // Header（2列幅でコピー）
                requests.push(makeCopyPaste(tplId, newId, 0, 5, srcCol, 0, colIdx, 'PASTE_NORMAL', 2));
                // 日付を Row 3 (日にち行) に書き込み
                const dayStr = format(col.date, 'd');
                requests.push(makeCellUpdate(newId, 3, colIdx, dayStr));
                // ヘッダー部の結合（昼本数/夜本数/深夜本数/日にち/曜日 = Row 0〜4）
                for (let r = 0; r < 5; r++) {
                    requests.push(makeMerge(newId, r, colIdx));
                }
                // Body（2列幅）
                requests.push(...buildBodyRequests(layout, tplId, newId, srcCol, colIdx, false, 2, dayStr));
                colIdx += 2;
            }
        }

        // Date列の幅を設定（Member列はそのまま）
        const DATE_COL_WIDTH = 60; // px
        let widthColIdx = 0;
        for (const col of columns) {
            if (col.type === 'Member') {
                widthColIdx += 1;
            } else {
                // 入り列・上がり列それぞれに幅を設定
                requests.push({
                    updateDimensionProperties: {
                        range: {
                            sheetId: newId,
                            dimension: 'COLUMNS',
                            startIndex: widthColIdx,
                            endIndex: widthColIdx + 2,
                        },
                        properties: { pixelSize: DATE_COL_WIDTH },
                        fields: 'pixelSize',
                    },
                });
                widthColIdx += 2;
            }
        }

        // 日ごとの区切り線（各 Date の左端に1pt縦枠線）
        let borderColIdx = 0;
        for (const col of columns) {
            if (col.type === 'Member') {
                borderColIdx += 1;
            } else {
                requests.push({
                    updateBorders: {
                        range: {
                            sheetId: newId,
                            startRowIndex: 0,
                            endRowIndex: totalRows,
                            startColumnIndex: borderColIdx,
                            endColumnIndex: borderColIdx + 1,
                        },
                        left: {
                            style: 'SOLID',
                            width: 3,
                            color: { red: 0, green: 0, blue: 0, alpha: 1 },
                        },
                    },
                });
                borderColIdx += 2;
            }
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (doc as any)._makeBatchUpdateRequest(requests);

        const token = await signSubmitToken(sheetName, 3);

        // TokenStore シートにトークンを保存
        let tokenSheet = doc.sheetsByTitle['TokenStore'];
        if (!tokenSheet) {
            tokenSheet = await doc.addSheet({
                title: 'TokenStore',
                headerValues: ['sheetName', 'token'],
            });
        }
        const tokenRows = await tokenSheet.getRows();
        const existingRow = tokenRows.find((r) => r.get('sheetName') === sheetName);
        if (existingRow) {
            existingRow.set('token', token);
            await existingRow.save();
        } else {
            await tokenSheet.addRow({ sheetName, token });
        }

        return { success: true, sheetName, token };
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error creating shift sheet:', error);
        return { success: false, error: 'シフト表の作成に失敗しました' };
    }
};
