import React from 'react';

interface MemberProps {
    name: string;
}

export const Member: React.FC<MemberProps> = ({ name }) => {
    return (
        <div className="py-2 px-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 text-gray-700">
            {name}
        </div>
    );
};
