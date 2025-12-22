'use server';

import { getGoogleSheets } from '@/lib/GoogleSheets/google';
import { revalidatePath } from 'next/cache';

/**
 * メンバーを削除するサーバーアクション
 * 削除後、その列の値を上に詰める処理を行います
 * @param name 削除するメンバーの名前
 * @param category 削除するカテゴリのキー
 */
export const deleteMember = async (name: string, category: string) => {
    try {
        const doc = await getGoogleSheets();
        const sheet = doc.sheetsByTitle['MemberList'];

        if (!sheet) {
            throw new Error('MemberList sheet not found');
        }

        // セルを直接ロードして操作する
        await sheet.loadCells();

        const rowsCount = sheet.rowCount;

        // カテゴリキーと列インデックスの対応マップ
        // A列=0: LunchStaff, B列=1: LunchPartTime, C列=2: DinnerStaff, D列=3: DinnerPartTime
        const columnIndexMap: { [key: string]: number } = {
            LunchStaff: 0,
            LunchPartTime: 1,
            DinnerStaff: 2,
            DinnerPartTime: 3,
        };

        const columnIndex = columnIndexMap[category];
        if (columnIndex === undefined) {
            throw new Error(`Invalid category: ${category}`);
        }

        // 該当列の全データを配列として取得（ヘッダー行をスキップ）
        const columnValues: (string | null)[] = [];
        for (let i = 1; i < rowsCount; i++) {
            const cell = sheet.getCell(i, columnIndex);
            const value = cell.value;
            // 空でない値のみ収集
            if (value !== null && value !== '') {
                columnValues.push(String(value));
            }
        }

        // 削除対象を探す
        const indexToDelete = columnValues.indexOf(name);
        if (indexToDelete === -1) {
            return {
                success: false,
                error: 'メンバーが見つかりませんでした: ' + name,
            };
        }

        // 配列から削除（これで自動的に詰まる）
        columnValues.splice(indexToDelete, 1);

        // 列のセルを更新: 詰めた値を書き戻す
        for (let i = 1; i < rowsCount; i++) {
            const cell = sheet.getCell(i, columnIndex);
            const newValue = columnValues[i - 1] ?? null; // ヘッダーをスキップしてi-1
            cell.value = newValue;
        }

        // 変更されたセルを保存
        await sheet.saveUpdatedCells();
        // 画面更新
        revalidatePath('/member');
        return { success: true };
    } catch (error) {
        if (process.env.NODE_ENV === 'development') {
            // 開発環境のみエラーを出力
            console.error('Error deleting member:', error);
        }
        return {
            success: false,
            error: 'メンバーの削除に失敗しました: ' + error,
        };
    }
};
