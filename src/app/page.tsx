import Header from '@/components/layouts/Header';
import CenterCardLayout from '@/components/layouts/CenterCardLayout';
import LoginForm from '@/features/auth/components/LoginForm';

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
