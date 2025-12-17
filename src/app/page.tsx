import Header from '@/components/layouts/Header';
import CenterCardLayout from '@/components/layouts/CenterCardLayout';
import { LoginForm } from '@/features/auth/components';

export default function Home() {
    return (
        <>
            <header>
                <Header />
            </header>
            <main>
                <CenterCardLayout>
                    <LoginForm />
                </CenterCardLayout>
            </main>
        </>
    );
}
