import {
    AlertCircle,
    CalendarDays,
    FileDown,
    Loader2,
    X,
    Clock3,
} from 'lucide-react';
import React, { useEffect, useRef } from 'react';

export type RangeMode = 'day' | 'week' | 'month' | 'custom';

export interface RangePreset {
    key: string;
    label: string;
    active: boolean;
}

export interface ReportRangeModalProps {
    open: boolean;
    title: string;
    description: string;
    category: string;
    frequency: string;
    icon: React.ReactNode;
    iconClassName?: string;
    from: string;
    to: string;
    mode: RangeMode;
    rangeLabel: string;
    presets: RangePreset[];
    isRunning: boolean;
    error: string | null;
    onPreset: (key: string) => void;
    onFromChange: (value: string) => void;
    onToChange: (value: string) => void;
    onClose: () => void;
    onRun: () => void;
}

const modeLabel: Record<RangeMode, string> = {
    day: 'Single day',
    week: 'Full week',
    month: 'Full month',
    custom: 'Custom range',
};

const countDays = (from: string, to: string) => {
    if (!from || !to) return 0;

    const [fromYear, fromMonth, fromDay] = from.split('-').map(Number);
    const [toYear, toMonth, toDay] = to.split('-').map(Number);

    const start = Date.UTC(fromYear, fromMonth - 1, fromDay);
    const end = Date.UTC(toYear, toMonth - 1, toDay);

    return Math.round((end - start) / 86_400_000) + 1;
};

