import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/GoogleSheets/google', () => ({
    getGoogleSheets: vi.fn(),
}));

vi.mock('@/lib/GoogleSheets/getMember', () => ({
    getMember: vi.fn(),
}));

vi.mock('@/lib/jose/jwt', () => ({
    signSubmitToken: vi.fn().mockResolvedValue('test-jwt-token'),
}));

import { createShiftSheet } from './createShiftSheet';
import { getGoogleSheets } from '@/lib/GoogleSheets/google';
import { getMember } from '@/lib/GoogleSheets/getMember';

const mockedGetGoogleSheets = vi.mocked(getGoogleSheets);
const mockedGetMember = vi.mocked(getMember);

describe('createShiftSheet (シフト表作成)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    /** Google Sheets ドキュメントのモックを生成 */
    function createMockDoc(options?: { existingSheet?: boolean }) {
        const mockDelete = vi.fn();
        const mockNewSheet = { sheetId: 200 };
        const mockTokenSheet = {
            getRows: vi.fn().mockResolvedValue([]),
            addRow: vi.fn().mockResolvedValue({}),
        };
        const sheetsByTitle: Record<string, unknown> = {
            Templates: { sheetId: 100 },
        };
        if (options?.existingSheet) {
            sheetsByTitle['2026-02-23_2026-02-28'] = { delete: mockDelete };
        }

        const addSheet = vi.fn().mockImplementation(async (opts: { title: string }) => {
            if (opts.title === 'TokenStore') {
                sheetsByTitle['TokenStore'] = mockTokenSheet;
                return mockTokenSheet;
            }
            return mockNewSheet;
        });

        return {
            doc: {
                sheetsByTitle,
                addSheet,
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

    it('指定された日付範囲に基づき、新しいシートを生成してメンバー情報を流し込めること', async () => {
        // Given (前提): 開始日と終了日が指定され、テンプレートが存在する
        const { doc } = setupMocks();
        const start = new Date(2026, 1, 23); // 2026-02-23 (Mon)
        const end = new Date(2026, 1, 28); // 2026-02-28 (Sat)

        // When (実行): シフト表作成アクションを呼び出す
        const result = await createShiftSheet(start, end);

        // Then (検証): 正しいシート名の作成、およびバッチ更新APIが呼ばれること
        expect(result.success).toBe(true);
        expect(result.sheetName).toBe('2026-02-23_2026-02-28');
        expect(result.token).toBe('test-jwt-token');
        expect(doc.addSheet).toHaveBeenCalledWith({ title: '2026-02-23_2026-02-28' });
        expect(doc._makeBatchUpdateRequest).toHaveBeenCalled();
    });

    it('同名のシートが既に存在する場合、既存のものを削除してから再作成すること', async () => {
        // Given: '2026-02-23_2026-02-28' シートが既に存在する
        const { mockDelete } = setupMocks({ existingSheet: true });
        const start = new Date(2026, 1, 23);
        const end = new Date(2026, 1, 28);

        // When: シフト表作成を実行
        await createShiftSheet(start, end);

        // Then: 旧シートの削除メソッドが実行されること
        expect(mockDelete).toHaveBeenCalled();
    });

    it.each([
        {
            setup: () => {
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
            },
            description: 'Templatesシートが存在しない',
        },
        {
            setup: () => mockedGetGoogleSheets.mockRejectedValue(new Error('Auth failed')),
            description: 'API通信エラーが発生',
        },
    ])('$description の場合、失敗結果を返すこと', async ({ setup }) => {
        // Given: 特定のエラー発生パターン
        setup();
        const start = new Date(2026, 1, 23);
        const end = new Date(2026, 1, 28);

        // When: シフト表作成を実行
        const result = await createShiftSheet(start, end);

        // Then: 失敗ステータスが返ること
        expect(result.success).toBe(false);
        expect(result.error).toBe('シフト表の作成に失敗しました');
    });

    it('シート生成時にセルの書式や配置を調整するためのバッチリクエストが送信されること', async () => {
        // Given: 正常なセットアップ
        const { doc } = setupMocks();
        const start = new Date(2026, 1, 23);
        const end = new Date(2026, 1, 25);

        // When: シフト表を作成
        await createShiftSheet(start, end);

        // Then: batchUpdate API にリクエスト配列（更新プロパティを含む）が渡されること
        expect(doc._makeBatchUpdateRequest).toHaveBeenCalledWith(
            expect.arrayContaining([
                expect.objectContaining({
                    updateSheetProperties: expect.any(Object),
                }),
            ])
        );
    });
});
