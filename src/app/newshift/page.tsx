import Header from '@/components/layouts/Header';
import CenterCardLayout from '@/components/layouts/CenterCardLayout';
import DateRangeSelector from '@/features/newshift/components/DateRangeSelector';

export default function NewShift() {
    return (
        <>
            <header>
                <Header />
            </header>
            <main>
                <CenterCardLayout>
                    <DateRangeSelector />
                </CenterCardLayout>
            </main>
        </>
    );
}
