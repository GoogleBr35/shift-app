import Header from '@/components/layouts/Header';
import CenterCardLayout from '@/components/layouts/CenterCardLayout';
import { ShareUrlCard } from '@/features/newshift/components/ShareUrlCard';

export default function ShareUrl() {
    return (
        <>
            <header>
                <Header />
            </header>
            <main>
                <CenterCardLayout>
                    <ShareUrlCard />
                </CenterCardLayout>
            </main>
        </>
    );
}
