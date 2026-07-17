import React, { useEffect, useRef } from 'react';
import {
    Activity,
    Droplet,
    Thermometer,
    Wind,
    Heart,
    AlertTriangle,
    Users,
    Baby,
    TrendingUp,
    TrendingDown,
} from 'lucide-react';
// import Chart from 'chart.js/auto';

// ============================================================================
// Types
// ============================================================================

interface AlertMetric {
    label: string;
    count: number;
    totalPatients: number;
    severity: 'normal' | 'warning' | 'high' | 'critical';
}

interface HorizontalBarWidgetProps {
    title: string;
    icon: React.ReactNode;
    metrics: AlertMetric[];
    trend?: number;
}

interface DoughnutSegment {
    label: string;
    value: number;
    color: string;
}

interface DoughnutWidgetProps {
    title: string;
    centerLabel: string;
    total: number;
    segments: DoughnutSegment[];
    trend?: number;
}

// ============================================================================
// Horizontal Bar Chart Component (Compact)
// ============================================================================

const HorizontalBarWidget: React.FC<HorizontalBarWidgetProps> = ({
    title,
    icon,
    metrics,
    trend,
}) => {
    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical':
                return 'bg-red-500';
            case 'high':
                return 'bg-orange-500';
            case 'warning':
                return 'bg-amber-500';
            default:
                return 'bg-emerald-500';
        }
    };

    const getSeverityBg = (severity: string) => {
        switch (severity) {
            case 'critical':
                return 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400';
            case 'high':
                return 'bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400';
            case 'warning':
                return 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400';
            default:
                return 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400';
        }
    };

    const maxCount = Math.max(...metrics.map((m) => m.count), 1);

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all dark:border-slate-700 dark:bg-slate-800/90">
            {/* Header */}
            <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="text-slate-500 dark:text-slate-400">
                        {icon}
                    </div>
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                        {title}
                    </h3>
                </div>
                {trend !== undefined && (
                    <div
                        className={`flex items-center gap-1 text-xs font-medium ${
                            trend >= 0 ? 'text-red-500' : 'text-emerald-500'
                        }`}
                    >
                        {trend >= 0 ? (
                            <TrendingUp className="h-3 w-3" />
                        ) : (
                            <TrendingDown className="h-3 w-3" />
                        )}
                        <span>{Math.abs(trend)}%</span>
                    </div>
                )}
            </div>

            {/* Metrics List with Horizontal Bars */}
            <div className="space-y-2.5">
                {metrics.map((metric, idx) => {
                    const percentage =
                        (metric.count / metric.totalPatients) * 100;
                    const barWidth = (metric.count / maxCount) * 100;
                    return (
                        <div key={idx} className="group">
                            <div className="mb-0.5 flex items-center justify-between text-xs">
                                <span className="truncate text-slate-600 dark:text-slate-400">
                                    {metric.label}
                                </span>
                                <div className="flex items-center gap-1.5">
                                    <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                                        {metric.count}
                                    </span>
                                    <span
                                        className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${getSeverityBg(metric.severity)}`}
                                    >
                                        {percentage.toFixed(1)}%
                                    </span>
                                </div>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                                <div
                                    className={`h-full rounded-full transition-all duration-300 ${getSeverityColor(metric.severity)}`}
                                    style={{ width: `${barWidth}%` }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// ============================================================================
// Doughnut Chart Component (Compact)
// ============================================================================

const DoughnutWidget: React.FC<DoughnutWidgetProps> = ({
    title,
    centerLabel,
    total,
    segments,
    trend,
}) => {
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstance = useRef<Chart | null>(null);

    useEffect(() => {
        if (!chartRef.current) return;

        if (chartInstance.current) {
            chartInstance.current.destroy();
        }

        const ctx = chartRef.current.getContext('2d');
        if (!ctx) return;

        chartInstance.current = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: segments.map((s) => s.label),
                datasets: [
                    {
                        data: segments.map((s) => s.value),
                        backgroundColor: segments.map((s) => s.color),
                        borderWidth: 0,
                        borderRadius: 4,
                        spacing: 2,
                        cutout: '65%',
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            boxWidth: 10,
                            boxHeight: 10,
                            font: { size: 10, family: 'Inter, sans-serif' },
                            padding: 6,
                            usePointStyle: true,
                            pointStyle: 'circle',
                            color: 'currentColor',
                        },
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const label = context.label || '';
                                const value = context.raw as number;
                                const total = segments.reduce(
                                    (sum, s) => sum + s.value,
                                    0,
                                );
                                const percentage = (
                                    (value / total) *
                                    100
                                ).toFixed(1);
                                return `${label}: ${value} (${percentage}%)`;
                            },
                        },
                    },
                },
                elements: {
                    arc: {
                        borderWidth: 0,
                    },
                },
                layout: {
                    padding: { top: 8, bottom: 4, left: 4, right: 4 },
                },
            },
        });

        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }
        };
    }, [segments]);

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-all dark:border-slate-700 dark:bg-slate-800/90">
            {/* Header */}
            <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
                        {title}
                    </h3>
                </div>
                {trend !== undefined && (
                    <div
                        className={`flex items-center gap-0.5 text-[10px] font-medium ${
                            trend >= 0 ? 'text-red-500' : 'text-emerald-500'
                        }`}
                    >
                        {trend >= 0 ? (
                            <TrendingUp className="h-2.5 w-2.5" />
                        ) : (
                            <TrendingDown className="h-2.5 w-2.5" />
                        )}
                        <span>{Math.abs(trend)}%</span>
                    </div>
                )}
            </div>

            {/* Chart Container */}
            <div className="relative mx-auto" style={{ maxWidth: '160px' }}>
                <canvas ref={chartRef} className="w-full" />
                {/* Center Label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        {centerLabel}
                    </span>
                    <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                        {total}
                    </span>
                </div>
            </div>
        </div>
    );
};

// ============================================================================
// Main Dashboard Component
// ============================================================================

export default function NurseClinicalDashboard() {
    // Mock Data - Clinical Alerts (Row 1)
    const totalPatients = 284;

    const bpMetrics: AlertMetric[] = [
        {
            label: 'Hypertension (≥140/90)',
            count: 67,
            totalPatients,
            severity: 'high',
        },
        {
            label: 'Severe Hypertension (≥180/120)',
            count: 12,
            totalPatients,
            severity: 'critical',
        },
        {
            label: 'Repeat BP Assessment Needed',
            count: 43,
            totalPatients,
            severity: 'warning',
        },
        {
            label: 'New Elevated BP Cases Today',
            count: 18,
            totalPatients,
            severity: 'high',
        },
    ];

    const tempMetrics: AlertMetric[] = [
        {
            label: 'Fever (>37.5°C)',
            count: 31,
            totalPatients,
            severity: 'warning',
        },
        {
            label: 'High Fever (>39°C)',
            count: 8,
            totalPatients,
            severity: 'critical',
        },
        {
            label: 'Children with Fever',
            count: 14,
            totalPatients,
            severity: 'high',
        },
        {
            label: 'Adults with Fever',
            count: 25,
            totalPatients,
            severity: 'warning',
        },
    ];

    const oxygenMetrics: AlertMetric[] = [
        { label: 'SpO₂ < 92%', count: 23, totalPatients, severity: 'critical' },
        {
            label: 'On Oxygen Therapy',
            count: 41,
            totalPatients,
            severity: 'high',
        },
        {
            label: 'Respiratory Distress',
            count: 9,
            totalPatients,
            severity: 'critical',
        },
    ];

    const pulseMetrics: AlertMetric[] = [
        {
            label: 'Tachycardia (>100 bpm)',
            count: 38,
            totalPatients,
            severity: 'warning',
        },
        {
            label: 'Bradycardia (<60 bpm)',
            count: 16,
            totalPatients,
            severity: 'warning',
        },
        {
            label: 'Requiring Clinical Review',
            count: 22,
            totalPatients,
            severity: 'critical',
        },
    ];

    // Doughnut Data - Vital Signs Distribution
    const bpSegments: DoughnutSegment[] = [
        { label: 'Normal', value: 156, color: '#10b981' },
        { label: 'Elevated', value: 54, color: '#f59e0b' },
        { label: 'High', value: 42, color: '#f97316' },
        { label: 'Critical', value: 12, color: '#ef4444' },
    ];

    const tempSegments: DoughnutSegment[] = [
        { label: 'Normal', value: 198, color: '#10b981' },
        { label: 'Fever', value: 31, color: '#f59e0b' },
        { label: 'High Fever', value: 8, color: '#ef4444' },
        { label: 'Hypothermia', value: 5, color: '#3b82f6' },
    ];

    const oxygenSegments: DoughnutSegment[] = [
        { label: 'Normal (≥92%)', value: 203, color: '#10b981' },
        { label: 'Mild (88-91%)', value: 38, color: '#f59e0b' },
        { label: 'Moderate (85-87%)', value: 24, color: '#f97316' },
        { label: 'Severe (<85%)', value: 19, color: '#ef4444' },
    ];

    const pulseSegments: DoughnutSegment[] = [
        { label: 'Normal', value: 189, color: '#10b981' },
        { label: 'Tachycardia', value: 38, color: '#f59e0b' },
        { label: 'Bradycardia', value: 16, color: '#f97316' },
        { label: 'Critical', value: 8, color: '#ef4444' },
    ];

    return (
        <div className="min-h-screen bg-slate-50 p-4 dark:bg-slate-900">
            {/* Page Header */}
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="flex items-center gap-2 text-xl font-bold text-slate-800 dark:text-slate-100">
                        <Heart className="h-5 w-5 text-red-500" />
                        Clinical Surveillance Dashboard
                    </h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        Real-time patient safety & early risk identification
                    </p>
                </div>
                <div className="flex items-center gap-3 rounded-lg bg-white px-3 py-1.5 shadow-sm dark:bg-slate-800">
                    <Users className="h-4 w-4 text-slate-500" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Total Patients:{' '}
                        <span className="font-bold">{totalPatients}</span>
                    </span>
                </div>
            </div>

            {/* ROW 1: Clinical Alerts & Surveillance - 2x2 Grid */}
            <div className="mb-6">
                <div className="mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <h2 className="text-sm font-semibold tracking-wide text-slate-600 uppercase dark:text-slate-400">
                        Clinical Alerts & Surveillance
                    </h2>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <HorizontalBarWidget
                        title="Blood Pressure"
                        icon={<Droplet className="h-4 w-4" />}
                        metrics={bpMetrics}
                        trend={5.2}
                    />
                    <HorizontalBarWidget
                        title="Temperature"
                        icon={<Thermometer className="h-4 w-4" />}
                        metrics={tempMetrics}
                        trend={8.7}
                    />
                    <HorizontalBarWidget
                        title="Oxygen & Respiratory"
                        icon={<Wind className="h-4 w-4" />}
                        metrics={oxygenMetrics}
                        trend={12.3}
                    />
                    <HorizontalBarWidget
                        title="Pulse Monitoring"
                        icon={<Activity className="h-4 w-4" />}
                        metrics={pulseMetrics}
                        trend={-2.1}
                    />
                </div>
            </div>

            {/* ROW 2: Vital Signs Monitoring - Doughnut Charts */}
            <div>
                <div className="mb-3 flex items-center gap-2">
                    <Activity className="h-4 w-4 text-emerald-500" />
                    <h2 className="text-sm font-semibold tracking-wide text-slate-600 uppercase dark:text-slate-400">
                        Vital Signs Distribution
                    </h2>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <DoughnutWidget
                        title="Blood Pressure"
                        centerLabel="BP"
                        total={264}
                        segments={bpSegments}
                        trend={3.4}
                    />
                    <DoughnutWidget
                        title="Temperature"
                        centerLabel="Temp"
                        total={242}
                        segments={tempSegments}
                        trend={-1.2}
                    />
                    <DoughnutWidget
                        title="Oxygen Saturation"
                        centerLabel="SpO₂"
                        total={284}
                        segments={oxygenSegments}
                        trend={5.8}
                    />
                    <DoughnutWidget
                        title="Pulse Rate"
                        centerLabel="Pulse"
                        total={251}
                        segments={pulseSegments}
                        trend={2.3}
                    />
                </div>
            </div>

            {/* Quick Stats Footer - Compact risk summary */}
            <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
                <div className="flex items-center gap-2 rounded-lg border-l-4 border-red-500 bg-white p-2 shadow-sm dark:bg-slate-800">
                    <div className="rounded-full bg-red-100 p-1.5 dark:bg-red-900/30">
                        <Heart className="h-3 w-3 text-red-600" />
                    </div>
                    <div>
                        <div className="text-[10px] text-slate-500 uppercase">
                            Critical
                        </div>
                        <div className="text-sm font-bold text-red-600">
                            39 pts
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 rounded-lg border-l-4 border-orange-500 bg-white p-2 shadow-sm dark:bg-slate-800">
                    <div className="rounded-full bg-orange-100 p-1.5 dark:bg-orange-900/30">
                        <AlertTriangle className="h-3 w-3 text-orange-600" />
                    </div>
                    <div>
                        <div className="text-[10px] text-slate-500 uppercase">
                            High Risk
                        </div>
                        <div className="text-sm font-bold text-orange-600">
                            87 pts
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 rounded-lg border-l-4 border-amber-500 bg-white p-2 shadow-sm dark:bg-slate-800">
                    <div className="rounded-full bg-amber-100 p-1.5 dark:bg-amber-900/30">
                        <Activity className="h-3 w-3 text-amber-600" />
                    </div>
                    <div>
                        <div className="text-[10px] text-slate-500 uppercase">
                            Warning
                        </div>
                        <div className="text-sm font-bold text-amber-600">
                            112 pts
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 rounded-lg border-l-4 border-emerald-500 bg-white p-2 shadow-sm dark:bg-slate-800">
                    <div className="rounded-full bg-emerald-100 p-1.5 dark:bg-emerald-900/30">
                        <Baby className="h-3 w-3 text-emerald-600" />
                    </div>
                    <div>
                        <div className="text-[10px] text-slate-500 uppercase">
                            Stable
                        </div>
                        <div className="text-sm font-bold text-emerald-600">
                            46 pts
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
