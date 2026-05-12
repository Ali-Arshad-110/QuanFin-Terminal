import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface OIVisualBarProps {
    value: number;
    max: number;
    color: 'red' | 'green';
    align: 'left' | 'right';
    className?: string;
}

export const OIVisualBar: React.FC<OIVisualBarProps> = ({ value, max, color, align, className }) => {
    const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;
    const bgClass = color === 'red' ? 'bg-red-500/20' : 'bg-green-500/20';

    return (
        <div className={twMerge("relative w-full h-full flex items-center px-2", className)}>
            <div
                className={clsx("absolute top-0 bottom-0", bgClass)}
                style={{
                    width: `${percentage}%`,
                    ...(align === 'right' ? { right: 0 } : { left: 0 })
                }}
            />
            <span className={clsx("relative z-10 w-full font-medium text-xs", align === 'right' ? 'text-right text-green-400' : 'text-left text-red-400')}>
                {value.toLocaleString()}
            </span>
        </div>
    );
};
