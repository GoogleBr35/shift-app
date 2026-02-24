import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/GoogleSheets/google', () => ({
    getGoogleSheets: vi.fn(),
}));

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
    revalidateTag: vi.fn(),
}));

import { deleteMember } from './deleteMember';
import { getGoogleSheets } from './google';
import { revalidatePath } from 'next/cache';

const mockedGetGoogleSheets = vi.mocked(getGoogleSheets);
const mockedRevalidatePath = vi.mocked(revalidatePath);

// ヘルパー: セルのモックを生成
function createMockCells(columnData: (string | null)[]) {
    // columnData[0] はヘッダー行、columnData[1..] はデータ行
    const cells = columnData.map((val) => ({ value: val }));
    return cells;
}

describe('deleteMember', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('メンバーを削除し、列の値を詰めて保存する', async () => {
        // Column 0 (LunchStaff): header, 田中, 佐藤, 高橋, null
        const cells = createMockCells(['LunchStaff', '田中', '佐藤', '高橋', null]);
        const mockSaveUpdatedCells = vi.fn();

        mockedGetGoogleSheets.mockResolvedValue({
            sheetsByTitle: {
                MemberList: {
                    loadCells: vi.fn(),
                    rowCount: 5,
                    getCell: vi.fn((row: number, col: number) => {
                        if (col === 0) return cells[row];
                        return { value: null };
                    }),
                    saveUpdatedCells: mockSaveUpdatedCells,
                },
            },
        } as never);

        const result = await deleteMember('佐藤', 'LunchStaff');

        expect(result.success).toBe(true);
        expect(mockSaveUpdatedCells).toHaveBeenCalled();
        expect(mockedRevalidatePath).toHaveBeenCalledWith('/member');
        // 佐藤が削除され、高橋が繰り上がる
        expect(cells[1].value).toBe('田中');
        expect(cells[2].value).toBe('高橋');
        expect(cells[3].value).toBeNull();
    });

    it('存在しないメンバーの削除を試みた場合、エラーを返す', async () => {
        const cells = createMockCells(['LunchStaff', '田中', '佐藤', null]);

        mockedGetGoogleSheets.mockResolvedValue({
            sheetsByTitle: {
                MemberList: {
                    loadCells: vi.fn(),
                    rowCount: 4,
                    getCell: vi.fn((row: number, col: number) => {
                        if (col === 0) return cells[row];
                        return { value: null };
                    }),
                    saveUpdatedCells: vi.fn(),
                },
            },
        } as never);

        const result = await deleteMember('山田', 'LunchStaff');

        expect(result.success).toBe(false);
        expect(result.error).toContain('メンバーが見つかりませんでした');
    });

    it('無効なカテゴリの場合、エラーを返す', async () => {
        mockedGetGoogleSheets.mockResolvedValue({
            sheetsByTitle: {
                MemberList: {
                    loadCells: vi.fn(),
                    rowCount: 3,
                    getCell: vi.fn(),
                    saveUpdatedCells: vi.fn(),
                },
            },
        } as never);

        const result = await deleteMember('田中', 'InvalidCategory');

        expect(result.success).toBe(false);
        expect(result.error).toContain('メンバーの削除に失敗しました');
    });

    it('MemberList シートが存在しない場合、エラーを返す', async () => {
        mockedGetGoogleSheets.mockResolvedValue({
            sheetsByTitle: {},
        } as never);

        const result = await deleteMember('田中', 'LunchStaff');

        expect(result.success).toBe(false);
        expect(result.error).toContain('メンバーの削除に失敗しました');
    });

    it('Google Sheets API がエラーを投げた場合、エラーを返す', async () => {
        mockedGetGoogleSheets.mockRejectedValue(new Error('API Error'));

        const result = await deleteMember('田中', 'LunchStaff');

        expect(result.success).toBe(false);
        expect(result.error).toContain('メンバーの削除に失敗しました');
    });
});
