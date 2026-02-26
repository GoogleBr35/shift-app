'use server';

import { getGoogleSheets } from '@/lib/GoogleSheets/google';
import { signSubmitToken, verifySubmitToken } from '@/lib/jose/jwt';
import { deleteTokenFromStore } from '@/lib/GoogleSheets/tokenStore';

/**
 * TokenStore シートから指定シート名のトークンを読み取る
 * 期限切れの場合は削除し、新規発行は行わない
 */
export const getSheetToken = async (
    sheetName: string
): Promise<{ token: string | null }> => {
    try {
        const doc = await getGoogleSheets();
        const tokenSheet = doc.sheetsByTitle['TokenStore'];

        // TokenStore が存在する場合、既存トークンを検索
        if (tokenSheet) {
            const rows = await tokenSheet.getRows();
            const row = rows.find((r) => r.get('sheetName') === sheetName);
            if (row) {
                const existing = row.get('token');
                if (existing) {
                    // トークンの有効性を検証
                    const payload = await verifySubmitToken(existing);
                    if (payload) {
                        return { token: existing };
                    }
                    // 期限切れまたは無効な場合は削除
                    await deleteTokenFromStore(existing); // Changed to use deleteTokenFromStore with the actual token
                    return { token: null };
                }
            }
        }

        // 対象シートが存在するか確認
        const targetSheet = doc.sheetsByTitle[sheetName];
        if (!targetSheet) {
            return { token: null };
        }

        // トークンを新規生成して保存
        const token = await signSubmitToken(sheetName, 7);

        let tokenSheetToUpdate = doc.sheetsByTitle['TokenStore'];
        if (!tokenSheetToUpdate) {
            tokenSheetToUpdate = await doc.addSheet({
                title: 'TokenStore',
                headerValues: ['sheetName', 'token'],
            });
        }
        await tokenSheetToUpdate.addRow({ sheetName, token });

        return { token };
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error reading/generating token:', error);
        return { token: null };
    }
};
