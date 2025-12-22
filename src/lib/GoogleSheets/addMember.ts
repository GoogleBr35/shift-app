'use server';

import { getGoogleSheets } from '@/lib/GoogleSheets/google';
import { revalidatePath } from 'next/cache';

/**
 * メンバーを追加するサーバーアクション
 * @param name 追加するメンバーの名前
 * @param category 追加するカテゴリのキー (例: LunchStaff)
 */
export const addMember = async (name: string, category: string) => {
    try {
        // Google Sheets APIの初期化
        const doc = await getGoogleSheets();
        const sheet = doc.sheetsByTitle['MemberList'];

        if (!sheet) {
            throw new Error('MemberList sheet not found');
        }

        // 行データを取得
        const rows = await sheet.getRows();

        // 追加されたかどうかのフラグ
        let added = false;

        // 既存の行の中で、該当カテゴリのセルが空いている場所を探して埋める
        // (列ごとに独立したリストとして扱うため)
        for (const row of rows) {
            if (!row.get(category)) {
                // 既存の行に空いている場所がある場合
                row.set(category, name); // 既存の行にメンバーを追加
                await row.save(); // 変更を保存
                added = true; // 追加フラグを立てる
                break;
            }
        }

        // 空きがなかった場合、新しい行を作成して追加する
        if (!added) {
            await sheet.addRow({ [category]: name });
        }

        // データの更新を画面に反映させるためキャッシュをパージ
        revalidatePath('/member');
        return { success: true };
    } catch (error) {
        return {
            success: false,
            error: 'メンバーの追加に失敗しました: ' + error,
        };
    }
};
