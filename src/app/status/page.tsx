import Header from '@/components/layouts/Header';
import CenterCardLayout from '@/components/layouts/CenterCardLayout';
import { getShiftSheetNames, getSubmissionStatus } from '@/lib/GoogleSheets/getSubmissionStatus';
import { getSheetToken } from '@/lib/GoogleSheets/getSheetToken';
import { StatusBoard } from '@/features/status/components/StatusBoard';
import { headers } from 'next/headers';

export default async function StatusPage({
    searchParams,
}: {
    searchParams: Promise<{ sheet?: string }>;
}) {
    const { sheet } = await searchParams;
    const sheetNames = await getShiftSheetNames();

    // シート未選択 → 一覧を表示
    if (!sheet) {
        return (
            <>
                <header>
                    <Header />
                </header>
                <main>
                    <CenterCardLayout>
                        <div className="w-full max-w-md flex flex-col gap-3">
                            <h2 className="text-xl font-bold text-center mb-2">
                                提出状況確認
                            </h2>
                            <p className="text-sm text-gray-500 text-center mb-4">
                                確認するシフト期間を選択してください
                            </p>
                            {sheetNames.length === 0 ? (
                                <p className="text-center text-gray-400">
                                    シフト表がありません
                                </p>
                            ) : (
                                sheetNames.map((name) => (
                                    <a
                                        key={name}
                                        href={`/status?sheet=${encodeURIComponent(name)}`}
                                        className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white
                                                   text-base font-medium text-gray-700 text-center
                                                   hover:bg-gray-50 transition-colors shadow-sm"
                                    >
                                        {name.replace('_', ' 〜 ')}
                                    </a>
                                ))
                            )}
                        </div>
                    </CenterCardLayout>
                </main>
            </>
        );
    }

    // シート選択済み → 提出状況を表示
    const [{ members }, { token }] = await Promise.all([
        getSubmissionStatus(sheet),
        getSheetToken(sheet),
    ]);

    // 共有URL生成
    const headersList = await headers();
    const host = headersList.get('host') ?? 'localhost:3000';
    const protocol = headersList.get('x-forwarded-proto') ?? 'http';
    const shareUrl = token ? `${protocol}://${host}/submit?token=${token}` : null;

    return (
        <>
            <header>
                <Header />
            </header>
            <main>
                <CenterCardLayout>
                    <StatusBoard
                        sheetName={sheet}
                        members={members}
                        shareUrl={shareUrl}
                    />
                </CenterCardLayout>
            </main>
        </>
    );
}
