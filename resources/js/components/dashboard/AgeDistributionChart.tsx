// ============================================================
// AgeDistributionChart — Horizontal bar chart, 4 age bands
// ============================================================
import type { AgeDistribution } from '../../types';

interface AgeDistributionChartProps {
    data: AgeDistribution[];
    loading?: boolean;
}

const AGE_COLORS: Record<string, { bar: string; text: string }> = {
    Children: { bar: 'bg-sky-400', text: 'text-sky-700 dark:text-sky-300' },
    'Young Adults': { bar: 'bg-violet-400', text: 'text-violet-700 dark:text-violet-300' },
    Adults: { bar: 'bg-teal-500', text: 'text-teal-700 dark:text-teal-300' },
    Elderly: { bar: 'bg-amber-400', text: 'text-amber-700 dark:text-amber-300' },
};

const DEFAULT_COLOR = { bar: 'bg-slate-400', text: 'text-slate-600' };

export function AgeDistributionChart({ data, loading = false }: AgeDistributionChartProps) {
    const max = Math.max(...data.map((d) => d.count), 1);
    const total = data.reduce((s, d) => s + d.count, 0);

    if (loading) {
        return (
            <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
                <div className="h-4 w-36 bg-slate-200 dark:bg-slate-700 rounded mb-5 animate-pulse" />
                <div className="space-y-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-8 bg-slate-100 dark:bg-slate-700/50 rounded animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-4">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    Patient Age Distribution
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {total.toLocaleString()} patients across age groups
                </p>
            </div>

            <div className="space-y-3">
                {data.map((item) => {
                    const pct = Math.round((item.count / max) * 100);
                    const totalPct = total > 0 ? Math.round((item.count / total) * 100) : 0;
                    const colors = AGE_COLORS[item.label] ?? DEFAULT_COLOR;

                    return (
                        <div key={item.label}>
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-slate-700 dark:text-slate-200 w-24">
                                        {item.label}
                                    </span>
                                    {item.range && (
                                        <span className="text-[10px] text-slate-400 hidden sm:inline">
                                            {item.range}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`text-xs font-semibold tabular-nums ${colors.text}`}>
                                        {item.count.toLocaleString()}
                                    </span>
                                    <span className="text-[10px] text-slate-400 w-7 text-right tabular-nums">
                                        {totalPct}%
                                    </span>
                                </div>
                            </div>
                            <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-700">
                                <div
                                    className={`h-2 rounded-full ${colors.bar} transition-all duration-500`}
                                    style={{ width: `${pct}%` }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Total footer */}
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400">Total patients</span>
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 tabular-nums">
                    {total.toLocaleString()}
                </span>
            </div>
        </div>
    );
}
