import React from 'react';
import { getMember } from '@/lib/GoogleSheets/getMember';
import { Member } from './member';
import { Accordion } from '@/components/elements';

export const MemberList = async () => {
    const memberData = await getMember();

    const categories = [
        // keyはGoogleSheetsの列名と一致する必要がある
        { key: 'LunchStaff', label: 'ランチ社員' },
        { key: 'LunchPartTime', label: 'ランチアルバイト' },
        { key: 'DinnerStaff', label: 'ディナー社員' },
        { key: 'DinnerPartTime', label: 'ディナーアルバイト' },
    ] as const;

    return (
        <div className="w-full max-w-md mx-auto space-y-4">
            {categories.map((category) => {
                const members = memberData[category.key];

                return (
                    <Accordion
                        key={category.key}
                        title={category.label}
                        count={members.length}
                    >
                        {members.length > 0 ? (
                            <div className="divide-y divide-gray-100">
                                {members.map((name, index) => (
                                    <Member
                                        key={`${category.key}-${index}`}
                                        name={name}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="p-4 text-sm text-gray-400 text-center italic">
                                メンバーがいません
                            </div>
                        )}
                    </Accordion>
                );
            })}
        </div>
    );
};
