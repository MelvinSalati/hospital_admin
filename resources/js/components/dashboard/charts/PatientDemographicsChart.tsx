// components/dashboard/charts/PatientDemographicsChart.tsx
import React from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import { BaseChart } from './BaseChart';

interface PatientDemographicsChartProps {
    ageData: Array<{ range: string; count: number }>;
    genderData: { male: number; female: number; other: number };
    insuranceData: { insured: number; uninsured: number };
}

export const PatientDemographicsChart: React.FC<PatientDemographicsChartProps> = ({
    ageData,
    genderData,
    insuranceData
}) => {
    const genderPieData = [
        { name: 'Male', value: genderData.male, color: '#3b82f6' },
        { name: 'Female', value: genderData.female, color: '#ec4899' },
        { name: 'Other', value: genderData.other, color: '#8b5cf6' }
    ];

    const insurancePieData = [
        { name: 'Insured', value: insuranceData.insured, color: '#10b981' },
        { name: 'Uninsured', value: insuranceData.uninsured, color: '#ef4444' }
    ];

    return (
        <div className="grid gap-4 md:grid-cols-4">
            <BaseChart title="Age Distribution" icon="📊" height={250}>
                <ResponsiveContainer width="400" height="100%">
                    <BarChart data={ageData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="range" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </BaseChart>

            {/* <BaseChart title="Gender Distribution" icon="👥" height={250}>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={genderPieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={70}
                            paddingAngle={2}
                            dataKey="value"
                        >
                            {genderPieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </BaseChart> */}
{/* 
            <BaseChart title="Insurance Status" icon="🏥" height={250} className="md:col-span-2">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={insurancePieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={5}
                            dataKey="value"
                            label
                        >
                            {insurancePieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </BaseChart> */}
        </div>
    );
};