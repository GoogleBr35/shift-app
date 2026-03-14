import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/GoogleSheets/google', () => ({
    getGoogleSheets: vi.fn(),
}));

import { savePreviousSubmit } from './savePreviousSubmit';
import { getGoogleSheets } from '@/lib/GoogleSheets/google';

const mockedGetGoogleSheets = vi.mocked(getGoogleSheets);

describe('savePreviousSubmit', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    /** PreviousSubmit シートのモックを生成する */
    function createMockDoc(options: {
        hasPreviousSubmit: boolean;
        existingRows?: { sheetName: string; staffName: string; shifts: string }[];
    }) {
        const mockSave = vi.fn();
        const mockAddRow = vi.fn();
        const mockAddSheet = vi.fn();

        const rows = (options.existingRows ?? []).map((data) => {
            const rowData = { ...data };
            return {
                get: (key: string) => rowData[key as keyof typeof rowData],
                set: (key: string, value: string) => {
                    (rowData as Record<string, string>)[key] = value;
                },
                save: mockSave,
                _data: rowData,
            };
        });

        const psSheet = options.hasPreviousSubmit
            ? { getRows: vi.fn().mockResolvedValue(rows), addRow: mockAddRow }
            : null;

        mockAddSheet.mockResolvedValue({
            getRows: vi.fn().mockResolvedValue([]),
            addRow: mockAddRow,
        });

        const doc = {
            sheetsByTitle: {
                ...(psSheet ? { PreviousSubmit: psSheet } : {}),
            },
            addSheet: mockAddSheet,
        };

        return { doc, mockSave, mockAddRow, mockAddSheet, rows };
    }

    it('PreviousSubmitシートが存在しない場合、新規作成してから行を追加すること', async () => {
        // Given: PreviousSubmitシートが存在しない
        const { doc, mockAddSheet, mockAddRow } = createMockDoc({
            hasPreviousSubmit: false,
        });
        mockedGetGoogleSheets.mockResolvedValue(doc as any);

        const shifts = [
            { startCol: 1, endCol: 2, startValue: 10, endValue: 15 },
            { startCol: 3, endCol: 4, startValue: null, endValue: null },
        ];
        const dates = ['1', '2'];

        // When: 保存を実行
        await savePreviousSubmit('2026-03-10_2026-03-16', '田中', shifts, dates);

        // Then: シート作成と行追加が呼ばれる（休みの日は省略）
        expect(mockAddSheet).toHaveBeenCalledWith({
            title: 'PreviousSubmit',
            headerValues: ['sheetName', 'staffName', 'shifts'],
        });
        expect(mockAddRow).toHaveBeenCalledWith({
            sheetName: '2026-03-10_2026-03-16',
            staffName: '田中',
            shifts: '1-10-15',
        });
    });

    it('既存行がある場合、上書き更新すること', async () => {
        // Given: 田中の既存行がある
        const { doc, mockSave, mockAddRow, rows } = createMockDoc({
            hasPreviousSubmit: true,
            existingRows: [
                { sheetName: '2026-03-03_2026-03-09', staffName: '田中', shifts: '1-9-17' },
            ],
        });
        mockedGetGoogleSheets.mockResolvedValue(doc as any);

        const shifts = [
            { startCol: 1, endCol: 2, startValue: 10, endValue: 18 },
        ];
        const dates = ['5'];

        // When: 新しいシフト期間で提出
        await savePreviousSubmit('2026-03-10_2026-03-16', '田中', shifts, dates);

        // Then: 既存行が上書きされ、新規行は追加されない
        expect(mockSave).toHaveBeenCalled();
        expect(mockAddRow).not.toHaveBeenCalled();
        expect(rows[0]._data.sheetName).toBe('2026-03-10_2026-03-16');
        expect(rows[0]._data.shifts).toBe('5-10-18');
    });

    it('既存行がない場合、新規行を追加すること', async () => {
        // Given: PreviousSubmitシートはあるが、該当スタッフの行がない
        const { doc, mockSave, mockAddRow } = createMockDoc({
            hasPreviousSubmit: true,
            existingRows: [
                { sheetName: '2026-03-10_2026-03-16', staffName: '鈴木', shifts: '1-11-17' },
            ],
        });
        mockedGetGoogleSheets.mockResolvedValue(doc as any);

        const shifts = [
            { startCol: 1, endCol: 2, startValue: 14, endValue: 22 },
            { startCol: 3, endCol: 4, startValue: 10, endValue: 18 },
        ];
        const dates = ['3', '4'];

        // When: 田中が初めて提出
        await savePreviousSubmit('2026-03-10_2026-03-16', '田中', shifts, dates);

        // Then: 新規行が追加される
        expect(mockAddRow).toHaveBeenCalledWith({
            sheetName: '2026-03-10_2026-03-16',
            staffName: '田中',
            shifts: '3-14-22,4-10-18',
        });
        expect(mockSave).not.toHaveBeenCalled();
    });
});
