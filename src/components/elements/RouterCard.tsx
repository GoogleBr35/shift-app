'use client';

import { Button } from '@/components/elements';
import { useRouter } from 'next/navigation';

export default function RouterCard({
    title,
    description,
    label,
    path,
    buttonDisabled = false,
    onClick,
}: {
    title: string;
    description: string;
    label: string;
    path?: string;
    buttonDisabled?: boolean;
    onClick?: () => void | Promise<void>;
}) {
    const router = useRouter();

    const handleButtonClick = async () => {
        if (onClick) {
            await onClick();
        }
        if (path) {
            router.push(path);
        }
    };

    return (
        <div className="w-full max-w-sm rounded-lg outline outline-gray-200 bg-white p-6 shadow-lg">
            <div className="flex flex-col gap-2">
                <h3 className="text-lg font-bold text-gray-900">{title}</h3>
                <p className="text-sm text-gray-500 whitespace-pre-wrap">
                    {description}
                </p>

                <div className="mt-6 flex justify-end">
                    <Button
                        className={`w-full sm:w-auto px-8! py-3! text-base! font-bold ${
                            buttonDisabled
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-gray-800! hover:bg-gray-900! active:bg-gray-700!'
                        }`}
                        onClick={handleButtonClick}
                        disabled={buttonDisabled}
                    >
                        {label}
                    </Button>
                </div>
            </div>
        </div>
    );
}
