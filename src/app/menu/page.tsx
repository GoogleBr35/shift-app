import Header from '@/components/layouts/Header';
import CenterCardLayout from '@/components/layouts/CenterCardLayout';
import MenuCard from '@/components/elements/MenuCard';

export default function Menu() {
    return (
        <>
            <header>
                <Header />
            </header>
            <main>
                <CenterCardLayout>
                    <MenuCard
                        title="新規シフト作成"
                        description="シフト期間を設定し、アルバイトさんに共有してシフトを提出してもらいましょう！"
                        label="作成"
                    />
                </CenterCardLayout>
                <CenterCardLayout>
                    <MenuCard
                        title="提出締め切り"
                        description="現在提出可能なシフトの提出を締め切ります。"
                        label="締切"
                    />
                </CenterCardLayout>
            </main>
        </>
    );
}
