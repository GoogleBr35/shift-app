'use client';

import { Button } from '@/components/elements';
import { useRouter } from 'next/navigation';

export default function RouterCard({
    title,
    description,
    label,
    path,
}: {
    title: string;
    description: string;
    label: string;
    path?: string;
}) {
    const router = useRouter();

    const handleClick = () => {
        if (path) {
            router.push(path);
        }
    };

    return (
        <div className="w-full max-w-sm rounded-lg outline outline-gray-200 bg-white p-6 shadow-lg">
            <div className="flex flex-col gap-2">
                <h3 className="text-lg font-bold text-gray-900">{title}</h3>
                <p className="text-sm text-gray-500">{description}</p>

                <div className="mt-4 flex justify-end">
                    <Button
                        className="bg-gray-800! px-6! py-1! text-white hover:bg-gray-900!"
                        onClick={handleClick}
                    >
                        {label}
                    </Button>
                </div>
            </div>
        </div>
    );
}
