'use server';

import { getGoogleSheets } from '@/lib/GoogleSheets/google';
import { signSubmitToken } from '@/lib/jose/jwt';

/**
 * TokenStore シートから指定シート名のトークンを読み取る
 * トークンが存在しない場合は新規生成して保存する
 */
export const getSheetToken = async (
    sheetName: string
): Promise<{ token: string | null }> => {
    try {
        const doc = await getGoogleSheets();
        let tokenSheet = doc.sheetsByTitle['TokenStore'];

        // TokenStore が存在する場合、既存トークンを検索
        if (tokenSheet) {
            const rows = await tokenSheet.getRows();
            const row = rows.find((r) => r.get('sheetName') === sheetName);
            if (row) {
                const existing = row.get('token');
                if (existing) return { token: existing };
            }
        }

        // 対象シートが存在するか確認
        const targetSheet = doc.sheetsByTitle[sheetName];
        if (!targetSheet) {
            return { token: null };
        }

        // トークンを新規生成して保存
        const token = await signSubmitToken(sheetName, 7);

        if (!tokenSheet) {
            tokenSheet = await doc.addSheet({
                title: 'TokenStore',
                headerValues: ['sheetName', 'token'],
            });
        }
        await tokenSheet.addRow({ sheetName, token });

        return { token };
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error reading/generating token:', error);
        return { token: null };
    }
};
