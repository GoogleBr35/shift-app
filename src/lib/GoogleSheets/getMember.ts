'use server';

import { getGoogleSheets } from '@/lib/GoogleSheets/google';

export type MemberData = {
    LunchStaff: string[];
    LunchPartTime: string[];
    DinnerStaff: string[];
    DinnerPartTime: string[];
};

export const getMember = async (): Promise<MemberData> => {
    try {
        const doc = await getGoogleSheets();
        const sheet = doc.sheetsByTitle['MemberList'];

        if (!sheet) {
            return {
                LunchStaff: [],
                LunchPartTime: [],
                DinnerStaff: [],
                DinnerPartTime: [],
            };
        }

        // GoogleSheetsのデータを取得
        const rows = await sheet.getRows();

        // GoogleSheetsのデータを配列に変換
        const memberData: MemberData = {
            LunchStaff: [],
            LunchPartTime: [],
            DinnerStaff: [],
            DinnerPartTime: [],
        };

        for (const row of rows) {
            const lunchStaff = row.get('LunchStaff');
            if (lunchStaff) memberData.LunchStaff.push(lunchStaff);

            const lunchPartTime = row.get('LunchPartTime');
            if (lunchPartTime) memberData.LunchPartTime.push(lunchPartTime);

            const dinnerStaff = row.get('DinnerStaff');
            if (dinnerStaff) memberData.DinnerStaff.push(dinnerStaff);

            const dinnerPartTime = row.get('DinnerPartTime');
            if (dinnerPartTime) memberData.DinnerPartTime.push(dinnerPartTime);
        }

        return memberData;
    } catch (error) {
        if (process.env.NODE_ENV === 'development') {
            console.error('Error fetching member list:', error);
        }
        // エラーが発生した場合は空の配列を返す
        return {
            LunchStaff: [],
            LunchPartTime: [],
            DinnerStaff: [],
            DinnerPartTime: [],
        };
    }
};
