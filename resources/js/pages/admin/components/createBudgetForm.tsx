import {
    ChevronLeft,
    ChevronRight,
    FileText,
    Layers,
    Lock,
    LockOpen,
    Save,
    Wallet,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import Http from '@/utils/Http';

// ============================================
// TYPES
// ============================================

interface Option {
    value: string;
    label: string;
}

interface Props {
    categories: Option[];
    departments: Option[];
    suppliers?: Option[];
    years?: Option[];
    onCreated?: () => void;
    onCancel?: () => void;
}

interface FormState {
    budget_category: '' | 'petty_budget' | 'planned_budget';
    budget_name: string;
    description: string;
    budget_type: 'annual' | 'quarterly' | 'monthly' | 'project';
    category_id: string;
    department_id: string;
    supplier_id: string;
    fiscal_year: string;
    original_amount: string;
    warning_threshold: string;
    critical_threshold: string;
    status: 'draft' | 'active';
    is_locked: boolean;
}

type Errors = Partial<Record<keyof FormState, string>>;

type TabId = 'details' | 'classification' | 'funding' | 'controls';

// ============================================
// STATIC CONFIG
// ============================================

const BUDGET_CATEGORIES: Option[] = [
    { value: 'petty_budget', label: 'Petty' },
    { value: 'planned_budget', label: 'Planned' },
];

const categories: Option[] = [
    { value: '1', label: 'MED — Medical Supplies' },
    { value: '2', label: 'PHARM — Pharmaceuticals' },
    { value: '3', label: 'LAB — Laboratory Reagents' },
    { value: '4', label: 'SURG — Surgical Supplies' },
    { value: '5', label: 'GRANT — Grant Funded' },
    { value: '6', label: 'DONOR — Donor Funded' },
    { value: '7', label: 'CAPITAL — Capital Equipment' },
    { value: '8', label: 'PROJECT — Project Specific' },
    { value: '9', label: 'office — Stationary' },
    { value: '10', label: 'CLEAN — Cleaning Materials' },
    { value: '11', label: 'UTIL — Utilities' },
];

const BUDGET_PERIODS: Option[] = [
    { value: 'annual', label: 'Annual' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'project', label: 'Project' },
];

const STATUS_OPTIONS: Option[] = [
    { value: 'draft', label: 'Draft (not yet spendable)' },
    { value: 'active', label: 'Active' },
];

const TABS: {
    id: TabId;
    label: string;
    icon: ReactNode;
    fields: (keyof FormState)[];
}[] = [
    {
        id: 'details',
        label: 'Details',
        icon: <FileText className="h-4 w-4" />,
        fields: [
            'budget_category',
            'budget_type',
            'budget_name',
            'description',
        ],
    },
    {
        id: 'classification',
        label: 'Classification',
        icon: <Layers className="h-4 w-4" />,
        fields: ['category_id', 'department_id', 'supplier_id', 'fiscal_year'],
    },
    {
        id: 'funding',
        label: 'Funding & alerts',
        icon: <Wallet className="h-4 w-4" />,
        fields: ['original_amount', 'warning_threshold', 'critical_threshold'],
    },
    {
        id: 'controls',
        label: 'Controls',
        icon: <Lock className="h-4 w-4" />,
        fields: ['status', 'is_locked'],
    },
];

const currentYear = new Date().getFullYear();

const INITIAL: FormState = {
    budget_category: '',
    budget_name: '',
    description: '',
    budget_type: 'annual',
    category_id: '',
    department_id: '',
    supplier_id: '',
    fiscal_year: String(currentYear),
    original_amount: '',
    warning_threshold: '75',
    critical_threshold: '90',
    status: 'draft',
    is_locked: false,
};

// ============================================
// SHARED STYLES — every control is h-10 and full width of its grid cell
// ============================================

const controlClass =
    'block h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-800 shadow-sm placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200';
const textareaClass =
    'block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200';

const formatZmw = (n: number) =>
    new Intl.NumberFormat('en-ZM', {
        style: 'currency',
        currency: 'ZMW',
    }).format(Number.isFinite(n) ? n : 0);

// ============================================
// SMALL LAYOUT HELPER
// ============================================

function Field({
    id,
    label,
    error,
    hint,
    className = '',
    children,
}: {
    id: string;
    label: string;
    error?: string;
    hint?: string;
    className?: string;
    children: ReactNode;
}) {
    return (
        <div className={`space-y-1.5 ${className}`}>
            <Label htmlFor={id} className="text-sm font-medium text-slate-700">
                {label}
            </Label>
            {children}
            {error ? (
                <p className="text-xs text-red-600">{error}</p>
            ) : hint ? (
                <p className="text-xs text-slate-500">{hint}</p>
            ) : null}
        </div>
    );
}

// ============================================
// COMPONENT
// ============================================

export default function CreateBudgetForm({
    categories,
    departments,
    suppliers = [],
    years,
    onCreated,
    onCancel,
}: Props) {
    const [form, setForm] = useState<FormState>(INITIAL);
    const [errors, setErrors] = useState<Errors>({});
    const [tab, setTab] = useState<TabId>('details');
    const [saving, setSaving] = useState(false);

    const tabIndex = TABS.findIndex((t) => t.id === tab);
    const isLast = tabIndex === TABS.length - 1;

    const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
        setForm((prev) => ({ ...prev, [key]: value }));
        setErrors((prev) => ({ ...prev, [key]: undefined }));
    };

    const yearOptions: Option[] =
        years && years.length > 0
            ? years
            : [currentYear - 1, currentYear, currentYear + 1].map((y) => ({
                  value: String(y),
                  label: String(y),
              }));

    // ---------- validation ----------
    const validate = (): Errors => {
        const e: Errors = {};
        const amount = parseFloat(form.original_amount);
        const warning = parseFloat(form.warning_threshold);
        const critical = parseFloat(form.critical_threshold);

        if (!form.budget_category)
            e.budget_category = 'Select a budget category';
        if (!form.budget_name.trim()) e.budget_name = 'Enter a budget name';
        if (!form.category_id) e.category_id = 'Select a category';
        if (!form.fiscal_year) e.fiscal_year = 'Select a fiscal year';

        if (!/^\d+(\.\d{1,2})?$/.test(form.original_amount) || !(amount > 0)) {
            e.original_amount =
                'Enter an amount above 0 with up to 2 decimal places';
        }
        if (Number.isNaN(warning) || warning <= 0 || warning > 100) {
            e.warning_threshold = 'Enter a value between 1 and 100';
        }
        if (Number.isNaN(critical) || critical <= 0 || critical > 100) {
            e.critical_threshold = 'Enter a value between 1 and 100';
        } else if (!Number.isNaN(warning) && critical <= warning) {
            e.critical_threshold = 'Must be higher than the warning level';
        }
        return e;
    };

    const tabHasError = (id: TabId) =>
        TABS.find((t) => t.id === id)!.fields.some((f) => errors[f]);

    const goNext = () => {
        const all = validate();
        const mine = TABS[tabIndex].fields.filter((f) => all[f]);
        if (mine.length > 0) {
            setErrors((prev) => ({ ...prev, ...all }));
            toast.error('Complete the highlighted fields to continue');
            return;
        }
        setTab(TABS[tabIndex + 1].id);
    };

    // ---------- submit ----------
    const handleSubmit = async () => {
        const v = validate();
        setErrors(v);
        if (Object.keys(v).length > 0) {
            const firstBad = TABS.find((t) => t.fields.some((f) => v[f]));
            if (firstBad) setTab(firstBad.id);
            toast.error('Please fix the highlighted fields');
            return;
        }

        setSaving(true);
        try {
            const amount = parseFloat(form.original_amount).toFixed(2);
            const payload = {
                budget_category: form.budget_category,
                budget_name: form.budget_name.trim(),
                description: form.description.trim() || null,
                budget_type: form.budget_type,
                category_id: Number(form.category_id),
                department_id: form.department_id
                    ? Number(form.department_id)
                    : null,
                supplier_id: form.supplier_id ? Number(form.supplier_id) : null,
                fiscal_year: form.fiscal_year,
                original_amount: amount,
                allocated_amount: amount,
                warning_threshold: form.warning_threshold,
                critical_threshold: form.critical_threshold,
                status: form.status,
                is_locked: form.is_locked,
                // budget_code is generated server-side (BUD-YYYY-#####)
            };

            const response = await Http.post(
                '/admin/budget-allocations/create',
                payload,
            );
            if (response.data.success) {
                toast.success(
                    `Budget ${response.data.budget?.budget_code ?? ''} created`,
                );
                setForm(INITIAL);
                setErrors({});
                setTab('details');
                onCreated?.();
            } else {
                throw new Error(response.data.message || 'Create failed');
            }
        } catch (error: any) {
            const serverErrors = error.response?.data?.errors;
            if (serverErrors) {
                const mapped: Errors = {};
                Object.entries(serverErrors).forEach(([k, msgs]) => {
                    mapped[k as keyof FormState] = (msgs as string[])[0];
                });
                setErrors(mapped);
                const firstBad = TABS.find((t) =>
                    t.fields.some((f) => mapped[f]),
                );
                if (firstBad) setTab(firstBad.id);
            }
            toast.error(
                error.response?.data?.message || 'Failed to create budget',
            );
        } finally {
            setSaving(false);
        }
    };

    // ---------- derived preview values ----------
    const amountNum = parseFloat(form.original_amount) || 0;
    const warnAmount =
        (amountNum * (parseFloat(form.warning_threshold) || 0)) / 100;
    const critAmount =
        (amountNum * (parseFloat(form.critical_threshold) || 0)) / 100;

    const label = (opts: Option[], value: string, fallback = '—') =>
        opts.find((o) => o.value === value)?.label ?? fallback;

    // ---------- render ----------
    return (
        <>
            <div className="border-b-1 px-4 py-2">
                <h2 className="text-lg font-semibold text-cyan-600">
                    Add budget
                </h2>
                <p className="text-sm text-slate-500">
                    Complete each section. The budget code is generated when you
                    save.
                </p>
            </div>
            <div className="mx-auto w-full max-w-4xl p-3 sm:p-6">
                {/* Tab list */}
                <div
                    role="tablist"
                    aria-label="Budget form sections"
                    className="flex gap-1 overflow-x-auto border-b border-slate-200"
                >
                    {TABS.map((t, i) => {
                        const active = t.id === tab;
                        const bad = tabHasError(t.id);
                        return (
                            <button
                                key={t.id}
                                type="button"
                                role="tab"
                                id={`tab-${t.id}`}
                                aria-selected={active}
                                aria-controls={`panel-${t.id}`}
                                onClick={() => setTab(t.id)}
                                className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 ${
                                    active
                                        ? 'border-slate-800 text-slate-900'
                                        : 'border-transparent text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                {t.icon}
                                <span>{t.label}</span>
                                {bad && (
                                    <span
                                        className="h-2 w-2 rounded-full bg-red-500"
                                        aria-label="Has errors"
                                    />
                                )}
                                <span className="sr-only">
                                    Section {i + 1} of {TABS.length}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Panels — fixed minimum height so the card doesn't jump between tabs */}
                <div
                    role="tabpanel"
                    id={`panel-${tab}`}
                    aria-labelledby={`tab-${tab}`}
                    className="min-h-[24rem] py-6"
                >
                    {tab === 'details' && (
                        <div className="grid grid-cols-1 gap-x-5 gap-y-5 md:grid-cols-2">
                            <Field
                                id="budget_category"
                                label="Budget category"
                                error={errors.budget_category}
                            >
                                <select
                                    id="budget_category"
                                    className={controlClass}
                                    value={form.budget_category}
                                    onChange={(e) =>
                                        set(
                                            'budget_category',
                                            e.target
                                                .value as FormState['budget_category'],
                                        )
                                    }
                                >
                                    <option value="">
                                        Select budget category
                                    </option>
                                    {BUDGET_CATEGORIES.map((o) => (
                                        <option key={o.value} value={o.value}>
                                            {o.label}
                                        </option>
                                    ))}
                                </select>
                            </Field>

                            <Field id="budget_type" label="Budget period">
                                <select
                                    id="budget_type"
                                    className={controlClass}
                                    value={form.budget_type}
                                    onChange={(e) =>
                                        set(
                                            'budget_type',
                                            e.target
                                                .value as FormState['budget_type'],
                                        )
                                    }
                                >
                                    {BUDGET_PERIODS.map((o) => (
                                        <option key={o.value} value={o.value}>
                                            {o.label}
                                        </option>
                                    ))}
                                </select>
                            </Field>

                            <Field
                                id="budget_name"
                                label="Budget name"
                                error={errors.budget_name}
                                className="md:col-span-2"
                            >
                                <input
                                    id="budget_name"
                                    type="text"
                                    maxLength={255}
                                    className={controlClass}
                                    placeholder="e.g. Ward 3 Supplies Budget"
                                    value={form.budget_name}
                                    onChange={(e) =>
                                        set('budget_name', e.target.value)
                                    }
                                />
                            </Field>

                            <Field
                                id="description"
                                label="Description (optional)"
                                className="md:col-span-2"
                            >
                                <textarea
                                    id="description"
                                    rows={5}
                                    className={textareaClass}
                                    placeholder="What is this budget for?"
                                    value={form.description}
                                    onChange={(e) =>
                                        set('description', e.target.value)
                                    }
                                />
                            </Field>
                        </div>
                    )}

                    {tab === 'classification' && (
                        <div className="grid grid-cols-1 gap-x-5 gap-y-5 md:grid-cols-2">
                            <Field
                                id="category_id"
                                label="Category"
                                error={errors.category_id}
                            >
                                <select
                                    id="category_id"
                                    className={controlClass}
                                    value={form.category_id}
                                    onChange={(e) =>
                                        set('category_id', e.target.value)
                                    }
                                >
                                    <option value="">Select category</option>
                                    {[
                                        {
                                            value: '1',
                                            label: 'MED — Medical Supplies',
                                        },
                                        {
                                            value: '2',
                                            label: 'PHARM — Pharmaceuticals',
                                        },
                                        {
                                            value: '3',
                                            label: 'LAB — Laboratory Reagents',
                                        },
                                        {
                                            value: '4',
                                            label: 'SURG — Surgical Supplies',
                                        },
                                        {
                                            value: '5',
                                            label: 'GRANT — Grant Funded',
                                        },
                                        {
                                            value: '6',
                                            label: 'DONOR — Donor Funded',
                                        },
                                        {
                                            value: '7',
                                            label: 'CAPITAL — Capital Equipment',
                                        },
                                        {
                                            value: '8',
                                            label: 'PROJECT — Project Specific',
                                        },
                                        {
                                            value: '9',
                                            label: 'office — Stationary',
                                        },
                                        {
                                            value: '10',
                                            label: 'CLEAN — Cleaning Materials',
                                        },
                                        {
                                            value: '11',
                                            label: 'UTIL — Utilities',
                                        },
                                    ].map((o) => (
                                        <option key={o.value} value={o.value}>
                                            {o.label}
                                        </option>
                                    ))}
                                </select>
                            </Field>

                            <Field
                                id="fiscal_year"
                                label="Fiscal year"
                                error={errors.fiscal_year}
                            >
                                <select
                                    id="fiscal_year"
                                    className={controlClass}
                                    value={form.fiscal_year}
                                    onChange={(e) =>
                                        set('fiscal_year', e.target.value)
                                    }
                                >
                                    {yearOptions.map((o) => (
                                        <option key={o.value} value={o.value}>
                                            {o.label}
                                        </option>
                                    ))}
                                </select>
                            </Field>

                            <Field
                                id="department_id"
                                label="Department (optional)"
                                hint="Leave as General for hospital-wide budgets."
                            >
                                <select
                                    id="department_id"
                                    className={controlClass}
                                    value={form.department_id}
                                    onChange={(e) =>
                                        set('department_id', e.target.value)
                                    }
                                >
                                    <option value="">General</option>
                                    {departments.map((o) => (
                                        <option key={o.value} value={o.value}>
                                            {o.label}
                                        </option>
                                    ))}
                                </select>
                            </Field>

                            <Field
                                id="supplier_id"
                                label="Supplier (optional)"
                                hint={
                                    suppliers.length === 0
                                        ? 'No suppliers available to select.'
                                        : undefined
                                }
                            >
                                <select
                                    id="supplier_id"
                                    className={`${controlClass} disabled:bg-slate-100`}
                                    value={form.supplier_id}
                                    disabled={suppliers.length === 0}
                                    onChange={(e) =>
                                        set('supplier_id', e.target.value)
                                    }
                                >
                                    <option value="">No supplier</option>
                                    {suppliers.map((o) => (
                                        <option key={o.value} value={o.value}>
                                            {o.label}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                        </div>
                    )}

                    {tab === 'funding' && (
                        <div className="grid grid-cols-1 gap-x-5 gap-y-5 md:grid-cols-2">
                            <Field
                                id="original_amount"
                                label="Budget amount (ZMW)"
                                error={errors.original_amount}
                                className="md:col-span-2"
                            >
                                <input
                                    id="original_amount"
                                    type="number"
                                    inputMode="decimal"
                                    min="0"
                                    step="0.01"
                                    className={controlClass}
                                    placeholder="0.00"
                                    value={form.original_amount}
                                    onChange={(e) =>
                                        set('original_amount', e.target.value)
                                    }
                                />
                            </Field>

                            <Field
                                id="warning_threshold"
                                label="Warning alert at (% used)"
                                error={errors.warning_threshold}
                                hint={
                                    amountNum > 0
                                        ? `Triggers at ${formatZmw(warnAmount)} spent`
                                        : undefined
                                }
                            >
                                <input
                                    id="warning_threshold"
                                    type="number"
                                    min="1"
                                    max="100"
                                    step="0.01"
                                    className={controlClass}
                                    value={form.warning_threshold}
                                    onChange={(e) =>
                                        set('warning_threshold', e.target.value)
                                    }
                                />
                            </Field>

                            <Field
                                id="critical_threshold"
                                label="Critical alert at (% used)"
                                error={errors.critical_threshold}
                                hint={
                                    amountNum > 0
                                        ? `Triggers at ${formatZmw(critAmount)} spent`
                                        : undefined
                                }
                            >
                                <input
                                    id="critical_threshold"
                                    type="number"
                                    min="1"
                                    max="100"
                                    step="0.01"
                                    className={controlClass}
                                    value={form.critical_threshold}
                                    onChange={(e) =>
                                        set(
                                            'critical_threshold',
                                            e.target.value,
                                        )
                                    }
                                />
                            </Field>
                        </div>
                    )}

                    {tab === 'controls' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 gap-x-5 gap-y-5 md:grid-cols-2">
                                <Field id="status" label="Starting status">
                                    <select
                                        id="status"
                                        className={controlClass}
                                        value={form.status}
                                        onChange={(e) =>
                                            set(
                                                'status',
                                                e.target
                                                    .value as FormState['status'],
                                            )
                                        }
                                    >
                                        {STATUS_OPTIONS.map((o) => (
                                            <option
                                                key={o.value}
                                                value={o.value}
                                            >
                                                {o.label}
                                            </option>
                                        ))}
                                    </select>
                                </Field>
                            </div>

                            {/* Lock toggle */}
                            <div
                                className={`flex items-start justify-between gap-4 rounded-lg border p-4 ${
                                    form.is_locked
                                        ? 'border-amber-300 bg-amber-50'
                                        : 'border-slate-200 bg-slate-50'
                                }`}
                            >
                                <div className="flex items-start gap-3">
                                    {form.is_locked ? (
                                        <Lock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                                    ) : (
                                        <LockOpen className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
                                    )}
                                    <div>
                                        <p
                                            id="is_locked_label"
                                            className="text-sm font-medium text-slate-800"
                                        >
                                            Lock this budget
                                        </p>
                                        <p className="text-xs text-slate-600">
                                            {form.is_locked
                                                ? 'Strict budget: the amount cannot be increased, reduced or revised after saving. Only an admin can unlock it.'
                                                : 'Unlocked: users with edit permission can adjust this budget.'}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={form.is_locked}
                                    aria-labelledby="is_locked_label"
                                    onClick={() =>
                                        set('is_locked', !form.is_locked)
                                    }
                                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 ${
                                        form.is_locked
                                            ? 'bg-amber-500'
                                            : 'bg-slate-300'
                                    }`}
                                >
                                    <span
                                        className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                                            form.is_locked
                                                ? 'translate-x-5'
                                                : 'translate-x-0'
                                        }`}
                                    />
                                </button>
                            </div>

                            {/* Review */}
                            <div className="rounded-lg border border-slate-200">
                                <p className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700">
                                    Review before saving
                                </p>
                                <dl className="grid grid-cols-1 gap-x-6 gap-y-2 p-4 text-sm sm:grid-cols-2">
                                    {(
                                        [
                                            ['Name', form.budget_name || '—'],
                                            [
                                                'Category',
                                                label(
                                                    BUDGET_CATEGORIES,
                                                    form.budget_category,
                                                ),
                                            ],
                                            [
                                                'Period',
                                                label(
                                                    BUDGET_PERIODS,
                                                    form.budget_type,
                                                ),
                                            ],
                                            [
                                                'Fiscal year',
                                                form.fiscal_year || '—',
                                            ],
                                            [
                                                'Classification',
                                                label(
                                                    categories,
                                                    form.category_id,
                                                ),
                                            ],
                                            [
                                                'Department',
                                                label(
                                                    departments,
                                                    form.department_id,
                                                    'General',
                                                ),
                                            ],
                                            ['Amount', formatZmw(amountNum)],
                                            [
                                                'Alerts',
                                                `${form.warning_threshold}% / ${form.critical_threshold}%`,
                                            ],
                                        ] as [string, string][]
                                    ).map(([k, v]) => (
                                        <div
                                            key={k}
                                            className="flex justify-between gap-3 border-b border-slate-100 pb-1.5"
                                        >
                                            <dt className="text-slate-500">
                                                {k}
                                            </dt>
                                            <dd className="text-right font-medium text-slate-800">
                                                {v}
                                            </dd>
                                        </div>
                                    ))}
                                </dl>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer navigation */}
                <div className="flex items-center justify-between gap-2 border-t border-slate-200 pt-4">
                    <div>
                        {onCancel && (
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={onCancel}
                                disabled={saving}
                            >
                                Cancel
                            </Button>
                        )}
                    </div>
                    <div className="flex gap-2">
                        {tabIndex > 0 && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setTab(TABS[tabIndex - 1].id)}
                                disabled={saving}
                            >
                                <ChevronLeft className="mr-1 h-4 w-4" />
                                Back
                            </Button>
                        )}
                        {isLast ? (
                            <Button
                                type="button"
                                onClick={handleSubmit}
                                disabled={saving}
                            >
                                <Save className="mr-2 h-4 w-4" />
                                {saving ? 'Saving…' : 'Save budget'}
                            </Button>
                        ) : (
                            <Button type="button" onClick={goNext}>
                                Next
                                <ChevronRight className="ml-1 h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
