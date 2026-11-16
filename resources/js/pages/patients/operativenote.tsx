import { Link, useForm, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    CheckCircle2,
    Plus,
    Scissors,
    Trash2,
    X,
} from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';

import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import AppLayout from '@/layouts/app/app-header-layout';

// ─── Types ────────────────────────────────────────────────────

interface Staff {
    id: number;
    name: string;
}

interface Specimen {
    description: string;
    destination: string;
}

interface PostOpPlan {
    monitoring: string;
    activity: string;
    diet: string;
    iv_fluids: string;
    medications: string;
    drains_dressings: string;
}

interface Props {
    orderItem: {
        id: number;
        procedure?: string | null;
        theatre?: string | null;
        scheduled_at?: string | null;
        urgency?: string | null;
    };
    patient: {
        id: number;
        name: string;
        dob: string | null;
        age: number | null;
        gender: string | null;
        mrn: string | null;
    };
    visit: {
        id: number;
        visit_number?: string | null;
        visit_date?: string | null;
    } | null;
    staff: { surgeons: Staff[]; anaesthetists: Staff[]; nurses: Staff[] };
    note: {
        id: number;
        status: 'draft' | 'signed';
        signed_at: string | null;
    } | null;
    defaults: Partial<Record<string, any>>;
    currentUser: {
        id: number;
        name: string;
        title: string | null;
        registration_number: string;
    };
    readOnly: boolean;
}

// ─── Constants & small helpers ────────────────────────────────

const ANAESTHESIA_TYPES = [
    ['general', 'General'],
    ['spinal', 'Spinal'],
    ['epidural', 'Epidural'],
    ['regional', 'Regional block'],
    ['local', 'Local'],
    ['sedation', 'Sedation'],
    ['mac', 'Monitored anaesthesia care'],
] as const;

const COUNTS = [
    ['correct', 'Correct'],
    ['incorrect', 'Incorrect — action taken'],
    ['not_applicable', 'Not applicable'],
] as const;

const inputCls =
    'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-600';

const emptyPlan: PostOpPlan = {
    monitoring: '',
    activity: '',
    diet: '',
    iv_fluids: '',
    medications: '',
    drains_dressings: '',
};

const str = (v: unknown) => (v === null || v === undefined ? '' : String(v));

function Section({
    n,
    title,
    hint,
    children,
}: {
    n: number;
    title: string;
    hint?: string;
    children: ReactNode;
}) {
    return (
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <header className="mb-4">
                <h2 className="text-sm font-semibold text-slate-900">
                    <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[11px] font-semibold text-blue-800">
                        {n}
                    </span>
                    {title}
                </h2>
                {hint && (
                    <p className="mt-1 ml-7 text-xs text-slate-600">{hint}</p>
                )}
            </header>
            <div className="space-y-4">{children}</div>
        </section>
    );
}

function Field({
    id,
    label,
    error,
    hint,
    required,
    className = '',
    children,
}: {
    id: string;
    label: string;
    error?: string;
    hint?: string;
    required?: boolean;
    className?: string;
    children: ReactNode;
}) {
    return (
        <div className={className}>
            <label
                htmlFor={id}
                className="mb-1 block text-xs font-medium text-slate-700"
            >
                {label}
                {required && (
                    <span className="ml-1 font-normal text-slate-500">
                        (required to sign)
                    </span>
                )}
            </label>
            {children}
            {hint && !error && (
                <p className="mt-1 text-[11px] text-slate-500">{hint}</p>
            )}
            {error && (
                <p
                    id={`${id}-error`}
                    role="alert"
                    className="mt-1 text-[11px] font-medium text-red-700"
                >
                    {error}
                </p>
            )}
        </div>
    );
}

function ReadOnlyValue({ label, value }: { label: string; value: ReactNode }) {
    return (
        <div>
            <dt className="text-[11px] text-slate-500">{label}</dt>
            <dd className="text-sm font-medium text-slate-900">
                {value || '–'}
            </dd>
        </div>
    );
}

// ─── Staff pickers ────────────────────────────────────────────

