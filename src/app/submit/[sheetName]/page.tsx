import Header from '@/components/layouts/Header';
import CenterCardLayout from '@/components/layouts/CenterCardLayout';
import { getMember } from '@/lib/GoogleSheets/getMember';
import { NameSelector } from '@/features/submit/components/NameSelector';

export default async function SubmitPage({
    params,
}: {
    params: Promise<{ sheetName: string }>;
}) {
    const { sheetName } = await params;
    const memberList = await getMember();

    return (
        <>
            <header>
                <Header />
            </header>
            <main>
                <CenterCardLayout>
                    <NameSelector
                        sheetName={sheetName}
                        memberList={memberList}
                    />
                </CenterCardLayout>
            </main>
        </>
    );
}
