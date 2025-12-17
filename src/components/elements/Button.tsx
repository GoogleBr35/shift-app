import { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    children: ReactNode;
    variant?: ButtonVariant;
    isLoading?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-800',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
};

export default function Button({
    children,
    variant = 'primary',
    isLoading = false,
    className = '',
    disabled,
    ...props
}: ButtonProps) {
    return (
        <button
            className={`
                px-4 py-2 rounded-md font-medium
                transition-colors duration-200
                disabled:opacity-50 disabled:cursor-not-allowed
                ${variantStyles[variant]}
                ${className}
            `}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    読み込み中...
                </span>
            ) : (
                children
            )}
        </button>
    );
}
