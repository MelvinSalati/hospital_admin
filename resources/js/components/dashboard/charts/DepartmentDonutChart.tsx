// components/dashboard/charts/DepartmentDonutChart.tsx
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { BaseChart } from './BaseChart';

interface DepartmentDonutChartProps {
    data: Array<{
        name: string;
        value: number;
        color: string;
    }>;
    title?: string;
    icon?: string;
    innerRadius?: number;
    outerRadius?: number;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export const DepartmentDonutChart: React.FC<DepartmentDonutChartProps> = ({
    data,
    title = 'Department Distribution',
    icon = '🍩',
    innerRadius = 60,
    outerRadius = 80
}) => {
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                    <p className="font-medium text-gray-900 dark:text-white">{payload[0].name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Value: {payload[0].value.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">
                        {((payload[0].value / data.reduce((a, b) => a + b.value, 0)) * 100).toFixed(1)}%
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <BaseChart title={title} icon={icon}>
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={innerRadius}
                        outerRadius={outerRadius}
                        paddingAngle={2}
                        dataKey="value"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip content={CustomTooltip} />
                    <Legend
                        layout="vertical"
                        align="right"
                        verticalAlign="middle"
                        wrapperStyle={{ fontSize: '12px', paddingLeft: '20px' }}
                    />
                </PieChart>
            </ResponsiveContainer>
        </BaseChart>
    );
};