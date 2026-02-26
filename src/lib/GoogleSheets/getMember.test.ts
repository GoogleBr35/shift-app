import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/GoogleSheets/google', () => ({
    getGoogleSheets: vi.fn(),
}));

// unstable_cache はコールバックをそのまま返すモック
vi.mock('next/cache', () => ({
    unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}));

import { getMember } from './getMember';
import { getGoogleSheets } from './google';

const mockedGetGoogleSheets = vi.mocked(getGoogleSheets);

/** Google Sheets の行データを表現するモック */
function createMockRow(data: Record<string, string>) {
    return {
        get: vi.fn((key: string) => data[key] || ''),
    };
}

describe('getMember (メンバー一覧取得)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('MemberList シートから各カテゴリのメンバーを配列形式で抽出できること', async () => {
        // Given (前提): MemberList シートに複数のメンバーが記載されている
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

        // When (実行): getMember を呼び出す
        const result = await getMember();

        // Then (検証): カテゴリごとに名前が正しく振り分けられ、空セルは除外されていること
        expect(result).toEqual({
            LunchStaff: ['田中', '高橋'],
            LunchPartTime: ['佐藤'],
            DinnerStaff: ['山田', '伊藤'],
            DinnerPartTime: ['鈴木'],
        });
    });

    it.each([
        {
            mock: () => mockedGetGoogleSheets.mockResolvedValue({ sheetsByTitle: {} } as never),
            description: 'シートが存在しない',
        },
        {
            mock: () => mockedGetGoogleSheets.mockRejectedValue(new Error('API disconnect')),
            description: 'API通信エラー',
        },
    ])('$description の場合、フォールバックとして空データを返すこと', async ({ mock }) => {
        // Given: 特定のエラー状況
        mock();

        // When: getMember を呼び出す
        const result = await getMember();

        // Then: すべて空配列として返ること
        expect(result).toEqual({
            LunchStaff: [],
            LunchPartTime: [],
            DinnerStaff: [],
            DinnerPartTime: [],
        });
    });

    it('シートが空行のみで構成されている場合、結果も空配列になること', async () => {
        // Given: 内容が空の行データ
        const mockRows = [createMockRow({ LunchStaff: '', LunchPartTime: '' })];
        mockedGetGoogleSheets.mockResolvedValue({
            sheetsByTitle: {
                MemberList: {
                    getRows: vi.fn().mockResolvedValue(mockRows),
                },
            },
        } as never);

        // When: getMember を呼び出す
        const result = await getMember();

        // Then: すべて空配列として返ること
        expect(result.LunchStaff).toHaveLength(0);
        expect(result.LunchPartTime).toHaveLength(0);
    });
});
