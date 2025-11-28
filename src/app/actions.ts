'use server'

import { getGoogleSheets } from '@/lib/google';

export async function testConnection() {
    try {
        const sheetId = process.env.MASTER_SHEET_ID;
        if (!sheetId) throw new Error('MASTER_SHEET_ID is not set');

        const sheets = await getGoogleSheets();

        // スプレッドシートの 'A1' セルを取得
        // シート名が指定されていない場合、最初のシートのA1が取得されます
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: 'A1',
        });

        const value = response.data.values?.[0]?.[0];

        return {
            success: true,
            message: `接続成功！ A1の値: "${value || '空'}"`
        };

    } catch (error: any) {
        console.error('Connection Error:', error);
        return {
            success: false,
            message: `エラーが発生しました: ${error.message}`
        };
    }
}