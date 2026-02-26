import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/GoogleSheets/google', () => ({
    getGoogleSheets: vi.fn(),
}));

vi.mock('@/lib/jose/jwt', () => ({
    verifySubmitToken: vi.fn(),
}));

import { submitShift } from './submitShift';
import { getGoogleSheets } from '@/lib/GoogleSheets/google';
import { verifySubmitToken } from '@/lib/jose/jwt';

const mockedGetGoogleSheets = vi.mocked(getGoogleSheets);
const mockedVerifySubmitToken = vi.mocked(verifySubmitToken);

describe('submitShift', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    /** Mock Google Sheets Document */
    function createMockDoc() {
        const mockRowDelete = vi.fn();
        const mockTokenSheet = {
            getRows: vi.fn().mockResolvedValue([
                { get: (key: string) => (key === 'token' ? 'expired-token' : 'some-sheet'), delete: mockRowDelete }
            ]),
        };

        const doc = {
            sheetsByTitle: {
                TokenStore: mockTokenSheet,
                some_sheet: {
                    loadCells: vi.fn(),
                    getCell: vi.fn(),
                    saveUpdatedCells: vi.fn(),
                    rowCount: 10,
                    columnCount: 10
                }
            },
        };

        return { doc, mockTokenSheet, mockRowDelete };
    }

    it('トークンが期限切れの場合、TokenStore から削除を試み、エラーを返すこと', async () => {
        // Given: トークンが期限切れ
        const { doc, mockRowDelete } = createMockDoc();
        mockedGetGoogleSheets.mockResolvedValue(doc as any);
        mockedVerifySubmitToken.mockResolvedValue(null); // Invalid/Expired

        // When: シフトを提出
        const result = await submitShift('expired-token', '田中', []);

        // Then: TokenStore からの削除が呼ばれ、エラーが返る
        expect(result.success).toBe(false);
        expect(result.error).toBe('トークンが無効または期限切れです');
        expect(mockRowDelete).toHaveBeenCalled();
    });

    it('トークンが有効な場合、正常に書き込みが行われること', async () => {
        // Given: トークンが有効
        const { doc } = createMockDoc();
        mockedGetGoogleSheets.mockResolvedValue(doc as any);
        mockedVerifySubmitToken.mockResolvedValue({ sheetName: 'some_sheet' });

        // Mock cell access
        const mockCell = { value: '田中', horizontalAlignment: '', verticalAlignment: '' };
        (doc.sheetsByTitle.some_sheet.getCell as any).mockReturnValue(mockCell);

        // When: シフトを提出
        const result = await submitShift('valid-token', '田中', [{ colIndex: 1, value: '○' }]);

        // Then: 成功が返り、セルが更新される
        expect(result.success).toBe(true);
        expect(mockCell.value).toBe('○');
    });
});
