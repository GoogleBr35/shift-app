import { google } from 'googleapis';

export const getGoogleSheets = async () => {
    // 1. 環境変数のチェック
    const encodedKey = process.env.GOOGLE_SA_BASE64;
    if (!encodedKey) {
        throw new Error('GOOGLE_SA_BASE64 is not set in .env.local');
    }

    // 2. Base64をデコードしてJSONオブジェクトに戻す
    const decodedKey = Buffer.from(encodedKey, 'base64').toString('utf-8');
    let credentials;
    try {
        credentials = JSON.parse(decodedKey);
    } catch (e) {
        throw new Error('Failed to parse GOOGLE_SA_BASE64 JSON');
    }

    // 3. 認証クライアントの作成
    const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    // 4. Sheets API クライアントを返す
    const client = await auth.getClient();
    return google.sheets({ version: 'v4', auth: client as any });
};