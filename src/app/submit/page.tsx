import Header from '@/components/layouts/Header';
import CenterCardLayout from '@/components/layouts/CenterCardLayout';
import { getMember } from '@/lib/GoogleSheets/getMember';
import { verifySubmitToken } from '@/lib/jose/jwt';
import { NameSelector } from '@/features/submit/components/NameSelector';
import { deleteTokenFromStore } from '@/lib/GoogleSheets/tokenStore';

export default async function SubmitPage({
    searchParams,
}: {
    searchParams: Promise<{ token?: string }>;
}) {
    const { token } = await searchParams;
    const payload = token ? await verifySubmitToken(token) : null;

    if (!payload && token) {
        // 期限切れトークンのクリーンアップ
        await deleteTokenFromStore(token);
    }

    if (!payload) {
        return (
            <>
                <header>
                    <Header />
                </header>
                <main>
                    <CenterCardLayout>
                        <div className="w-full max-w-md flex flex-col items-center gap-4 py-8 text-center">
                            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                                <svg
                                    className="w-8 h-8 text-red-600"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                                    />
                                </svg>
                            </div>
                            <h2 className="text-xl font-bold text-gray-800">
                                リンクが無効または期限切れです
                            </h2>
                            <p className="text-gray-500 text-sm">
                                管理者に新しいリンクを発行してもらってください。
                            </p>
                        </div>
                    </CenterCardLayout>
                </main>
            </>
        );
    }

    const memberList = await getMember();

    return (
        <>
            <header>
                <Header />
            </header>
            <main>
                <CenterCardLayout>
                    <NameSelector
                        sheetName={payload.sheetName}
                        memberList={memberList}
                        token={token!}
                    />
                </CenterCardLayout>
            </main>
        </>
    );
}
