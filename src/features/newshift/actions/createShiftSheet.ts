'use server';

import { getGoogleSheets } from '@/lib/GoogleSheets/google';
import { getMember } from '@/lib/GoogleSheets/getMember';
import { format, eachDayOfInterval, isMonday, getDay } from 'date-fns';

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

        // 新しいシートを作成
        const sheetName = `${format(startDate, 'yyyy-MM-dd')}_${format(endDate, 'yyyy-MM-dd')}`;

        // 同名のシートがある場合は削除するかエラーにするか...今回は新規作成で競合したらエラーになるので既存チェック
        let newSheet = doc.sheetsByTitle[sheetName];
        if (newSheet) {
            // 既に存在する場合は削除して作り直す（開発中の利便性のため）
            await newSheet.delete();
        }

        newSheet = await doc.addSheet({ title: sheetName });

        // 必要な行数を計算
        // Header (5) + LunchStaff + Help(1) + LunchPartTime + DinnerStaff + Help(1) + Spacer(2) + DinnerPartTime
        const lunchStaffCount = memberList.LunchStaff.length;
        const lunchPartTimeCount = memberList.LunchPartTime.length;
        const dinnerStaffCount = memberList.DinnerStaff.length;
        const dinnerPartTimeCount = memberList.DinnerPartTime.length;

        // 行のインデックス定義 (0-indexed)
        // テンプレートの定義:
        // A1-H5: Header (5 rows)
        // A7: LunchStaff Style
        // A8: Help/DinnerStaff/DinnerPartTime Style
        // A9: LunchPartTime Style
        // A4-H5 (Header partial?): Spacer (2 rows)

        // 構築する行リスト
        // 0-4: Header
        // 5-(5+LS-1): LunchStaff
        // 5+LS: Help
        // 5+LS+1-(5+LS+1+LPT-1): LunchPartTime
        // ...

        // レイアウト定義用の配列を作成
        type RowDef = {
            type:
                | 'LunchStaff'
                | 'LunchPartTime'
                | 'DinnerStaff'
                | 'DinnerPartTime'
                | 'Help'
                | 'Spacer';
            value?: string; // 固定値
            count?: number; // メンバー数など
            templateRow?: number; // テンプレートの行番号 (0-indexed, A7=6)
            members?: string[];
        };

        const layout: RowDef[] = [
            {
                type: 'LunchStaff',
                count: lunchStaffCount,
                templateRow: 6,
                members: memberList.LunchStaff,
            },
            { type: 'Help', value: 'ヘルプ', templateRow: 9 }, // A10
            {
                type: 'LunchPartTime',
                count: lunchPartTimeCount,
                templateRow: 8,
                members: memberList.LunchPartTime,
            }, // A9
            {
                type: 'DinnerStaff',
                count: dinnerStaffCount,
                templateRow: 7,
                members: memberList.DinnerStaff,
            }, // A8
            { type: 'Help', value: 'ヘルプ', templateRow: 9 }, // A10
            { type: 'Spacer', templateRow: 3 }, // A4 start (index 3). Height 2. Special handling.
            {
                type: 'DinnerPartTime',
                count: dinnerPartTimeCount,
                templateRow: 7,
                members: memberList.DinnerPartTime,
            }, // A8
        ];

        // 全体の行数を計算
        // Header = 5
        // Body = sum of layout items
        let totalRows = 5;
        for (const item of layout) {
            if (item.type === 'Spacer') totalRows += 2;
            else if (item.members) totalRows += item.members.length;
            else totalRows += 1;
        }

        // 列のロジック
        const allDates = eachDayOfInterval({ start: startDate, end: endDate });

        // 列構成を決定
        type ColDef = {
            type: 'Member' | 'Date';
            date?: Date;
        };
        const columns: ColDef[] = [];

        // ルール:
        // - 月曜始まりならスタッフ列から
        // - それ以外ならstartDateの曜日から
        // - 日曜が終わるたびに（月曜になるたびに）スタッフ列

        // 最初の列
        if (isMonday(startDate)) {
            columns.push({ type: 'Member' });
        } else {
            // 月曜始まりでない場合、最初のMember列は無し？
            // "それ以外の曜日ならstartDateの曜日スタートで" -> いきなり日付列？
            // 文脈: "月~日を繰り返すごとにスタッフの名前列を凡例として配置"
            // これに従う。
        }

        // とりあえずループ
        let isFirst = true;
        for (const d of allDates) {
            // 月曜日なら、その前にMember列を入れる
            if (isMonday(d) && !isFirst) {
                columns.push({ type: 'Member' });
            }

            if (isFirst) {
                if (isMonday(d)) {
                    columns.push({ type: 'Member' });
                }
                // "それ以外ならstartDateの曜日スタート" -> 何もしない（Member列入れない）
                isFirst = false;
            }

            columns.push({ type: 'Date', date: d });
        }

        // バッチリクエストの作成
        const requests = [];

        // 1. Gridのサイズ調整
        requests.push({
            updateSheetProperties: {
                properties: {
                    sheetId: newSheet.sheetId,
                    gridProperties: {
                        rowCount: totalRows + 10, // 余裕をもたせる
                        columnCount: columns.length + 5,
                    },
                },
                fields: 'gridProperties.rowCount,gridProperties.columnCount',
            },
        });

        // 2. データとスタイルのコピー・入力
        // 列ごとに処理

        let currentColIndex = 0;

        for (const col of columns) {
            if (col.type === 'Member') {
                // --- Member Column ---
                // Copy Header part (A1:A5 -> NewSheet!Col:0-4)
                requests.push({
                    copyPaste: {
                        source: {
                            sheetId: templatesSheet.sheetId,
                            startRowIndex: 0,
                            endRowIndex: 5,
                            startColumnIndex: 0,
                            endColumnIndex: 1, // A列のみ
                        },
                        destination: {
                            sheetId: newSheet.sheetId,
                            startRowIndex: 0,
                            endRowIndex: 5,
                            startColumnIndex: currentColIndex,
                            endColumnIndex: currentColIndex + 1,
                        },
                        pasteType: 'PASTE_NORMAL',
                    },
                });

                // Body part
                let currentRowIndex = 5;
                for (const rowDef of layout) {
                    if (rowDef.type === 'Spacer') {
                        // Spacer (Row A4-H5) -> Copy corresponding column from template
                        const spacerHeight = 2;
                        requests.push({
                            copyPaste: {
                                source: {
                                    sheetId: templatesSheet.sheetId,
                                    startRowIndex: 3,
                                    endRowIndex: 5, // A4(3) - A5(4) inclusive -> endRow 5
                                    startColumnIndex: 0,
                                    endColumnIndex: 1, // A列
                                },
                                destination: {
                                    sheetId: newSheet.sheetId,
                                    startRowIndex: currentRowIndex,
                                    endRowIndex: currentRowIndex + spacerHeight,
                                    startColumnIndex: currentColIndex,
                                    endColumnIndex: currentColIndex + 1,
                                },
                                pasteType: 'PASTE_NORMAL',
                            },
                        });
                        currentRowIndex += spacerHeight;
                    } else if (rowDef.members) {
                        // メンバーリストの展開
                        for (const member of rowDef.members) {
                            // Copy Style from templateRow (A7, A9 etc)
                            requests.push({
                                copyPaste: {
                                    source: {
                                        sheetId: templatesSheet.sheetId,
                                        startRowIndex: rowDef.templateRow,
                                        endRowIndex: rowDef.templateRow! + 1,
                                        startColumnIndex: 0,
                                        endColumnIndex: 1,
                                    },
                                    destination: {
                                        sheetId: newSheet.sheetId,
                                        startRowIndex: currentRowIndex,
                                        endRowIndex: currentRowIndex + 1,
                                        startColumnIndex: currentColIndex,
                                        endColumnIndex: currentColIndex + 1,
                                    },
                                    pasteType: 'PASTE_FORMAT', // スタイルのみ？ 値は上書きするからOK
                                },
                            });

                            // Write Member Name
                            requests.push({
                                updateCells: {
                                    rows: [
                                        {
                                            values: [
                                                {
                                                    userEnteredValue: {
                                                        stringValue: member,
                                                    },
                                                },
                                            ],
                                        },
                                    ],
                                    start: {
                                        sheetId: newSheet.sheetId,
                                        rowIndex: currentRowIndex,
                                        columnIndex: currentColIndex,
                                    },
                                    fields: 'userEnteredValue',
                                },
                            });
                            currentRowIndex++;
                        }
                    } else {
                        // 固定行 (Help etc)
                        // Copy template completely (Style + Value)
                        requests.push({
                            copyPaste: {
                                source: {
                                    sheetId: templatesSheet.sheetId,
                                    startRowIndex: rowDef.templateRow,
                                    endRowIndex: rowDef.templateRow! + 1,
                                    startColumnIndex: 0,
                                    endColumnIndex: 1,
                                },
                                destination: {
                                    sheetId: newSheet.sheetId,
                                    startRowIndex: currentRowIndex,
                                    endRowIndex: currentRowIndex + 1,
                                    startColumnIndex: currentColIndex,
                                    endColumnIndex: currentColIndex + 1,
                                },
                                pasteType: 'PASTE_NORMAL',
                            },
                        });
                        currentRowIndex++;
                    }
                }
            } else if (col.type === 'Date' && col.date) {
                // --- Date Column ---

                const dayOfWeek = getDay(col.date); // 0(Sun) - 6(Sat)
                // Map to Template Column Index
                // Sun(0) -> H(7)
                // Mon(1) -> B(1)
                // ...
                // Sat(6) -> G(6)

                let sourceColIndex = 1; // Default B
                if (dayOfWeek === 0)
                    sourceColIndex = 7; // Sun -> H
                else sourceColIndex = dayOfWeek; // Mon(1)->B(1), etc.

                // Header Copy
                requests.push({
                    copyPaste: {
                        source: {
                            sheetId: templatesSheet.sheetId,
                            startRowIndex: 0,
                            endRowIndex: 5,
                            startColumnIndex: sourceColIndex,
                            endColumnIndex: sourceColIndex + 1,
                        },
                        destination: {
                            sheetId: newSheet.sheetId,
                            startRowIndex: 0,
                            endRowIndex: 5,
                            startColumnIndex: currentColIndex,
                            endColumnIndex: currentColIndex + 1,
                        },
                        pasteType: 'PASTE_NORMAL',
                    },
                });

                // Write Date string (day only) to rows 2 and 3 (indices 2 and 3)
                // "2行ある'日にち'行に正しく入力" -> Rows 2 and 3
                requests.push({
                    updateCells: {
                        rows: [
                            {
                                values: [
                                    {
                                        userEnteredValue: {
                                            stringValue: format(col.date, 'd'),
                                        },
                                    },
                                ],
                            },
                        ],
                        start: {
                            sheetId: newSheet.sheetId,
                            rowIndex: 2,
                            columnIndex: currentColIndex,
                        },
                        fields: 'userEnteredValue',
                    },
                });
                requests.push({
                    updateCells: {
                        rows: [
                            {
                                values: [
                                    {
                                        userEnteredValue: {
                                            stringValue: format(col.date, 'd'),
                                        },
                                    },
                                ],
                            },
                        ],
                        start: {
                            sheetId: newSheet.sheetId,
                            rowIndex: 3,
                            columnIndex: currentColIndex,
                        },
                        fields: 'userEnteredValue',
                    },
                });

                // Body Copy
                let currentRowIndex = 5;
                for (const rowDef of layout) {
                    if (rowDef.type === 'Spacer') {
                        // Spacer (Row A4-H5) -> Copy corresponding column from template
                        const spacerHeight = 2;
                        requests.push({
                            copyPaste: {
                                source: {
                                    sheetId: templatesSheet.sheetId,
                                    startRowIndex: 3,
                                    endRowIndex: 5,
                                    startColumnIndex: sourceColIndex,
                                    endColumnIndex: sourceColIndex + 1,
                                },
                                destination: {
                                    sheetId: newSheet.sheetId,
                                    startRowIndex: currentRowIndex,
                                    endRowIndex: currentRowIndex + spacerHeight,
                                    startColumnIndex: currentColIndex,
                                    endColumnIndex: currentColIndex + 1,
                                },
                                pasteType: 'PASTE_NORMAL',
                            },
                        });
                        currentRowIndex += spacerHeight;
                    } else if (rowDef.members) {
                        for (let i = 0; i < rowDef.members.length; i++) {
                            // Copy Style (Format only, empty value)
                            requests.push({
                                copyPaste: {
                                    source: {
                                        sheetId: templatesSheet.sheetId,
                                        startRowIndex: rowDef.templateRow,
                                        endRowIndex: rowDef.templateRow! + 1,
                                        startColumnIndex: sourceColIndex,
                                        endColumnIndex: sourceColIndex + 1,
                                    },
                                    destination: {
                                        sheetId: newSheet.sheetId,
                                        startRowIndex: currentRowIndex,
                                        endRowIndex: currentRowIndex + 1,
                                        startColumnIndex: currentColIndex,
                                        endColumnIndex: currentColIndex + 1,
                                    },
                                    pasteType: 'PASTE_FORMAT',
                                },
                            });
                            // Clear value just in case source had something
                            requests.push({
                                updateCells: {
                                    rows: [
                                        {
                                            values: [
                                                {
                                                    userEnteredValue: {
                                                        stringValue: '',
                                                    },
                                                },
                                            ],
                                        },
                                    ],
                                    start: {
                                        sheetId: newSheet.sheetId,
                                        rowIndex: currentRowIndex,
                                        columnIndex: currentColIndex,
                                    },
                                    fields: 'userEnteredValue',
                                },
                            });
                            currentRowIndex++;
                        }
                    } else {
                        // 固定行 (Help)
                        requests.push({
                            copyPaste: {
                                source: {
                                    sheetId: templatesSheet.sheetId,
                                    startRowIndex: rowDef.templateRow,
                                    endRowIndex: rowDef.templateRow! + 1,
                                    startColumnIndex: sourceColIndex,
                                    endColumnIndex: sourceColIndex + 1,
                                },
                                destination: {
                                    sheetId: newSheet.sheetId,
                                    startRowIndex: currentRowIndex,
                                    endRowIndex: currentRowIndex + 1,
                                    startColumnIndex: currentColIndex,
                                    endColumnIndex: currentColIndex + 1,
                                },
                                pasteType: 'PASTE_NORMAL', // 値もコピー（もし入ってれば）
                            },
                        });
                        currentRowIndex++;
                    }
                }
            }

            currentColIndex++;
        }

        // execute batchUpdate
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (doc as any)._makeBatchUpdateRequest(requests);

        return { success: true, sheetName };
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error creating shift sheet:', error);
        return { success: false, error: 'シフト表の作成に失敗しました' };
    }
};
