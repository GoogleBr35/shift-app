import Header from '@/components/layouts/Header';
import { MemberList } from '@/features/member/components/memberList';

export default function Member() {
    return (
        <>
            <header>
                <Header />
            </header>
            <main>
                <div className="min-h-screen bg-gray-50 p-8">
                    <div className="max-w-2xl mx-auto">
                        <h1 className="text-center text-2xl font-bold text-gray-900 mb-8">
                            スタッフ一覧
                        </h1>
                        <MemberList />
                    </div>
                </div>
            </main>
        </>
    );
}
