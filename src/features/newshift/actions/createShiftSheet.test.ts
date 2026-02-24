import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/GoogleSheets/google', () => ({
    getGoogleSheets: vi.fn(),
}));

vi.mock('@/lib/GoogleSheets/getMember', () => ({
    getMember: vi.fn(),
}));

import { createShiftSheet } from './createShiftSheet';
import { getGoogleSheets } from '@/lib/GoogleSheets/google';
import { getMember } from '@/lib/GoogleSheets/getMember';

const mockedGetGoogleSheets = vi.mocked(getGoogleSheets);
const mockedGetMember = vi.mocked(getMember);

describe('createShiftSheet', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    /**
     * Google Sheets ドキュメントのモックを生成
     */
    function createMockDoc(options?: { existingSheet?: boolean }) {
        const mockDelete = vi.fn();
        const mockNewSheet = { sheetId: 200 };
        const sheetsByTitle: Record<string, unknown> = {
            Templates: { sheetId: 100 },
        };
        if (options?.existingSheet) {
            sheetsByTitle['2026-02-23_2026-02-28'] = { delete: mockDelete };
        }

        return {
            doc: {
                sheetsByTitle,
                addSheet: vi.fn().mockResolvedValue(mockNewSheet),
                _makeBatchUpdateRequest: vi.fn().mockResolvedValue(undefined),
            },
            mockDelete,
            mockNewSheet,
        };
    }

    function setupMocks(options?: { existingSheet?: boolean }) {
        const { doc, mockDelete, mockNewSheet } = createMockDoc(options);
        mockedGetGoogleSheets.mockResolvedValue(doc as never);
        mockedGetMember.mockResolvedValue({
            LunchStaff: ['田中', '佐藤'],
            LunchPartTime: ['山田'],
            DinnerStaff: ['鈴木'],
            DinnerPartTime: ['高橋'],
        });
        return { doc, mockDelete, mockNewSheet };
    }

    it('シフト表を正常に作成できる', async () => {
        const { doc } = setupMocks();
        const start = new Date(2026, 1, 23); // 2026-02-23 (Mon)
        const end = new Date(2026, 1, 28);   // 2026-02-28 (Sat)

        const result = await createShiftSheet(start, end);

        expect(result.success).toBe(true);
        expect(result.sheetName).toBe('2026-02-23_2026-02-28');
        expect(doc.addSheet).toHaveBeenCalledWith({ title: '2026-02-23_2026-02-28' });
        expect(doc._makeBatchUpdateRequest).toHaveBeenCalled();
    });

    it('同名の既存シートがある場合、削除してから作成する', async () => {
        const { mockDelete } = setupMocks({ existingSheet: true });
        const start = new Date(2026, 1, 23);
        const end = new Date(2026, 1, 28);

        const result = await createShiftSheet(start, end);

        expect(result.success).toBe(true);
        expect(mockDelete).toHaveBeenCalled();
    });

    it('Templates シートが存在しない場合、エラーを返す', async () => {
        mockedGetGoogleSheets.mockResolvedValue({
            sheetsByTitle: {},
            addSheet: vi.fn(),
        } as never);
        mockedGetMember.mockResolvedValue({
            LunchStaff: [],
            LunchPartTime: [],
            DinnerStaff: [],
            DinnerPartTime: [],
        });

        const start = new Date(2026, 1, 23);
        const end = new Date(2026, 1, 28);

        const result = await createShiftSheet(start, end);

        expect(result.success).toBe(false);
        expect(result.error).toBe('シフト表の作成に失敗しました');
    });

    it('Google Sheets API がエラーを投げた場合、エラーを返す', async () => {
        mockedGetGoogleSheets.mockRejectedValue(new Error('API Error'));

        const start = new Date(2026, 1, 23);
        const end = new Date(2026, 1, 28);

        const result = await createShiftSheet(start, end);

        expect(result.success).toBe(false);
        expect(result.error).toBe('シフト表の作成に失敗しました');
    });

    it('batchUpdate でリクエスト配列が送信される', async () => {
        const { doc } = setupMocks();
        const start = new Date(2026, 1, 23); // Mon
        const end = new Date(2026, 1, 25);   // Wed

        await createShiftSheet(start, end);

        // batchUpdate が呼ばれ、配列が渡されることを確認
        expect(doc._makeBatchUpdateRequest).toHaveBeenCalledWith(
            expect.arrayContaining([
                expect.objectContaining({
                    updateSheetProperties: expect.any(Object),
                }),
            ])
        );
    });
});
