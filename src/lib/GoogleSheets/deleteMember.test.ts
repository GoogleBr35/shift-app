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

/** セルのモックデータを生成するヘルパー */
function createMockCells(columnData: (string | null)[]) {
    // columnData[0] はヘッダー行、columnData[1..] はデータ行
    return columnData.map((val) => ({ value: val }));
}

describe('deleteMember (メンバー削除)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('メンバーを削除し、同じ列の下にあるメンバーを上に詰めて保存すること', async () => {
        // Given (前提): 特定のカテゴリに複数のメンバーが並んでいる
        const cells = createMockCells(['LunchStaff', '田中', '佐藤', '高橋', null]);
        const mockSaveUpdatedCells = vi.fn();

        mockedGetGoogleSheets.mockResolvedValue({
            sheetsByTitle: {
                MemberList: {
                    loadCells: vi.fn(),
                    rowCount: 5,
                    getCell: vi.fn((row: number, col: number) => (col === 0 ? cells[row] : { value: null })),
                    saveUpdatedCells: mockSaveUpdatedCells,
                },
            },
        } as never);

        // When (実行): '佐藤' を削除する
        const result = await deleteMember('佐藤', 'LunchStaff');

        // Then (検証): 佐藤が消え、高橋が上に繰り上がり、セルが保存されること
        expect(result.success).toBe(true);
        expect(mockSaveUpdatedCells).toHaveBeenCalled();
        expect(mockedRevalidatePath).toHaveBeenCalledWith('/member');
        expect(cells[1].value).toBe('田中');
        expect(cells[2].value).toBe('高橋');
        expect(cells[3].value).toBeNull();
    });

    it('指定されたメンバーがシート内に存在しない場合、エラーを返すこと', async () => {
        // Given: '山田' が存在しないシート状態
        const cells = createMockCells(['LunchStaff', '田中', '佐藤', null]);
        mockedGetGoogleSheets.mockResolvedValue({
            sheetsByTitle: {
                MemberList: {
                    loadCells: vi.fn(),
                    rowCount: 4,
                    getCell: vi.fn((row: number, col: number) => (col === 0 ? cells[row] : { value: null })),
                    saveUpdatedCells: vi.fn(),
                },
            },
        } as never);

        // When: '山田' の削除を試みる
        const result = await deleteMember('山田', 'LunchStaff');

        // Then: 失敗結果と適切なメッセージが返ること
        expect(result.success).toBe(false);
        expect(result.error).toContain('メンバーが見つかりませんでした');
    });

    it.each([
        {
            category: 'InvalidCategory',
            setup: () =>
                mockedGetGoogleSheets.mockResolvedValue({
                    sheetsByTitle: { MemberList: { loadCells: vi.fn() } },
                } as never),
            description: '無効なカテゴリを指定',
        },
        {
            category: 'LunchStaff',
            setup: () => mockedGetGoogleSheets.mockResolvedValue({ sheetsByTitle: {} } as never),
            description: 'MemberListシートが存在しない',
        },
        {
            category: 'LunchStaff',
            setup: () => mockedGetGoogleSheets.mockRejectedValue(new Error('API failure')),
            description: 'API通信エラー',
        },
    ])('$description の場合、失敗結果を返すこと', async ({ category, setup }) => {
        // Given: 特定の異常系セットアップ
        setup();

        // When: 削除処理を実行
        const result = await deleteMember('田中', category);

        // Then: 失敗結果が返ること
        expect(result.success).toBe(false);
        expect(result.error).toContain('メンバーの削除に失敗しました');
    });
});
