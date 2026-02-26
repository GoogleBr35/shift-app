'use server';

import { getGoogleSheets } from '@/lib/GoogleSheets/google';

/**
 * TokenStore から指定されたトークンを削除する
 */
export const deleteTokenFromStore = async (token: string) => {
    try {
        const doc = await getGoogleSheets();
        const tokenSheet = doc.sheetsByTitle['TokenStore'];
        if (tokenSheet) {
            const rows = await tokenSheet.getRows();
            const row = rows.find((r) => r.get('token') === token);
            if (row) {
                console.log(`[TokenStore] Deleting token: ${token.substring(0, 10)}...`);
                await row.delete();
                return true;
            }
        }
        return false;
    } catch (error) {
        console.error('[TokenStore] Delete error:', error);
        return false;
    }
};

/**
 * TokenStore から指定されたシート名のトークンを削除する
 */
export const deleteTokenBySheetName = async (sheetName: string) => {
    try {
        const doc = await getGoogleSheets();
        const tokenSheet = doc.sheetsByTitle['TokenStore'];
        if (tokenSheet) {
            const rows = await tokenSheet.getRows();
            const row = rows.find((r) => r.get('sheetName') === sheetName);
            if (row) {
                console.log(`[TokenStore] Deleting token for sheet: ${sheetName}`);
                await row.delete();
                return true;
            }
        }
        return false;
    } catch (error) {
        console.error('[TokenStore] Delete error by sheetName:', error);
        return false;
    }
};
