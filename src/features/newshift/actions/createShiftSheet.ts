'use server';

import { getGoogleSheets } from '@/lib/GoogleSheets/google';
import { getMember } from '@/lib/GoogleSheets/getMember';
import { signSubmitToken } from '@/lib/jose/jwt';
import { format, eachDayOfInterval, isMonday, getDay, parseISO } from 'date-fns';

// ============================================================
// Types
// ============================================================

type RowDef = {
    type: 'LunchStaff' | 'LunchPartTime' | 'DinnerStaff' | 'DinnerPartTime' | 'Help' | 'Spacer';
    value?: string;
    templateRow?: number;
    members?: string[];
};

type ColDef = { type: 'Member' | 'Date'; date?: Date };

// ============================================================
// Batch-Request Builders
// ============================================================

/**
 * copyPaste リクエストを生成する。
 * colSpan / rowSpan で矩形のサイズを制御する。
 */
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

/** 単一セルの値を更新するリクエストを生成する */
const makeCellUpdate = (sheetId: number, row: number, col: number, value: string) => ({
    updateCells: {
        rows: [{ values: [{ userEnteredValue: { stringValue: value } }] }],
        start: { sheetId, rowIndex: row, columnIndex: col },
        fields: 'userEnteredValue',
    },
});

/** 1行 × 2列のセル結合リクエストを生成する */
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

// ============================================================
// Body Builder
// ============================================================

/**
 * Body 部分（メンバー行・ヘルプ行・スペーサー行）のバッチリクエスト配列を生成する。
 * Member 列と Date 列の両方で共用する。
 */
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
    let row = 5; // ヘッダー 5行の直後から開始

    for (const def of layout) {
        if (def.type === 'Spacer') {
            // Spacer: テンプレートの行3〜4（日にち行・曜日行）を2行分コピー
            reqs.push(
                makeCopyPaste(templateSheetId, newSheetId, 3, 5, srcCol, row, dstCol, 'PASTE_NORMAL', colSpan)
            );
            // Date 列の場合は日付を書き込み + セル結合
            if (dateStr) {
                reqs.push(makeCellUpdate(newSheetId, row, dstCol, dateStr));
            }
            if (!isMemberCol) {
                reqs.push(makeMerge(newSheetId, row, dstCol));
                reqs.push(makeMerge(newSheetId, row + 1, dstCol));
            }
            row += 2;
        } else if (def.members) {
            // メンバー行: 書式のみコピー + 名前 or 空文字を書き込み
            for (const member of def.members) {
                reqs.push(
                    makeCopyPaste(
                        templateSheetId,
                        newSheetId,
                        def.templateRow!,
                        def.templateRow! + 1,
                        srcCol,
                        row,
                        dstCol,
                        'PASTE_FORMAT',
                        colSpan
                    )
                );
                reqs.push(makeCellUpdate(newSheetId, row, dstCol, isMemberCol ? member : ''));
                row++;
            }
        } else {
            // 固定行（Help など）: テンプレートをそのままコピー
            reqs.push(
                makeCopyPaste(
                    templateSheetId,
                    newSheetId,
                    def.templateRow!,
                    def.templateRow! + 1,
                    srcCol,
                    row,
                    dstCol,
                    'PASTE_NORMAL',
                    colSpan
                )
            );
            row++;
        }
    }

    return reqs;
};

// ============================================================
// Template Column Mapping
// ============================================================

/**
 * 曜日 → Templates シートの列インデックスを返す（2列幅）。
 * Mon→1, Tue→3, Wed→5, Thu→7, Fri→9, Sat→11, Sun→13
 */
const dayToTemplateCol = (date: Date): number => {
    const d = getDay(date); // 0=Sun … 6=Sat
    if (d === 0) return 13;
    return (d - 1) * 2 + 1;
};

// ============================================================
// Conditional Formatting
// ============================================================

/** 条件付き書式の色定義（Google Sheets 標準テーマカラー） */
const CF_RED = { red: 0.918, green: 0.6, blue: 0.6 };       // 明るい赤 1 (#ea9999)
const CF_YELLOW = { red: 1, green: 0.898, blue: 0.6 };      // 明るい黄 1 (#ffe599)
const CF_GREEN = { red: 0.576, green: 0.769, blue: 0.49 };  // 明るい緑 2 (#93c47d)

/**
 * 各ヘッダー行の閾値定義。
 * row: 0=昼本数, 1=夜本数, 2=深夜本数
 */
