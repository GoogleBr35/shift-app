import Header from '@/components/layouts/Header';
import CenterCardLayout from '@/components/layouts/CenterCardLayout';
import { RouterCard } from '@/components/elements';

export default function Menu() {
    return (
        <>
            <header>
                <Header />
            </header>
            <main>
                <CenterCardLayout>
                    <RouterCard
                        title="新規シフト作成"
                        description="シフト期間を設定し、アルバイトさんに共有してシフトを提出してもらいましょう！"
                        label="作成"
                        path="/newshift"
                    />
                </CenterCardLayout>
                <CenterCardLayout>
                    <RouterCard
                        title="提出締め切り"
                        description="現在提出可能なシフトの提出を締め切ります。"
                        label="締切"
                        path=""
                    />
                </CenterCardLayout>
                <CenterCardLayout>
                    <RouterCard
                        title="メンバーの追加・削除"
                        description="メンバーを追加したり削除したりできます。"
                        label="編集"
                        path="/member"
                    />
                </CenterCardLayout>
            </main>
        </>
    );
}
