import { ReactNode } from 'react';

interface ContainerProps {
    children: ReactNode;
    className?: string;
}

export default function Container({
    children,
    className = '',
}: ContainerProps) {
    return (
        <div className={`w-full rounded-lg p-4 ${className}`}>{children}</div>
    );
}
