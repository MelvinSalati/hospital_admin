import React from 'react';
import { Users, Venus, Mars, Baby } from 'lucide-react';

interface AgeGroup {
    group: string;
    count: number;
    percentage: number;
}

interface GenderData {
    gender: string;
    count: number;
    percentage: number;
}

interface DemographicsCardProps {
    ageGroups: AgeGroup[];
    genderData: GenderData[];
    pregnantCount: number;
    trends: {
        age: number;
        gender: number;
    };
}

export function DemographicsCard({
    ageGroups,
    genderData,
    pregnantCount,
    trends,
}: DemographicsCardProps) {
    return (
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Age Distribution */}
                <div>
                    <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                        <Users className="h-4 w-4" />
                        Age Distribution
                        {trends.age !== 0 && (
                            <span
                                className={`text-xs ${trends.age >= 0 ? 'text-red-600' : 'text-green-600'}`}
                            >
                                {trends.age >= 0 ? '↑' : '↓'}{' '}
                                {Math.abs(trends.age)}%
                            </span>
                        )}
                    </h4>
                    <div className="space-y-2">
                        {ageGroups.map((group, idx) => (
                            <div key={idx}>
                                <div className="mb-1 flex justify-between text-xs">
                                    <span className="text-slate-600 dark:text-slate-400">
                                        {group.group}
                                    </span>
                                    <span className="font-medium text-slate-900 dark:text-slate-100">
                                        {group.count} ({group.percentage}%)
                                    </span>
                                </div>
                                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                                    <div
                                        className="h-full rounded-full bg-blue-500"
                                        style={{
                                            width: `${group.percentage}%`,
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Gender Distribution */}
                <div>
                    <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                        <Users className="h-4 w-4" />
                        Gender Distribution
                        {trends.gender !== 0 && (
                            <span
                                className={`text-xs ${trends.gender >= 0 ? 'text-red-600' : 'text-green-600'}`}
                            >
                                {trends.gender >= 0 ? '↑' : '↓'}{' '}
                                {Math.abs(trends.gender)}%
                            </span>
                        )}
                    </h4>
                    <div className="space-y-3">
                        {genderData.map((gender, idx) => (
                            <div key={idx}>
                                <div className="mb-1 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        {gender.gender === 'Male' ? (
                                            <Mars className="h-3 w-3 text-blue-500" />
                                        ) : (
                                            <Venus className="h-3 w-3 text-pink-500" />
                                        )}
                                        <span className="text-sm text-slate-600 dark:text-slate-400">
                                            {gender.gender}
                                        </span>
                                    </div>
                                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                        {gender.count} ({gender.percentage}%)
                                    </span>
                                </div>
                                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                                    <div
                                        className={`h-full rounded-full ${gender.gender === 'Male' ? 'bg-blue-500' : 'bg-pink-500'}`}
                                        style={{
                                            width: `${gender.percentage}%`,
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                        <div className="mt-3 rounded-md bg-purple-50 p-2 dark:bg-purple-950/30">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Baby className="h-3 w-3 text-purple-600" />
                                    <span className="text-sm text-purple-700 dark:text-purple-400">
                                        Pregnant Women
                                    </span>
                                </div>
                                <span className="text-sm font-semibold text-purple-700 dark:text-purple-400">
                                    {pregnantCount}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
