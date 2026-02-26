import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/GoogleSheets/google', () => ({
    getGoogleSheets: vi.fn(),
}));

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
    revalidateTag: vi.fn(),
}));

import { addMember } from './addMember';
import { getGoogleSheets } from './google';
import { revalidatePath } from 'next/cache';

const mockedGetGoogleSheets = vi.mocked(getGoogleSheets);
const mockedRevalidatePath = vi.mocked(revalidatePath);

describe('addMember (メンバー追加)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('既存の行に空きセルがある場合、そこにメンバーを追加して保存すること', async () => {
        // Given (前提): 該当カテゴリのセルが空いている行が存在する
        const mockSave = vi.fn();
        const mockRow = {
            get: vi.fn((key: string) => (key === 'LunchStaff' ? '' : 'existing')),
            set: vi.fn(),
            save: mockSave,
        };

        mockedGetGoogleSheets.mockResolvedValue({
            sheetsByTitle: {
                MemberList: {
                    getRows: vi.fn().mockResolvedValue([mockRow]),
                },
            },
        } as never);

        // When (実行): メンバーを追加する
        const result = await addMember('田中', 'LunchStaff');

        // Then (検証): 該当行のセルが更新され、キャッシュがパージされること
        expect(result.success).toBe(true);
        expect(mockRow.set).toHaveBeenCalledWith('LunchStaff', '田中');
        expect(mockSave).toHaveBeenCalled();
        expect(mockedRevalidatePath).toHaveBeenCalledWith('/member');
    });

    it('既存の行に空きがない場合、新しい行を作成してメンバーを追加すること', async () => {
        // Given (前提): 全ての行の該当カテゴリが埋まっている
        const mockRow = {
            get: vi.fn(() => 'occupied'),
            set: vi.fn(),
            save: vi.fn(),
        };
        const mockAddRow = vi.fn();

        mockedGetGoogleSheets.mockResolvedValue({
            sheetsByTitle: {
                MemberList: {
                    getRows: vi.fn().mockResolvedValue([mockRow]),
                    addRow: mockAddRow,
                },
            },
        } as never);

        // When (実行): メンバーを追加する
        const result = await addMember('佐藤', 'DinnerStaff');

        // Then (検証): 新しい行が追加されること
        expect(result.success).toBe(true);
        expect(mockAddRow).toHaveBeenCalledWith({ DinnerStaff: '佐藤' });
        expect(mockedRevalidatePath).toHaveBeenCalledWith('/member');
    });

    it.each([
        {
            mock: () => mockedGetGoogleSheets.mockResolvedValue({ sheetsByTitle: {} } as never),
            description: 'MemberListシートが存在しない',
        },
        {
            mock: () => mockedGetGoogleSheets.mockRejectedValue(new Error('Network error')),
            description: 'API通信エラー',
        },
    ])('$description の場合、失敗結果を返すこと', async ({ mock }) => {
        // Given: 特定のエラー状況
        mock();

        // When: メンバーを追加する
        const result = await addMember('田中', 'LunchStaff');

        // Then: 成功フラグが false になり、エラーメッセージが含まめること
        expect(result.success).toBe(false);
        expect(result.error).toContain('メンバーの追加に失敗しました');
    });
});