export default function ReportRangeModal({
    open,
    title,
    description,
    category,
    frequency,
    icon,
    iconClassName = 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100',
    from,
    to,
    mode,
    rangeLabel,
    presets,
    isRunning,
    error,
    onPreset,
    onFromChange,
    onToChange,
    onClose,
    onRun,
}: ReportRangeModalProps) {
    const dialogRef = useRef<HTMLDivElement>(null);

    const days = countDays(from, to);
    const invalidRange = !from || !to || days < 1;
    const canRun = !isRunning && !invalidRange;

    useEffect(() => {
        if (!open) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !isRunning) {
                onClose();
            }
        };

        const previousOverflow = document.body.style.overflow;

        document.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';
        dialogRef.current?.focus();

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = previousOverflow;
        };
    }, [open, isRunning, onClose]);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/55 p-3 backdrop-blur-sm sm:p-6"
            onClick={() => !isRunning && onClose()}
        >
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="report-modal-title"
                aria-describedby="report-modal-desc"
                tabIndex={-1}
                onClick={(event) => event.stopPropagation()}
                className="relative my-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl outline-none"
            >
                {/* Generation progress */}
                {isRunning && (
                    <div className="absolute inset-x-0 top-0 z-10 h-1 overflow-hidden bg-emerald-100">
                        <div className="h-full w-1/3 animate-pulse rounded-full bg-emerald-600" />
                    </div>
                )}

                {/* Header */}
                <div className="border-b border-slate-200 px-5 py-5 sm:px-7 sm:py-6">
                    <div className="flex items-start gap-4">
                        <div
                            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ${iconClassName}`}
                        >
                            <span className="[&>svg]:h-7 [&>svg]:w-7">
                                {icon}
                            </span>
                        </div>

                        <div className="min-w-0 flex-1">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                                <span className="rounded-md bg-slate-100 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-slate-600 uppercase">
                                    {category}
                                </span>

                                <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                                    <Clock3 className="h-3.5 w-3.5" />
                                    {frequency}
                                </span>
                            </div>

                            <h2
                                id="report-modal-title"
                                className="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl"
                            >
                                {title}
                            </h2>

                            <p
                                id="report-modal-desc"
                                className="mt-1.5 max-w-xl text-sm leading-relaxed text-slate-500"
                            >
                                {description}
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isRunning}
                            aria-label="Close report dialog"
                            className="shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="space-y-6 px-5 py-6 sm:px-7">
                    {/* Reporting period heading */}
                    <div>
                        <div className="mb-4">
                            <h3 className="text-sm font-semibold text-slate-900">
                                Reporting period
                            </h3>
                            <p className="mt-1 text-xs text-slate-500">
                                Select the period for which you want to generate
                                this report.
                            </p>
                        </div>

                        {/* Quick date presets */}
                        <fieldset disabled={isRunning}>
                            <legend className="mb-2.5 text-xs font-medium text-slate-600">
                                Quick selection
                            </legend>

                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                {presets.map((preset) => (
                                    <button
                                        key={preset.key}
                                        type="button"
                                        aria-pressed={preset.active}
                                        onClick={() => onPreset(preset.key)}
                                        className={`rounded-lg border px-3 py-3 text-sm font-medium transition focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
                                            preset.active
                                                ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600'
                                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                                        }`}
                                    >
                                        {preset.label}
                                    </button>
                                ))}
                            </div>
                        </fieldset>
                    </div>

                    {/* Custom date selection */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
                        <div className="mb-4 flex items-center gap-2">
                            <CalendarDays className="h-4 w-4 text-slate-500" />
                            <h3 className="text-sm font-semibold text-slate-800">
                                Custom date range
                            </h3>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label
                                    htmlFor="report-from"
                                    className="mb-2 block text-xs font-medium text-slate-600"
                                >
                                    Start date
                                </label>

                                <input
                                    id="report-from"
                                    type="date"
                                    value={from}
                                    max={to || undefined}
                                    disabled={isRunning}
                                    onChange={(event) =>
                                        onFromChange(event.target.value)
                                    }
                                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm text-slate-800 shadow-sm transition outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 disabled:cursor-not-allowed disabled:bg-slate-100"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="report-to"
                                    className="mb-2 block text-xs font-medium text-slate-600"
                                >
                                    End date
                                </label>

                                <input
                                    id="report-to"
                                    type="date"
                                    value={to}
                                    min={from || undefined}
                                    disabled={isRunning}
                                    onChange={(event) =>
                                        onToChange(event.target.value)
                                    }
                                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm text-slate-800 shadow-sm transition outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 disabled:cursor-not-allowed disabled:bg-slate-100"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Selected period summary */}
                    <div
                        aria-live="polite"
                        className={`flex items-center gap-4 rounded-xl border px-4 py-4 ${
                            invalidRange
                                ? 'border-red-200 bg-red-50'
                                : 'border-emerald-200 bg-emerald-50/70'
                        }`}
                    >
                        <div
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${
                                invalidRange
                                    ? 'bg-red-100 text-red-600'
                                    : 'bg-emerald-100 text-emerald-700'
                            }`}
                        >
                            <CalendarDays className="h-5 w-5" />
                        </div>

                        <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                                Selected reporting period
                            </p>

                            {invalidRange ? (
                                <p className="mt-1 text-sm font-medium text-red-700">
                                    Select a valid start and end date.
                                </p>
                            ) : (
                                <>
                                    <p className="mt-1 text-sm font-semibold text-slate-900 sm:text-base">
                                        {rangeLabel}
                                    </p>
                                    <p className="mt-1 text-xs text-slate-600">
                                        {modeLabel[mode]} · {days}{' '}
                                        {days === 1 ? 'day' : 'days'} of data
                                    </p>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Error feedback */}
                    {error && (
                        <div
                            role="alert"
                            className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3"
                        >
                            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-red-800">
                                    Report generation failed
                                </p>
                                <p className="mt-1 text-sm leading-relaxed text-red-700">
                                    {error}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
                    <p className="text-xs text-slate-500">
                        <FileDown className="mr-1.5 inline h-3.5 w-3.5" />
                        Report will be generated in PDF format.
                    </p>

                    <div className="flex items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isRunning}
                            className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Cancel
                        </button>

                        <button
                            type="button"
                            onClick={onRun}
                            disabled={!canRun}
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isRunning ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Generating report...
                                </>
                            ) : (
                                <>
                                    <FileDown className="h-4 w-4" />
                                    {error ? 'Try again' : 'Generate report'}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