type ThresholdRule = {
    row: number;
    redMax: number;    // ≤ この値 → 赤
    yellowVal: number; // = この値 → 黄
    greenMin: number;  // ≥ この値 → 緑
};

/** 月〜木・日曜の閾値 */
const WEEKDAY_THRESHOLDS: ThresholdRule[] = [
    { row: 0, redMax: 6, yellowVal: 7, greenMin: 9 },
    { row: 1, redMax: 11, yellowVal: 12, greenMin: 14 },
    { row: 2, redMax: 6, yellowVal: 7, greenMin: 9 },
];

/** 金・土曜の閾値 */
const WEEKEND_THRESHOLDS: ThresholdRule[] = [
    { row: 0, redMax: 6, yellowVal: 7, greenMin: 9 },
    { row: 1, redMax: 12, yellowVal: 13, greenMin: 15 },
    { row: 2, redMax: 7, yellowVal: 8, greenMin: 10 },
];

/**
 * 指定列に対する条件付き書式ルールのバッチリクエスト配列を生成する。
 * 各ヘッダー行（昼本数・夜本数・深夜本数）に赤・黄・緑の3ルールを設定。
 */
const buildConditionalFormatRules = (
    sheetId: number,
    colIdx: number,
    thresholds: ThresholdRule[]
) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rules: any[] = [];

    for (const t of thresholds) {
        const range = {
            sheetId,
            startRowIndex: t.row,
            endRowIndex: t.row + 1,
            startColumnIndex: colIdx,
            endColumnIndex: colIdx + 2,
        };

        // 赤: ≤ redMax
        rules.push({
            addConditionalFormatRule: {
                rule: {
                    ranges: [range],
                    booleanRule: {
                        condition: {
                            type: 'NUMBER_LESS_THAN_EQ',
                            values: [{ userEnteredValue: String(t.redMax) }],
                        },
                        format: { backgroundColor: CF_RED },
                    },
                },
                index: 0,
            },
        });

        // 黄: = yellowVal
        rules.push({
            addConditionalFormatRule: {
                rule: {
                    ranges: [range],
                    booleanRule: {
                        condition: {
                            type: 'NUMBER_EQ',
                            values: [{ userEnteredValue: String(t.yellowVal) }],
                        },
                        format: { backgroundColor: CF_YELLOW },
                    },
                },
                index: 0,
            },
        });

        // 緑: ≥ greenMin
        rules.push({
            addConditionalFormatRule: {
                rule: {
                    ranges: [range],
                    booleanRule: {
                        condition: {
                            type: 'NUMBER_GREATER_THAN_EQ',
                            values: [{ userEnteredValue: String(t.greenMin) }],
                        },
                        format: { backgroundColor: CF_GREEN },
                    },
                },
                index: 0,
            },
        });
    }

    return rules;
};

// ============================================================
// Main Action
// ============================================================

/**
 * シフト表を Google Sheets 上に生成するサーバーアクション。
 *
 * @param startDateStr - 開始日（ISO 形式: 'yyyy-MM-dd'）
 * @param endDateStr   - 終了日（ISO 形式: 'yyyy-MM-dd'）
 */
