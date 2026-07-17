// components/dashboard/charts/BedOccupancyGauge.tsx
import React from 'react';
import { RadialBarChart, RadialBar, Legend, ResponsiveContainer } from 'recharts';
import { BaseChart } from './BaseChart';

interface BedOccupancyGaugeProps {
    occupancy: number;
    totalBeds: number;
    availableBeds: number;
    title?: string;
    icon?: string;
}

export const BedOccupancyGauge: React.FC<BedOccupancyGaugeProps> = ({
    occupancy,
    totalBeds,
    availableBeds,
    title = 'Bed Occupancy',
    icon = '🛏️'
}) => {
    const data = [
        {
            name: 'Occupied',
            value: occupancy,
            fill: '#3b82f6'
        },
        {
            name: 'Available',
            value: 100 - occupancy,
            fill: '#10b981'
        }
    ];

    const getStatusColor = () => {
        if (occupancy < 60) return 'text-green-600';
        if (occupancy < 85) return 'text-yellow-600';
        return 'text-red-600';
    };

    // Calculate occupied beds
    const occupiedBeds = Math.round((occupancy / 100) * totalBeds); // ← DEFINE THIS VARIABLE

    return (
        <BaseChart title={title} icon={icon} height={250}>
            <div className="flex h-full flex-col items-center justify-center">
                <ResponsiveContainer width="100%" height={150}>
                    <RadialBarChart
                        cx="50%"
                        cy="50%"
                        innerRadius="60%"
                        outerRadius="100%"
                        barSize={20}
                        data={data}
                        startAngle={180}
                        endAngle={-180}
                    >
                        <RadialBar
                            background
                            dataKey="value"
                            cornerRadius={10}
                        />
                        <Legend iconSize={10} layout="horizontal" verticalAlign="bottom" align="center" />
                    </RadialBarChart>
                </ResponsiveContainer>
                <div className="mt-4 text-center">
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                        {occupancy}%
                    </p>
                    <p className="text-sm text-gray-500">
                        <span className={getStatusColor()}>{occupiedBeds} occupied</span> • {availableBeds} available
                    </p>
                </div>
            </div>
        </BaseChart>
    );
};