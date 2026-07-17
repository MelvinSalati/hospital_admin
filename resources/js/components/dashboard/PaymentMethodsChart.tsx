// ============================================================
// PaymentMethodsChart — Vertical bar chart for payment methods
// ============================================================
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from 'recharts';
import type { PaymentMethodAnalytics } from '../../types';

interface PaymentMethodsChartProps {
    data: PaymentMethodAnalytics[];
    loading?: boolean;
}

const METHOD_COLORS: Record<string, string> = {
    Cash: '#3b82f6',
    'Mobile Money': '#10b981',
    Card: '#8b5cf6',
    Insurance: '#f59e0b',
};

const DEFAULT_COLOR = '#516ae6';

function formatAmount(value: number): string {
    if (value >= 1_000_000) return `K${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `K${(value / 1_000).toFixed(0)}k`;
    return `K${value}`;
}

interface CustomTooltipProps {
    active?: boolean;
    payload?: Array<{
        value: number;
        payload: PaymentMethodAnalytics & { percentage: number };
    }>;
    label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
    if (!active || !payload?.length) return null;
    const item = payload[0];
    return (
        <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-md dark:border-slate-700 dark:bg-slate-800">
            <p className="font-medium text-slate-800 dark:text-slate-100">
                {label}
            </p>
            <p className="text-slate-600 dark:text-slate-300">
                ZMW {item.value.toLocaleString()}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
                {item.payload.percentage}% of total
            </p>
        </div>
    );
}

export function PaymentMethodsChart({
    data,
    loading = false,
}: PaymentMethodsChartProps) {
    const total = data.reduce((sum, d) => sum + d.amount, 0);
    const enriched = data.map((d) => ({
        ...d,
        percentage: total > 0 ? Math.round((d.amount / total) * 100) : 0,
    }));

    if (loading) {
        return (
            <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
                <div className="mb-5 h-4 w-40 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                <div className="h-48 animate-pulse rounded bg-slate-100 dark:bg-slate-700/50" />
            </div>
        );
    }

    return (
        <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-4">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    Payment Methods
                </h3>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Revenue by collection channel
                </p>
            </div>

            <ResponsiveContainer width="100%" height={180}>
                <BarChart
                    data={enriched}
                    margin={{ top: 4, right: 4, left: -8, bottom: 0 }}
                    barCategoryGap="30%"
                >
                    <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#e2e8f0"
                        vertical={false}
                    />
                    <XAxis
                        dataKey="method"
                        tick={{ fontSize: 11, fill: '#94a3b8' }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <YAxis
                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={formatAmount}
                        width={44}
                    />
                    <Tooltip
                        content={<CustomTooltip />}
                        cursor={{ fill: 'rgba(148,163,184,0.08)' }}
                    />
                    <Bar dataKey="amount" radius={[4, 4, 0, 0]} maxBarSize={48}>
                        {enriched.map((entry) => (
                            <Cell
                                key={entry.method}
                                fill={
                                    METHOD_COLORS[entry.method] ?? DEFAULT_COLOR
                                }
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>

            {/* Summary legend */}
            <div className="mt-4 grid grid-cols-2 gap-2">
                {enriched.map((item) => (
                    <div key={item.method} className="flex items-center gap-2">
                        <span
                            className="h-2 w-2 flex-shrink-0 rounded-full"
                            style={{
                                backgroundColor:
                                    METHOD_COLORS[item.method] ?? DEFAULT_COLOR,
                            }}
                        />
                        <span className="truncate text-xs text-slate-500 dark:text-slate-400">
                            {item.method}
                        </span>
                        <span className="ml-auto text-xs font-medium text-slate-700 tabular-nums dark:text-slate-200">
                            {item.percentage}%
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