function StaffSelect({
    id,
    value,
    options,
    onChange,
    error,
}: {
    id: string;
    value: number | '' | null;
    options: Staff[];
    onChange: (v: number | '') => void;
    error?: string;
}) {
    return (
        <select
            id={id}
            value={value ?? ''}
            onChange={(e) =>
                onChange(e.target.value ? Number(e.target.value) : '')
            }
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : undefined}
            className={inputCls}
        >
            <option value="">Select…</option>
            {options.map((s) => (
                <option key={s.id} value={s.id}>
                    {s.name}
                </option>
            ))}
        </select>
    );
}

function StaffMultiSelect({
    id,
    options,
    value,
    onChange,
    disabled,
}: {
    id: string;
    options: Staff[];
    value: number[];
    onChange: (v: number[]) => void;
    disabled?: boolean;
}) {
    const [q, setQ] = useState('');
    const selected = options.filter((o) => value.includes(o.id));
    const filtered = options.filter((o) =>
        o.name.toLowerCase().includes(q.trim().toLowerCase()),
    );
    const toggle = (sid: number) =>
        onChange(
            value.includes(sid)
                ? value.filter((v) => v !== sid)
                : [...value, sid],
        );

    return (
        <div className="rounded-md border border-slate-300 bg-white">
            {selected.length > 0 && (
                <ul className="flex flex-wrap gap-1.5 border-b border-slate-200 p-2">
                    {selected.map((s) => (
                        <li
                            key={s.id}
                            className="flex items-center gap-1 rounded-full bg-blue-50 py-0.5 pr-1 pl-2.5 text-xs text-blue-900"
                        >
                            {s.name}
                            <button
                                type="button"
                                disabled={disabled}
                                onClick={() => toggle(s.id)}
                                aria-label={`Remove ${s.name}`}
                                className="rounded-full p-0.5 hover:bg-blue-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                            >
                                <X className="h-3 w-3" aria-hidden="true" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            <input
                id={id}
                type="search"
                value={q}
                disabled={disabled}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search staff…"
                aria-label="Search staff"
                className="w-full border-b border-slate-200 px-3 py-2 text-sm focus:outline-none focus-visible:bg-blue-50/40"
            />
            <ul className="max-h-40 overflow-y-auto p-1">
                {filtered.map((s) => (
                    <li key={s.id}>
                        <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-slate-50">
                            <input
                                type="checkbox"
                                checked={value.includes(s.id)}
                                disabled={disabled}
                                onChange={() => toggle(s.id)}
                                className="h-4 w-4 rounded border-slate-400 text-blue-600 focus:ring-blue-600"
                            />
                            {s.name}
                        </label>
                    </li>
                ))}
                {filtered.length === 0 && (
                    <li className="px-2 py-3 text-xs text-slate-500">
                        No staff match.
                    </li>
                )}
            </ul>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────

export default function OperativeNote({
    orderItem,
    patient,
    visit,
    staff,
    note,
    defaults,
    currentUser,
    readOnly,
}: Props) {
    const form = useForm({
        action: 'draft' as 'draft' | 'sign',
        theater_order_item_id: orderItem.id,

        operation_date: str(defaults.operation_date),
        start_time: str(defaults.start_time),
        end_time: str(defaults.end_time),
        theatre: str(defaults.theatre),

        lead_surgeon_id: (defaults.lead_surgeon_id ?? '') as number | '',
        co_surgeon_ids: (defaults.co_surgeon_ids ?? []) as number[],
        assistant_ids: (defaults.assistant_ids ?? []) as number[],
        anaesthetist_id: (defaults.anaesthetist_id ?? '') as number | '',
        scrub_nurse_id: (defaults.scrub_nurse_id ?? '') as number | '',
        circulating_nurse_id: (defaults.circulating_nurse_id ?? '') as
            | number
            | '',

        preoperative_diagnosis: str(defaults.preoperative_diagnosis),
        postoperative_diagnosis: str(defaults.postoperative_diagnosis),
        procedure_performed: str(defaults.procedure_performed),
        anaesthesia_type: str(defaults.anaesthesia_type),

        procedure_details: str(defaults.procedure_details),
        findings: str(defaults.findings),

        ebl_ml: str(defaults.ebl_ml),
        fluids_ml: str(defaults.fluids_ml),
        urine_output_ml: str(defaults.urine_output_ml),
        counts_correct: str(defaults.counts_correct),

        specimens: (defaults.specimens ?? []) as Specimen[],
        complications_occurred: Boolean(defaults.complications_occurred),
        complications: str(defaults.complications),

        post_op_plan: {
            ...emptyPlan,
            ...(defaults.post_op_plan ?? {}),
        } as PostOpPlan,

        registration_number:
            str(defaults.registration_number) ||
            currentUser.registration_number,
    });
const {props} = usePage()
console.log(props)
    const [confirmSign, setConfirmSign] = useState(false);
    const errors = form.errors as Record<string, string | undefined>;
    const errorEntries = useMemo(
        () => Object.entries(errors).filter(([, m]) => m),
        [errors],
    );

    const submit = (action: 'draft' | 'sign') => {
        form.transform((d) => ({ ...d, action }));
        const opts = {
            preserveScroll: true,
            onFinish: () => setConfirmSign(false),
        };
        if (note) form.put(`/theater/op-notes/${note.id}`, opts);
        else form.post('/theater/op-notes', opts);
    };

    const focusField = (key: string) => {
        const el = document.getElementById(key);
        el?.scrollIntoView({ block: 'center' });
        el?.focus();
    };

    const setPlan = (k: keyof PostOpPlan, v: string) =>
        form.setData('post_op_plan', { ...form.data.post_op_plan, [k]: v });
    const updateSpecimen = (i: number, k: keyof Specimen, v: string) =>
        form.setData(
            'specimens',
            form.data.specimens.map((s, idx) =>
                idx === i ? { ...s, [k]: v } : s,
            ),
        );

    const textarea = (
        id: keyof typeof form.data | string,
        value: string,
        onChange: (v: string) => void,
        rows = 3,
        placeholder?: string,
    ) => (
        <textarea
            id={String(id)}
            value={value}
            rows={rows}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
            aria-invalid={!!errors[String(id)]}
            aria-describedby={
                errors[String(id)] ? `${String(id)}-error` : undefined
            }
            className={`${inputCls} resize-y`}
        />
    );

    return (
        <AppLayout
            breadcrumbs={[
                { href: '/dashboard', title: 'Dashboard' },
                { href: '/theater', title: 'Theater' },
                { href: '', title: 'Operative note' },
            ]}
        >
            <div className="bg-blue-50 p-2">
                <PageHeader
                    icon={<Scissors className="h-5 w-5" />}
                    title="Operative note"
                    subtitle="Document what was done, what was found and the immediate recovery plan"
                />
            </div>

            <div className="min-h-screen bg-blue-50 p-4 pb-28">
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        submit('draft');
                    }}
                    noValidate
                    className="mx-auto max-w-4xl space-y-4"
                >
                    {readOnly && (
                        <div
                            role="status"
                            className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-900"
                        >
                            <CheckCircle2
                                className="mt-0.5 h-4 w-4 shrink-0"
                                aria-hidden="true"
                            />
                            <p>
                                This note was signed
                                {note?.signed_at
                                    ? ` on ${new Date(note.signed_at).toLocaleString()}`
                                    : ''}{' '}
                                and is read-only.
                            </p>
                        </div>
                    )}

                    {errorEntries.length > 0 && (
                        <div
                            role="alert"
                            className="rounded-lg border border-red-200 bg-red-50 p-3"
                        >
                            <p className="flex items-center gap-2 text-sm font-semibold text-red-900">
                                <AlertTriangle
                                    className="h-4 w-4"
                                    aria-hidden="true"
                                />
                                {errorEntries.length}{' '}
                                {errorEntries.length === 1
                                    ? 'field needs'
                                    : 'fields need'}{' '}
                                attention
                            </p>
                            <ul className="mt-2 list-inside list-disc space-y-0.5 text-xs text-red-800">
                                {errorEntries.map(([key, message]) => (
                                    <li key={key}>
                                        <button
                                            type="button"
                                            onClick={() => focusField(key)}
                                            className="underline underline-offset-2 hover:text-red-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
                                        >
                                            {message}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <fieldset
                        disabled={readOnly || form.processing}
                        className="min-w-0 space-y-4 border-0 p-0"
                    >
                        {/* 1 · Patient identification (from the system) */}
                        <Section
                            n={1}
                            title="Patient identification"
                            hint="Loaded from the patient record. To correct these details, update the patient file."
                        >
                            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                                <ReadOnlyValue
                                    label="Full name"
                                    value={patient.name}
                                />
                                <ReadOnlyValue
                                    label="Medical record number"
                                    value={patient.mrn}
                                />
                                <ReadOnlyValue
                                    label="Date of birth"
                                    value={
                                        patient.dob
                                            ? new Date(
                                                  patient.dob,
                                              ).toLocaleDateString()
                                            : null
                                    }
                                />
                                <ReadOnlyValue
                                    label="Age"
                                    value={
                                        patient.age !== null
                                            ? `${patient.age} years`
                                            : null
                                    }
                                />
                                <ReadOnlyValue
                                    label="Gender"
                                    value={patient.gender}
                                />
                                <ReadOnlyValue
                                    label="Visit"
                                    value={visit?.visit_number}
                                />
                            </dl>
                        </Section>

                        {/* 2 · Date, time, location */}
                        <Section n={2} title="Date, time and location">
                            <div className="grid gap-4 sm:grid-cols-4">
                                <Field
                                    id="operation_date"
                                    label="Date of operation"
                                    required
                                    error={errors.operation_date}
                                >
                                    <input
                                        id="operation_date"
                                        type="date"
                                        value={form.data.operation_date}
                                        onChange={(e) =>
                                            form.setData(
                                                'operation_date',
                                                e.target.value,
                                            )
                                        }
                                        className={inputCls}
                                        aria-invalid={!!errors.operation_date}
                                    />
                                </Field>
                                <Field
                                    id="start_time"
                                    label="Start time"
                                    required
                                    error={errors.start_time}
                                >
                                    <input
                                        id="start_time"
                                        type="time"
                                        value={form.data.start_time}
                                        onChange={(e) =>
                                            form.setData(
                                                'start_time',
                                                e.target.value,
                                            )
                                        }
                                        className={inputCls}
                                        aria-invalid={!!errors.start_time}
                                    />
                                </Field>
                                <Field
                                    id="end_time"
                                    label="End time"
                                    required
                                    error={errors.end_time}
                                >
                                    <input
                                        id="end_time"
                                        type="time"
                                        value={form.data.end_time}
                                        onChange={(e) =>
                                            form.setData(
                                                'end_time',
                                                e.target.value,
                                            )
                                        }
                                        className={inputCls}
                                        aria-invalid={!!errors.end_time}
                                    />
                                </Field>
                                <Field
                                    id="theatre"
                                    label="Theatre"
                                    error={errors.theatre}
                                >
                                    <input
                                        id="theatre"
                                        value={form.data.theatre}
                                        onChange={(e) =>
                                            form.setData(
                                                'theatre',
                                                e.target.value,
                                            )
                                        }
                                        className={inputCls}
                                    />
                                </Field>
                            </div>
                        </Section>

                        {/* 3 · Surgical team */}
                        <Section
                            n={3}
                            title="Surgical team"
                            hint="Choose from staff registered in the system."
                        >
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field
                                    id="lead_surgeon_id"
                                    label="Lead surgeon"
                                    required
                                    error={errors.lead_surgeon_id}
                                >
                                    <StaffSelect
                                        id="lead_surgeon_id"
                                        value={form.data.lead_surgeon_id}
                                        options={staff.surgeons}
                                        onChange={(v) =>
                                            form.setData('lead_surgeon_id', v)
                                        }
                                        error={errors.lead_surgeon_id}
                                    />
                                </Field>
                                <Field
                                    id="anaesthetist_id"
                                    label="Anaesthetist"
                                    required
                                    error={errors.anaesthetist_id}
                                >
                                    <StaffSelect
                                        id="anaesthetist_id"
                                        value={form.data.anaesthetist_id}
                                        options={staff.anaesthetists}
                                        onChange={(v) =>
                                            form.setData('anaesthetist_id', v)
                                        }
                                        error={errors.anaesthetist_id}
                                    />
                                </Field>
                                <Field
                                    id="scrub_nurse_id"
                                    label="Scrub nurse"
                                    error={errors.scrub_nurse_id}
                                >
                                    <StaffSelect
                                        id="scrub_nurse_id"
                                        value={form.data.scrub_nurse_id}
                                        options={staff.nurses}
                                        onChange={(v) =>
                                            form.setData('scrub_nurse_id', v)
                                        }
                                    />
                                </Field>
                                <Field
                                    id="circulating_nurse_id"
                                    label="Circulating nurse"
                                    error={errors.circulating_nurse_id}
                                >
                                    <StaffSelect
                                        id="circulating_nurse_id"
                                        value={form.data.circulating_nurse_id}
                                        options={staff.nurses}
                                        onChange={(v) =>
                                            form.setData(
                                                'circulating_nurse_id',
                                                v,
                                            )
                                        }
                                    />
                                </Field>
                                <Field id="co_surgeon_ids" label="Co-surgeons">
                                    <StaffMultiSelect
                                        id="co_surgeon_ids"
                                        options={staff.surgeons.filter(
                                            (s) =>
                                                s.id !==
                                                form.data.lead_surgeon_id,
                                        )}
                                        value={form.data.co_surgeon_ids}
                                        onChange={(v) =>
                                            form.setData('co_surgeon_ids', v)
                                        }
                                        disabled={readOnly}
                                    />
                                </Field>
                                <Field
                                    id="assistant_ids"
                                    label="Assistants and residents"
                                >
                                    <StaffMultiSelect
                                        id="assistant_ids"
                                        options={[
                                            ...staff.surgeons,
                                            ...staff.nurses,
                                        ].filter(
                                            (s, i, a) =>
                                                a.findIndex(
                                                    (x) => x.id === s.id,
                                                ) === i,
                                        )}
                                        value={form.data.assistant_ids}
                                        onChange={(v) =>
                                            form.setData('assistant_ids', v)
                                        }
                                        disabled={readOnly}
                                    />
                                </Field>
                            </div>
                        </Section>

                        {/* 4 · Diagnosis, procedure, anaesthesia */}
                        <Section
                            n={4}
                            title="Diagnosis, procedure and anaesthesia"
                        >
                            <Field
                                id="preoperative_diagnosis"
                                label="Pre-operative diagnosis"
                                required
                                hint="Indication for surgery, including relevant comorbidities."
                                error={errors.preoperative_diagnosis}
                            >
                                {textarea(
                                    'preoperative_diagnosis',
                                    form.data.preoperative_diagnosis,
                                    (v) =>
                                        form.setData(
                                            'preoperative_diagnosis',
                                            v,
                                        ),
                                    2,
                                )}
                            </Field>
                            <Field
                                id="postoperative_diagnosis"
                                label="Post-operative diagnosis"
                                required
                                hint="Updated diagnosis based on intra-operative findings."
                                error={errors.postoperative_diagnosis}
                            >
                                {textarea(
                                    'postoperative_diagnosis',
                                    form.data.postoperative_diagnosis,
                                    (v) =>
                                        form.setData(
                                            'postoperative_diagnosis',
                                            v,
                                        ),
                                    2,
                                )}
                            </Field>
                            <Field
                                id="procedure_performed"
                                label="Procedure performed"
                                required
                                hint={
                                    orderItem.procedure
                                        ? `Ordered: ${orderItem.procedure}. List multiple procedures by priority.`
                                        : 'List multiple procedures by priority.'
                                }
                                error={errors.procedure_performed}
                            >
                                {textarea(
                                    'procedure_performed',
                                    form.data.procedure_performed,
                                    (v) =>
                                        form.setData('procedure_performed', v),
                                    2,
                                )}
                            </Field>
                            <Field
                                id="anaesthesia_type"
                                label="Anaesthesia"
                                required
                                error={errors.anaesthesia_type}
                                className="sm:max-w-xs"
                            >
                                <select
                                    id="anaesthesia_type"
                                    value={form.data.anaesthesia_type}
                                    onChange={(e) =>
                                        form.setData(
                                            'anaesthesia_type',
                                            e.target.value,
                                        )
                                    }
                                    className={inputCls}
                                    aria-invalid={!!errors.anaesthesia_type}
                                >
                                    <option value="">Select…</option>
                                    {ANAESTHESIA_TYPES.map(([v, l]) => (
                                        <option key={v} value={v}>
                                            {l}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                        </Section>

                        {/* 5 · Narrative and findings */}
                        <Section
                            n={5}
                            title="Details of the procedure and findings"
                        >
                            <Field
                                id="procedure_details"
                                label="Procedure details"
                                required
                                hint="Step by step: approach, structures identified, tissue resected or repaired, equipment and implants used."
                                error={errors.procedure_details}
                            >
                                {textarea(
                                    'procedure_details',
                                    form.data.procedure_details,
                                    (v) => form.setData('procedure_details', v),
                                    8,
                                )}
                            </Field>
                            <Field
                                id="findings"
                                label="Findings"
                                required
                                hint="What was seen or felt at the surgical site."
                                error={errors.findings}
                            >
                                {textarea(
                                    'findings',
                                    form.data.findings,
                                    (v) => form.setData('findings', v),
                                    4,
                                )}
                            </Field>
                        </Section>

                        {/* 6 · Metrics */}
                        <Section n={6} title="Quantified metrics">
                            <div className="grid gap-4 sm:grid-cols-4">
                                <Field
                                    id="ebl_ml"
                                    label="Estimated blood loss (ml)"
                                    required
                                    error={errors.ebl_ml}
                                >
                                    <input
                                        id="ebl_ml"
                                        type="number"
                                        min={0}
                                        inputMode="numeric"
                                        value={form.data.ebl_ml}
                                        onChange={(e) =>
                                            form.setData(
                                                'ebl_ml',
                                                e.target.value,
                                            )
                                        }
                                        className={inputCls}
                                        aria-invalid={!!errors.ebl_ml}
                                    />
                                </Field>
                                <Field
                                    id="fluids_ml"
                                    label="Fluids given (ml)"
                                    error={errors.fluids_ml}
                                >
                                    <input
                                        id="fluids_ml"
                                        type="number"
                                        min={0}
                                        inputMode="numeric"
                                        value={form.data.fluids_ml}
                                        onChange={(e) =>
                                            form.setData(
                                                'fluids_ml',
                                                e.target.value,
                                            )
                                        }
                                        className={inputCls}
                                    />
                                </Field>
                                <Field
                                    id="urine_output_ml"
                                    label="Urine output (ml)"
                                    error={errors.urine_output_ml}
                                >
                                    <input
                                        id="urine_output_ml"
                                        type="number"
                                        min={0}
                                        inputMode="numeric"
                                        value={form.data.urine_output_ml}
                                        onChange={(e) =>
                                            form.setData(
                                                'urine_output_ml',
                                                e.target.value,
                                            )
                                        }
                                        className={inputCls}
                                    />
                                </Field>
                                <Field
                                    id="counts_correct"
                                    label="Swab, sharps and instrument counts"
                                    required
                                    error={errors.counts_correct}
                                >
                                    <select
                                        id="counts_correct"
                                        value={form.data.counts_correct}
                                        onChange={(e) =>
                                            form.setData(
                                                'counts_correct',
                                                e.target.value,
                                            )
                                        }
                                        className={inputCls}
                                        aria-invalid={!!errors.counts_correct}
                                    >
                                        <option value="">Select…</option>
                                        {COUNTS.map(([v, l]) => (
                                            <option key={v} value={v}>
                                                {l}
                                            </option>
                                        ))}
                                    </select>
                                </Field>
                            </div>
                        </Section>

                        {/* 7 · Specimens */}
                        <Section
                            n={7}
                            title="Specimens removed"
                            hint="Tissue or fluid sent to pathology or culture. Leave empty if none."
                        >
                            {form.data.specimens.map((s, i) => (
                                <div
                                    key={i}
                                    className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]"
                                >
                                    <Field
                                        id={`specimens.${i}.description`}
                                        label={`Specimen ${i + 1}`}
                                        error={
                                            errors[`specimens.${i}.description`]
                                        }
                                    >
                                        <input
                                            id={`specimens.${i}.description`}
                                            value={s.description}
                                            onChange={(e) =>
                                                updateSpecimen(
                                                    i,
                                                    'description',
                                                    e.target.value,
                                                )
                                            }
                                            className={inputCls}
                                        />
                                    </Field>
                                    <Field
                                        id={`specimens.${i}.destination`}
                                        label="Sent to"
                                        error={
                                            errors[`specimens.${i}.destination`]
                                        }
                                    >
                                        <input
                                            id={`specimens.${i}.destination`}
                                            value={s.destination}
                                            onChange={(e) =>
                                                updateSpecimen(
                                                    i,
                                                    'destination',
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="Histology, microbiology…"
                                            className={inputCls}
                                        />
                                    </Field>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        aria-label={`Remove specimen ${i + 1}`}
                                        onClick={() =>
                                            form.setData(
                                                'specimens',
                                                form.data.specimens.filter(
                                                    (_, idx) => idx !== i,
                                                ),
                                            )
                                        }
                                    >
                                        <Trash2
                                            className="h-4 w-4 text-red-700"
                                            aria-hidden="true"
                                        />
                                    </Button>
                                </div>
                            ))}
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                    form.setData('specimens', [
                                        ...form.data.specimens,
                                        { description: '', destination: '' },
                                    ])
                                }
                            >
                                <Plus
                                    className="mr-1 h-4 w-4"
                                    aria-hidden="true"
                                />
                                Add specimen
                            </Button>
                        </Section>

                        {/* 8 · Complications */}
                        <Section n={8} title="Complications">
                            <label className="flex items-center gap-2 text-sm text-slate-800">
                                <input
                                    type="checkbox"
                                    checked={!form.data.complications_occurred}
                                    onChange={(e) =>
                                        form.setData(
                                            'complications_occurred',
                                            !e.target.checked,
                                        )
                                    }
                                    className="h-4 w-4 rounded border-slate-400 text-blue-600 focus:ring-blue-600"
                                />
                                No complications
                            </label>
                            {form.data.complications_occurred && (
                                <Field
                                    id="complications"
                                    label="Describe the complication and action taken"
                                    required
                                    error={errors.complications}
                                >
                                    {textarea(
                                        'complications',
                                        form.data.complications,
                                        (v) => form.setData('complications', v),
                                        3,
                                    )}
                                </Field>
                            )}
                        </Section>

                        {/* 9 · Post-operative plan */}
                        <Section n={9} title="Post-operative plan">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field
                                    id="post_op_plan.monitoring"
                                    label="Monitoring (vital signs)"
                                    required
                                    error={errors['post_op_plan.monitoring']}
                                >
                                    {textarea(
                                        'post_op_plan.monitoring',
                                        form.data.post_op_plan.monitoring,
                                        (v) => setPlan('monitoring', v),
                                        2,
                                        'e.g. Vitals every 15 min for 1 hour, then hourly',
                                    )}
                                </Field>
                                <Field
                                    id="post_op_plan.medications"
                                    label="Medications"
                                    required
                                    hint="Antibiotics, DVT prophylaxis, analgesia."
                                    error={errors['post_op_plan.medications']}
                                >
                                    {textarea(
                                        'post_op_plan.medications',
                                        form.data.post_op_plan.medications,
                                        (v) => setPlan('medications', v),
                                        2,
                                    )}
                                </Field>
                                <Field
                                    id="post_op_plan.activity"
                                    label="Activity"
                                    error={errors['post_op_plan.activity']}
                                >
                                    {textarea(
                                        'post_op_plan.activity',
                                        form.data.post_op_plan.activity,
                                        (v) => setPlan('activity', v),
                                        2,
                                    )}
                                </Field>
                                <Field
                                    id="post_op_plan.diet"
                                    label="Diet"
                                    error={errors['post_op_plan.diet']}
                                >
                                    {textarea(
                                        'post_op_plan.diet',
                                        form.data.post_op_plan.diet,
                                        (v) => setPlan('diet', v),
                                        2,
                                    )}
                                </Field>
                                <Field
                                    id="post_op_plan.iv_fluids"
                                    label="Intravenous fluids"
                                    error={errors['post_op_plan.iv_fluids']}
                                >
                                    {textarea(
                                        'post_op_plan.iv_fluids',
                                        form.data.post_op_plan.iv_fluids,
                                        (v) => setPlan('iv_fluids', v),
                                        2,
                                    )}
                                </Field>
                                <Field
                                    id="post_op_plan.drains_dressings"
                                    label="Drains, tubes and dressings"
                                    error={
                                        errors['post_op_plan.drains_dressings']
                                    }
                                >
                                    {textarea(
                                        'post_op_plan.drains_dressings',
                                        form.data.post_op_plan.drains_dressings,
                                        (v) => setPlan('drains_dressings', v),
                                        2,
                                    )}
                                </Field>
                            </div>
                        </Section>

                        {/* 10 · Sign-off */}
                        <Section
                            n={10}
                            title="Sign-off"
                            hint="Signing records your name, the date and the time. Signed notes cannot be edited."
                        >
                            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                                <ReadOnlyValue
                                    label="Surgeon"
                                    value={currentUser.name}
                                />
                                <ReadOnlyValue
                                    label="Grade / title"
                                    value={currentUser.title}
                                />
                                <ReadOnlyValue
                                    label="Date and time"
                                    value={new Date(
                                        note?.signed_at ?? Date.now(),
                                    ).toLocaleString()}
                                />
                            </dl>
                            <Field
                                id="registration_number"
                                label="Registration / licence number"
                                required
                                error={errors.registration_number}
                                className="sm:max-w-xs"
                            >
                                <input
                                    id="registration_number"
                                    value={form.data.registration_number}
                                    onChange={(e) =>
                                        form.setData(
                                            'registration_number',
                                            e.target.value,
                                        )
                                    }
                                    className={inputCls}
                                    aria-invalid={!!errors.registration_number}
                                />
                            </Field>
                        </Section>
                    </fieldset>

                    {/* Sticky action bar */}
                    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 p-3 backdrop-blur">
                        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
                            <Link
                                href="/theater"
                                className="text-sm text-slate-700 underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                            >
                                {readOnly ? 'Back to theater' : 'Cancel'}
                            </Link>
                            {!readOnly && (
                                <div className="flex gap-2">
                                    <Button
                                        type="submit"
                                        variant="outline"
                                        disabled={form.processing}
                                    >
                                        Save draft
                                    </Button>
                                    <Button
                                        type="button"
                                        disabled={form.processing}
                                        onClick={() => setConfirmSign(true)}
                                    >
                                        Sign and submit
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </form>
            </div>

            <Dialog
                open={confirmSign}
                onOpenChange={(o) => !form.processing && setConfirmSign(o)}
            >
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Sign this operative note?</DialogTitle>
                        <DialogDescription>
                            It will be recorded under your name with the current
                            date and time. Signed notes can’t be edited.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setConfirmSign(false)}
                            disabled={form.processing}
                        >
                            Keep editing
                        </Button>
                        <Button
                            onClick={() => submit('sign')}
                            disabled={form.processing}
                        >
                            {form.processing ? 'Signing…' : 'Sign note'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