export const createShiftSheet = async (startDateStr: string, endDateStr: string) => {
    try {
        // --------------------------------------------------
        // 1. 初期化: Google Sheets 接続・メンバーリスト取得
        // --------------------------------------------------
        const startDate = parseISO(startDateStr);
        const endDate = parseISO(endDateStr);
        const doc = await getGoogleSheets();
        const templatesSheet = doc.sheetsByTitle['Templates'];
        const memberList = await getMember();

        if (!templatesSheet) {
            throw new Error('Templates sheet not found');
        }

        // --------------------------------------------------
        // 2. シート作成: 同名があれば削除して新規作成
        // --------------------------------------------------
        const sheetName = `${format(startDate, 'yyyy-MM-dd')}_${format(endDate, 'yyyy-MM-dd')}`;
        const existing = doc.sheetsByTitle[sheetName];
        if (existing) await existing.delete();

        const newSheet = await doc.addSheet({ title: sheetName });

        // --------------------------------------------------
        // 3. レイアウト定義
        // --------------------------------------------------
        const layout: RowDef[] = [
            { type: 'LunchStaff', templateRow: 6, members: memberList.LunchStaff },
            { type: 'Help', value: 'ヘルプ', templateRow: 9 },
            { type: 'LunchPartTime', templateRow: 8, members: memberList.LunchPartTime },
            { type: 'DinnerStaff', templateRow: 7, members: memberList.DinnerStaff },
            { type: 'Help', value: 'ヘルプ', templateRow: 9 },
            { type: 'Spacer', templateRow: 3 },
            { type: 'DinnerPartTime', templateRow: 7, members: memberList.DinnerPartTime },
        ];

        // --------------------------------------------------
        // 4. グリッドサイズの計算
        // --------------------------------------------------
        const totalRows =
            5 +
            layout.reduce((sum, item) => {
                if (item.type === 'Spacer') return sum + 2;
                if (item.members) return sum + item.members.length;
                return sum + 1;
            }, 0);

        // 列構成: 月曜日の前に Member 列（1列幅）、各日付に Date 列（2列幅）
        const columns: ColDef[] = [];
        const allDates = eachDayOfInterval({ start: startDate, end: endDate });

        for (const d of allDates) {
            if (isMonday(d)) columns.push({ type: 'Member' });
            columns.push({ type: 'Date', date: d });
        }

        const totalCols = columns.reduce(
            (sum, col) => sum + (col.type === 'Member' ? 1 : 2),
            0
        );

        // --------------------------------------------------
        // 5. バッチリクエストの構築
        // --------------------------------------------------
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const requests: any[] = [];
        const tplId = templatesSheet.sheetId;
        const newId = newSheet.sheetId;

        // 5-a. グリッドサイズの調整
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

        // 5-b. 全セルを中央揃えに設定
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

        // 5-c. 各列のヘッダー・ボディをテンプレートからコピー
        let colIdx = 0;

        for (const col of columns) {
            if (col.type === 'Member') {
                // Member 列（1列幅）
                requests.push(makeCopyPaste(tplId, newId, 0, 5, 0, 0, colIdx, 'PASTE_NORMAL', 1));
                requests.push(...buildBodyRequests(layout, tplId, newId, 0, colIdx, true, 1));
                colIdx += 1;
            } else if (col.date) {
                const srcCol = dayToTemplateCol(col.date);

                // ヘッダー（2列幅）: 書式 + 数式をコピー
                requests.push(makeCopyPaste(tplId, newId, 0, 5, srcCol, 0, colIdx, 'PASTE_NORMAL', 2));


                // 日にち（Row 3）を実際の日付で上書き
                const dayStr = format(col.date, 'd');
                requests.push(makeCellUpdate(newId, 3, colIdx, dayStr));

                // ヘッダー行（Row 0〜4）のセル結合（2列 → 1列表示）
                for (let r = 0; r < 5; r++) {
                    requests.push(makeMerge(newId, r, colIdx));
                }

                // ボディ（2列幅）
                requests.push(...buildBodyRequests(layout, tplId, newId, srcCol, colIdx, false, 2, dayStr));
                colIdx += 2;
            }
        }

        // 5-d. Date 列の列幅を設定
        const DATE_COL_WIDTH = 60;
        let widthColIdx = 0;

        for (const col of columns) {
            if (col.type === 'Member') {
                requests.push({
                    updateDimensionProperties: {
                        range: {
                            sheetId: newId,
                            dimension: 'COLUMNS',
                            startIndex: widthColIdx,
                            endIndex: widthColIdx + 1,
                        },
                        properties: { pixelSize: 120 },
                        fields: 'pixelSize',
                    },
                });
                widthColIdx += 1;
            } else {
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

        // 5-e. 日ごとの区切り線（各 Date 列の左端に 3pt の縦枠線）
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

        // 5-f. 条件付き書式ルール（各 Date 列のヘッダー行に適用）
        let cfColIdx = 0;

        for (const col of columns) {
            if (col.type === 'Member') {
                cfColIdx += 1;
            } else if (col.date) {
                const dayOfWeek = getDay(col.date);
                const isFriSat = dayOfWeek === 5 || dayOfWeek === 6;
                const thresholds = isFriSat ? WEEKEND_THRESHOLDS : WEEKDAY_THRESHOLDS;
                requests.push(...buildConditionalFormatRules(newId, cfColIdx, thresholds));
                cfColIdx += 2;
            }
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (doc as any)._makeBatchUpdateRequest(requests);

        // --------------------------------------------------
        // 6. 提出用トークンの生成と保存
        // --------------------------------------------------
        const token = await signSubmitToken(sheetName, 3);

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
