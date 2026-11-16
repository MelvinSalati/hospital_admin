import {
    AlertTriangle,
    CheckCircle2,
    Plus,
    Scissors,
    Trash2,
} from 'lucide-react';
import Notiflix from 'notiflix';
import { useMemo, useState, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import Http from '@/utils/Http';

// ─── Types ────────────────────────────────────────────────────

interface Props {
    open: boolean;
    /** theater_order_items.id */
    orderId: number;
    /** The clicked order row. */
    order?: { service_name?: string | null } | null;
    onClose: () => void;
    onSaved?: () => void;
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

interface NoteMeta {
    id: number;
    status: 'draft' | 'signed';
    signed_at: string | null;
}

// ─── Constants & helpers ──────────────────────────────────────

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

function buildForm(orderId: number, procedure?: string | null) {
    return {
        theater_order_item_id: orderId,

        operation_date: new Date().toISOString().slice(0, 10),
        start_time: '',
        end_time: '',
        theatre: '',

        preoperative_diagnosis: '',
        postoperative_diagnosis: '',
        procedure_performed: procedure ?? '',
        anaesthesia_type: '',

        procedure_details: '',
        findings: '',

        ebl_ml: '',
        fluids_ml: '',
        urine_output_ml: '',
        counts_correct: '',

        specimens: [] as Specimen[],
        complications_occurred: false,
        complications: '',

        post_op_plan: { ...emptyPlan } as PostOpPlan,

        registration_number: '',
    };
}

type FormState = ReturnType<typeof buildForm>;

/** Laravel 422 → { 'field.path': 'first message' } */
function flattenErrors(raw: unknown): Record<string, string> {
    const out: Record<string, string> = {};
    Object.entries((raw ?? {}) as Record<string, unknown>).forEach(([k, v]) => {
        out[k] = Array.isArray(v) ? String(v[0]) : String(v);
    });
    return out;
}

// ─── Small presentational pieces ──────────────────────────────

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
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <header className="mb-4">
                <h3 className="text-sm font-semibold text-slate-900">
                    <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[11px] font-semibold text-blue-800">
                        {n}
                    </span>
                    {title}
                </h3>
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

// ─── Modal ────────────────────────────────────────────────────

export default function OperativeNoteModal({
    open,
    orderId,
    order,
    onClose,
    onSaved,
}: Props) {
    const procedure = order?.service_name ?? null;

    const [form, setForm] = useState<FormState>(() =>
        buildForm(orderId, procedure),
    );
    const [note, setNote] = useState<NoteMeta | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState(false);
    const [confirmSign, setConfirmSign] = useState(false);

    const readOnly = note?.status === 'signed';
    const errorEntries = useMemo(() => Object.entries(errors), [errors]);

    function set<K extends keyof FormState>(key: K, value: FormState[K]) {
        setForm((f) => ({ ...f, [key]: value }));
    }

    const setPlan = (k: keyof PostOpPlan, v: string) =>
        set('post_op_plan', { ...form.post_op_plan, [k]: v });

    const updateSpecimen = (i: number, k: keyof Specimen, v: string) =>
        set(
            'specimens',
            form.specimens.map((s, idx) => (idx === i ? { ...s, [k]: v } : s)),
        );

    const focusField = (key: string) => {
        const el = document.getElementById(key);
        el?.scrollIntoView({ block: 'center' });
        el?.focus();
    };

    const submit = async (action: 'draft' | 'sign') => {
        if (processing) return;

        if (!orderId) {
            Notiflix.Notify.failure('No procedure selected for this note.');
            return;
        }

        setProcessing(true);
        setErrors({});

        try {
            const body = {
                ...form,
                theater_order_item_id: orderId,
                action,
                ...(note ? { _method: 'PUT' } : {}),
            };
            const url = note
                ? `theater/op-notes/${note.id}`
                : 'theater/op-notes';
            const res: any = await Http.post(url, body);

            setNote(res.data?.note ?? note);
            Notiflix.Notify.success(
                res.data?.message ||
                    (action === 'sign'
                        ? 'Operative note signed.'
                        : 'Draft saved.'),
            );
            onSaved?.();

            if (action === 'sign') {
                onClose();
            }
        } catch (err: any) {
            const data = err?.response?.data;

            if (err?.response?.status === 422) {
                setErrors(flattenErrors(data?.errors));
            } else {
                Notiflix.Notify.failure(
                    data?.message || 'Failed to save the operative note.',
                );
            }
        } finally {
            setProcessing(false);
            setConfirmSign(false);
        }
    };

    // ── field builders ──
    const textarea = (
        id: string,
        value: string,
        onChange: (v: string) => void,
        rows = 3,
        placeholder?: string,
    ) => (
        <textarea
            id={id}
            value={value}
            rows={rows}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
            aria-invalid={!!errors[id]}
            aria-describedby={errors[id] ? `${id}-error` : undefined}
            className={`${inputCls} resize-y`}
        />
    );

    const simpleInput = (
        id: keyof FormState & string,
        type: 'text' | 'date' | 'time' | 'number' = 'text',
    ) => (
        <input
            id={id}
            type={type}
            min={type === 'number' ? 0 : undefined}
            inputMode={type === 'number' ? 'numeric' : undefined}
            value={String(form[id] ?? '')}
            onChange={(e) => set(id, e.target.value as never)}
            aria-invalid={!!errors[id]}
            aria-describedby={errors[id] ? `${id}-error` : undefined}
            className={inputCls}
        />
    );

    return (
        <Dialog
            open={open}
            onOpenChange={(o) => {
                if (!o && !processing) onClose();
            }}
        >
            <DialogContent className="flex max-h-[92vh] flex-col gap-0 overflow-hidden bg-blue-50 p-0 sm:max-w-4xl">
                <DialogHeader className="border-b border-slate-200 bg-white px-5 py-4">
                    <DialogTitle className="flex items-center gap-2 text-base">
                        <Scissors
                            className="h-5 w-5 text-blue-700"
                            aria-hidden="true"
                        />
                        Operative note
                    </DialogTitle>
                    <DialogDescription>
                        {procedure ? `${procedure} — ` : ''}
                        Document what was done, what was found and the immediate
                        recovery plan.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 space-y-4 overflow-y-auto p-4">
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
                        disabled={readOnly || processing}
                        className="min-w-0 space-y-4 border-0 p-0"
                    >
                        {/* 1 · Date, time, location */}
                        <Section n={1} title="Date, time and location">
                            <div className="grid gap-4 sm:grid-cols-4">
                                <Field
                                    id="operation_date"
                                    label="Date of operation"
                                    required
                                    error={errors.operation_date}
                                >
                                    {simpleInput('operation_date', 'date')}
                                </Field>
                                <Field
                                    id="start_time"
                                    label="Start time"
                                    required
                                    error={errors.start_time}
                                >
                                    {simpleInput('start_time', 'time')}
                                </Field>
                                <Field
                                    id="end_time"
                                    label="End time"
                                    required
                                    error={errors.end_time}
                                >
                                    {simpleInput('end_time', 'time')}
                                </Field>
                                <Field
                                    id="theatre"
                                    label="Theatre"
                                    error={errors.theatre}
                                >
                                    {simpleInput('theatre')}
                                </Field>
                            </div>
                        </Section>

                        {/* 2 · Diagnosis, procedure, anaesthesia */}
                        <Section
                            n={2}
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
                                    form.preoperative_diagnosis,
                                    (v) => set('preoperative_diagnosis', v),
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
                                    form.postoperative_diagnosis,
                                    (v) => set('postoperative_diagnosis', v),
                                    2,
                                )}
                            </Field>
                            <Field
                                id="procedure_performed"
                                label="Procedure performed"
                                required
                                hint={
                                    procedure
                                        ? `Ordered: ${procedure}. List multiple procedures by priority.`
                                        : 'List multiple procedures by priority.'
                                }
                                error={errors.procedure_performed}
                            >
                                {textarea(
                                    'procedure_performed',
                                    form.procedure_performed,
                                    (v) => set('procedure_performed', v),
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
                                    value={form.anaesthesia_type}
                                    onChange={(e) =>
                                        set('anaesthesia_type', e.target.value)
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

                        {/* 3 · Narrative and findings */}
                        <Section
                            n={3}
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
                                    form.procedure_details,
                                    (v) => set('procedure_details', v),
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
                                    form.findings,
                                    (v) => set('findings', v),
                                    4,
                                )}
                            </Field>
                        </Section>

                        {/* 4 · Metrics */}
                        <Section n={4} title="Quantified metrics">
                            <div className="grid gap-4 sm:grid-cols-4">
                                <Field
                                    id="ebl_ml"
                                    label="Estimated blood loss (ml)"
                                    required
                                    error={errors.ebl_ml}
                                >
                                    {simpleInput('ebl_ml', 'number')}
                                </Field>
                                <Field
                                    id="fluids_ml"
                                    label="Fluids given (ml)"
                                    error={errors.fluids_ml}
                                >
                                    {simpleInput('fluids_ml', 'number')}
                                </Field>
                                <Field
                                    id="urine_output_ml"
                                    label="Urine output (ml)"
                                    error={errors.urine_output_ml}
                                >
                                    {simpleInput('urine_output_ml', 'number')}
                                </Field>
                                <Field
                                    id="counts_correct"
                                    label="Swab, sharps and instrument counts"
                                    required
                                    error={errors.counts_correct}
                                >
                                    <select
                                        id="counts_correct"
                                        value={form.counts_correct}
                                        onChange={(e) =>
                                            set(
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

                        {/* 5 · Specimens */}
                        <Section
                            n={5}
                            title="Specimens removed"
                            hint="Tissue or fluid sent to pathology or culture. Leave empty if none."
                        >
                            {form.specimens.map((s, i) => (
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
                                            set(
                                                'specimens',
                                                form.specimens.filter(
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
                                    set('specimens', [
                                        ...form.specimens,
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

                        {/* 6 · Complications */}
                        <Section n={6} title="Complications">
                            <label className="flex items-center gap-2 text-sm text-slate-800">
                                <input
                                    type="checkbox"
                                    checked={!form.complications_occurred}
                                    onChange={(e) =>
                                        set(
                                            'complications_occurred',
                                            !e.target.checked,
                                        )
                                    }
                                    className="h-4 w-4 rounded border-slate-400 text-blue-600 focus:ring-blue-600"
                                />
                                No complications
                            </label>
                            {form.complications_occurred && (
                                <Field
                                    id="complications"
                                    label="Describe the complication and action taken"
                                    required
                                    error={errors.complications}
                                >
                                    {textarea(
                                        'complications',
                                        form.complications,
                                        (v) => set('complications', v),
                                        3,
                                    )}
                                </Field>
                            )}
                        </Section>

                        {/* 7 · Post-operative plan */}
                        <Section n={7} title="Post-operative plan">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field
                                    id="post_op_plan.monitoring"
                                    label="Monitoring (vital signs)"
                                    required
                                    error={errors['post_op_plan.monitoring']}
                                >
                                    {textarea(
                                        'post_op_plan.monitoring',
                                        form.post_op_plan.monitoring,
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
                                        form.post_op_plan.medications,
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
                                        form.post_op_plan.activity,
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
                                        form.post_op_plan.diet,
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
                                        form.post_op_plan.iv_fluids,
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
                                        form.post_op_plan.drains_dressings,
                                        (v) => setPlan('drains_dressings', v),
                                        2,
                                    )}
                                </Field>
                            </div>
                        </Section>

                        {/* 8 · Sign-off */}
                        <Section
                            n={8}
                            title="Sign-off"
                            hint="Signing records the date and the time. Signed notes cannot be edited."
                        >
                            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
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
                                {simpleInput('registration_number')}
                            </Field>
                        </Section>
                    </fieldset>
                </div>

                {/* Footer actions */}
                <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-5 py-3">
                    {readOnly ? (
                        <>
                            <span />
                            <Button variant="outline" onClick={onClose}>
                                Close
                            </Button>
                        </>
                    ) : confirmSign ? (
                        <>
                            <p className="text-sm text-slate-700">
                                Sign with the current date and time? Signed
                                notes can’t be edited.
                            </p>
                            <div className="flex shrink-0 gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => setConfirmSign(false)}
                                    disabled={processing}
                                >
                                    Keep editing
                                </Button>
                                <Button
                                    onClick={() => submit('sign')}
                                    disabled={processing}
                                >
                                    {processing ? 'Signing…' : 'Sign note'}
                                </Button>
                            </div>
                        </>
                    ) : (
                        <>
                            <Button
                                variant="ghost"
                                onClick={onClose}
                                disabled={processing}
                            >
                                Cancel
                            </Button>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => submit('draft')}
                                    disabled={processing}
                                >
                                    {processing ? 'Saving…' : 'Save draft'}
                                </Button>
                                <Button
                                    onClick={() => setConfirmSign(true)}
                                    disabled={processing}
                                >
                                    Sign and submit
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
