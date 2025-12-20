import React from 'react';

type AccordionProps = {
    title: string;
    children: React.ReactNode;
    count?: number;
    defaultOpen?: boolean;
};

export default function Accordion({
    title,
    children,
    count,
    defaultOpen = false,
}: AccordionProps) {
    return (
        <details
            className="group bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
            open={defaultOpen}
        >
            <summary className="flex items-center justify-between px-4 py-3 cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors list-none select-none">
                <span className="font-medium text-gray-800">{title}</span>
                {count !== undefined && (
                    <span className="text-sm text-gray-500 bg-gray-200 rounded-full px-2 py-0.5 ml-2">
                        {count}
                    </span>
                )}
                <div className="ml-auto transform group-open:rotate-180 transition-transform duration-300">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-5 h-5 text-gray-500"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                        />
                    </svg>
                </div>
            </summary>
            <div className="bg-white border-t border-gray-100">{children}</div>
        </details>
    );
}
