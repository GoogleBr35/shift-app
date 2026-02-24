import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/GoogleSheets/google', () => ({
    getGoogleSheets: vi.fn(),
}));

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
}));

import { addMember } from './addMember';
import { getGoogleSheets } from './google';
import { revalidatePath } from 'next/cache';

const mockedGetGoogleSheets = vi.mocked(getGoogleSheets);
const mockedRevalidatePath = vi.mocked(revalidatePath);

describe('addMember', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('既存行の空きセルにメンバーを追加できる', async () => {
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

        const result = await addMember('田中', 'LunchStaff');

        expect(result.success).toBe(true);
        expect(mockRow.set).toHaveBeenCalledWith('LunchStaff', '田中');
        expect(mockSave).toHaveBeenCalled();
        expect(mockedRevalidatePath).toHaveBeenCalledWith('/member');
    });

    it('空き行がない場合、新しい行を追加する', async () => {
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

        const result = await addMember('佐藤', 'DinnerStaff');

        expect(result.success).toBe(true);
        expect(mockAddRow).toHaveBeenCalledWith({ DinnerStaff: '佐藤' });
        expect(mockedRevalidatePath).toHaveBeenCalledWith('/member');
    });

    it('MemberList シートが存在しない場合、エラーを返す', async () => {
        mockedGetGoogleSheets.mockResolvedValue({
            sheetsByTitle: {},
        } as never);

        const result = await addMember('田中', 'LunchStaff');

        expect(result.success).toBe(false);
        expect(result.error).toContain('メンバーの追加に失敗しました');
    });

    it('Google Sheets API がエラーを投げた場合、エラーを返す', async () => {
        mockedGetGoogleSheets.mockRejectedValue(new Error('API Error'));

        const result = await addMember('田中', 'LunchStaff');

        expect(result.success).toBe(false);
        expect(result.error).toContain('メンバーの追加に失敗しました');
    });
});
