import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
    title: string;
    value: number | string;
    icon: LucideIcon;
    bgColor: string;
    iconColor: string;
}

export default function StatsCard({
    title,
    value,
    icon: Icon,
    bgColor,
    iconColor,
}: StatsCardProps) {
    return (
        <div
            className={`rounded-lg p-4 shadow-sm ${bgColor} flex items-center justify-between`}
        >
            <div>
                <p className="text-sm text-gray-500">{title}</p>
                <p className="text-2xl font-bold">{value}</p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white">
                <Icon className={`h-6 w-6 ${iconColor}`} />
            </div>
        </div>
    );
}
