import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/GoogleSheets/google', () => ({
    getGoogleSheets: vi.fn(),
}));

import { getMember } from './getMember';
import { getGoogleSheets } from './google';

const mockedGetGoogleSheets = vi.mocked(getGoogleSheets);

// ヘルパー: Google Sheets の行モックを生成
function createMockRow(data: Record<string, string>) {
    return {
        get: vi.fn((key: string) => data[key] || ''),
    };
}

describe('getMember', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('MemberList シートからメンバーデータを取得できる', async () => {
        const mockRows = [
            createMockRow({
                LunchStaff: '田中',
                LunchPartTime: '佐藤',
                DinnerStaff: '山田',
                DinnerPartTime: '鈴木',
            }),
            createMockRow({
                LunchStaff: '高橋',
                LunchPartTime: '',
                DinnerStaff: '伊藤',
                DinnerPartTime: '',
            }),
        ];

        mockedGetGoogleSheets.mockResolvedValue({
            sheetsByTitle: {
                MemberList: {
                    getRows: vi.fn().mockResolvedValue(mockRows),
                },
            },
        } as never);

        const result = await getMember();

        expect(result.LunchStaff).toEqual(['田中', '高橋']);
        expect(result.LunchPartTime).toEqual(['佐藤']);
        expect(result.DinnerStaff).toEqual(['山田', '伊藤']);
        expect(result.DinnerPartTime).toEqual(['鈴木']);
    });

    it('MemberList シートが存在しない場合、空データを返す', async () => {
        mockedGetGoogleSheets.mockResolvedValue({
            sheetsByTitle: {},
        } as never);

        const result = await getMember();

        expect(result).toEqual({
            LunchStaff: [],
            LunchPartTime: [],
            DinnerStaff: [],
            DinnerPartTime: [],
        });
    });

    it('全行が空の場合、空配列を返す', async () => {
        const mockRows = [
            createMockRow({
                LunchStaff: '',
                LunchPartTime: '',
                DinnerStaff: '',
                DinnerPartTime: '',
            }),
        ];

        mockedGetGoogleSheets.mockResolvedValue({
            sheetsByTitle: {
                MemberList: {
                    getRows: vi.fn().mockResolvedValue(mockRows),
                },
            },
        } as never);

        const result = await getMember();

        expect(result).toEqual({
            LunchStaff: [],
            LunchPartTime: [],
            DinnerStaff: [],
            DinnerPartTime: [],
        });
    });

    it('Google Sheets API がエラーを投げた場合、空データを返す', async () => {
        mockedGetGoogleSheets.mockRejectedValue(new Error('API Error'));

        const result = await getMember();

        expect(result).toEqual({
            LunchStaff: [],
            LunchPartTime: [],
            DinnerStaff: [],
            DinnerPartTime: [],
        });
    });
});
