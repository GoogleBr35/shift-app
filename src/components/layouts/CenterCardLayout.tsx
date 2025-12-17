import { ReactNode } from 'react';

interface CenterCardLayoutProps {
    children: ReactNode;
}

/**
 * コンテンツを画面中央に配置するレイアウト
 * ログイン画面などのカード形式UIに使用
 */
export default function CenterCardLayout({ children }: CenterCardLayoutProps) {
    return (
        <div className="flex items-center justify-center p-4">{children}</div>
    );
}
