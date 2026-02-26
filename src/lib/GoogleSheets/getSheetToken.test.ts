import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/GoogleSheets/google', () => ({
    getGoogleSheets: vi.fn(),
}));

vi.mock('@/lib/jose/jwt', () => ({
    signSubmitToken: vi.fn(),
    verifySubmitToken: vi.fn(),
}));

import { getSheetToken } from './getSheetToken';
import { getGoogleSheets } from '@/lib/GoogleSheets/google';
import { verifySubmitToken, signSubmitToken } from '@/lib/jose/jwt';

const mockedGetGoogleSheets = vi.mocked(getGoogleSheets);
const mockedVerifySubmitToken = vi.mocked(verifySubmitToken);
const mockedSignSubmitToken = vi.mocked(signSubmitToken);

describe('getSheetToken', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    /** Mock Google Sheets Document */
    function createMockDoc(tokenRows: any[] = []) {
        const mockRowDelete = vi.fn();
        const rows = tokenRows.map(r => ({
            get: (key: string) => r[key],
            delete: mockRowDelete
        }));

        const mockTokenSheet = {
            getRows: vi.fn().mockResolvedValue(rows),
            addRow: vi.fn().mockResolvedValue({}),
        };

        const doc = {
            sheetsByTitle: {
                TokenStore: mockTokenSheet,
                test_sheet: { title: 'test_sheet' }
            },
            addSheet: vi.fn().mockResolvedValue(mockTokenSheet),
        };

        return { doc, mockTokenSheet, mockRowDelete };
    }

    it('有効なトークンが TokenStore にある場合、そのまま返すこと', async () => {
        // Given: トークンが保存されており、有効である
        const { doc } = createMockDoc([{ sheetName: 'test_sheet', token: 'valid-token' }]);
        mockedGetGoogleSheets.mockResolvedValue(doc as any);
        mockedVerifySubmitToken.mockResolvedValue({ sheetName: 'test_sheet' });

        // When: トークンを取得
        const result = await getSheetToken('test_sheet');

        // Then: 保存されているトークンが返り、削除は行われない
        expect(result.token).toBe('valid-token');
        expect(mockedVerifySubmitToken).toHaveBeenCalledWith('valid-token');
    });

    it('トークンが期限切れの場合、TokenStore から削除し、null を返すこと（新規発行もしない）', async () => {
        // Given: トークンが保存されているが、期限切れである
        const { doc, mockRowDelete } = createMockDoc([{ sheetName: 'test_sheet', token: 'expired-token' }]);
        mockedGetGoogleSheets.mockResolvedValue(doc as any);
        mockedVerifySubmitToken.mockResolvedValue(null); // Expired

        // When: トークンを取得
        const result = await getSheetToken('test_sheet');

        // Then: 削除が呼ばれ、null が返る
        expect(result.token).toBeNull();
        expect(mockRowDelete).toHaveBeenCalled();
        expect(mockedSignSubmitToken).not.toHaveBeenCalled();
    });

    it('トークンが TokenStore に存在しないがシートが存在する場合、新規発行して保存すること', async () => {
        // Given: TokenStore は空だが、対象シートは存在する
        const { doc, mockTokenSheet } = createMockDoc([]);
        mockedGetGoogleSheets.mockResolvedValue(doc as any);
        mockedSignSubmitToken.mockResolvedValue('new-token');

        // When: トークンを取得
        const result = await getSheetToken('test_sheet');

        // Then: 新規発行され、TokenStore に追加される
        expect(result.token).toBe('new-token');
        expect(mockedSignSubmitToken).toHaveBeenCalled();
        expect(mockTokenSheet.addRow).toHaveBeenCalledWith({
            sheetName: 'test_sheet',
            token: 'new-token'
        });
    });

    it('対象シートが存在しない場合、null を返すこと', async () => {
        // Given: TokenStore は空で、対象シートも見つからない
        const mockDoc = {
            sheetsByTitle: {
                TokenStore: { getRows: vi.fn().mockResolvedValue([]) }
            }
        };
        mockedGetGoogleSheets.mockResolvedValue(mockDoc as any);

        // When: トークンを取得
        const result = await getSheetToken('unknown-sheet');

        // Then: null が返る
        expect(result.token).toBeNull();
    });
});
