import React from 'react';

interface CardProps {
    Icon?: React.ReactNode;
    icon?: React.ReactNode;
    count: number | string;
    title: string;
}

const Card = ({ Icon, icon, count, title }: CardProps) => {
    const displayIcon = Icon || icon;
    return (
        <div className="bg-white rounded-lg p-6 flex items-center justify-center border-2 border-teal-500/20">
            <div className="bg-teal-500/10 border-2 border-teal-500/20 px-4 py-2 rounded-lg">
                {displayIcon}
            </div>
            <div className="flex flex-col ml-4">
                <p className="text-md font-medium text-gray-500">{count}</p>
                <p className="text-sm text-gray-900">{title}</p>
            </div>
        </div>
    )
}

export default Card