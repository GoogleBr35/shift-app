import Header from '@/components/layouts/Header';
import CenterCardLayout from '@/components/layouts/CenterCardLayout';

export default function NewShift() {
    return (
        <>
            <header>
                <Header />
            </header>
            <main>
                <CenterCardLayout>
                    <h1>新規シフト作成</h1>
                </CenterCardLayout>
            </main>
        </>
    );
}
