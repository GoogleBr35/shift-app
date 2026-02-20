import Header from '@/components/layouts/Header';
import CenterCardLayout from '@/components/layouts/CenterCardLayout';
import { ShareUrlCard } from '@/features/newshift/components/ShareUrlCard';

export default function shareUrl() {
    return (
        <>
            <header>
                <Header />
            </header>
            <main>
                <CenterCardLayout>
                    <ShareUrlCard
                        spreadsheetId={process.env.MASTER_SHEET_ID ?? ''}
                    />
                </CenterCardLayout>
            </main>
        </>
    );
}
