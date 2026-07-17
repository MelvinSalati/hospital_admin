import { useState } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import Notiflix from 'notiflix';

import {
    AlertTriangle,
    ChevronRight,
    ChevronLeft,
    Save,
    Loader2,
    Plus,
    X,
} from 'lucide-react';
import antenatalTabs from '@/constants/antentalTabs';
import Http from '@/utils/Http';
// ─── Reusable Components ──────────────────────────────────────────────────────

function SectionHeading({ title }: { title: string }) {
    return (
        <h3 className="mt-6 mb-3 border-b pb-1 text-xs font-semibold tracking-widest text-gray-400 uppercase first:mt-0">
            {title}
        </h3>
    );
}

function FieldRow({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div className="grid grid-cols-2 items-center gap-4 py-2">
            <Label className="text-sm text-gray-600">{label}</Label>
            <div>{children}</div>
        </div>
    );
}

function YesNoRadio({
    name,
    value,
    onChange,
    danger = false,
}: {
    name: string;
    value: boolean | null;
    onChange: (val: boolean) => void;
    danger?: boolean;
}) {
    return (
        <div className="flex gap-3">
            {([true, false] as const).map((opt) => (
                <label
                    key={String(opt)}
                    className={`flex cursor-pointer items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-all ${
                        value === opt
                            ? opt && danger
                                ? 'border-red-400 bg-red-50 font-medium text-red-700'
                                : opt
                                  ? 'border-blue-400 bg-blue-50 font-medium text-blue-700'
                                  : 'border-gray-300 bg-gray-50 text-gray-600'
                            : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                >
                    <input
                        type="radio"
                        name={name}
                        className="hidden"
                        checked={value === opt}
                        onChange={() => onChange(opt)}
                    />
                    <span
                        className={`h-2 w-2 rounded-full ${
                            value === opt
                                ? opt && danger
                                    ? 'bg-red-500'
                                    : opt
                                      ? 'bg-blue-500'
                                      : 'bg-gray-400'
                                : 'bg-gray-300'
                        }`}
                    />
                    {opt ? 'Yes' : 'No'}
                </label>
            ))}
        </div>
    );
}

// ─── Form State ───────────────────────────────────────────────────────────────

type FormState = {
    lmp: string;
    edd: string;
    gestational_age_weeks: string;
    gravidity: string;
    parity: string;
    planned_pregnancy: boolean | null;
    previous_cs: boolean | null;
    previous_stillbirth: boolean | null;
    previous_miscarriage: boolean | null;
    previous_preterm: boolean | null;
    previous_pph: boolean | null;
    multiple_gestation_history: boolean | null;
    hypertension: boolean | null;
    diabetes: boolean | null;
    hiv: boolean | null;
    tuberculosis: boolean | null;
    epilepsy: boolean | null;
    asthma: boolean | null;
    cardiac_disease: boolean | null;
    sickle_cell: boolean | null;
    fh_hypertension: boolean | null;
    fh_diabetes: boolean | null;
    fh_multiple_pregnancies: boolean | null;
    fh_genetic_disorders: boolean | null;
    weight: string;
    height: string;
    bmi: string;
    bp_systolic: string;
    bp_diastolic: string;
    temperature: string;
    pulse_rate: string;
    respiratory_rate: string;
    fundal_height: string;
    fetal_heart_rate: string;
    fetal_presentation: string;
    fetal_movement: boolean | null;
    edema: boolean | null;
    vaginal_bleeding: boolean | null;
    severe_headache: boolean | null;
    blurred_vision: boolean | null;
    convulsions: boolean | null;
    reduced_fetal_movement: boolean | null;
    severe_abdominal_pain: boolean | null;
    fever: boolean | null;
    leakage_of_liquor: boolean | null;
};

const initialForm: FormState = {
    lmp: '',
    edd: '',
    gestational_age_weeks: '',
    gravidity: '',
    parity: '',
    planned_pregnancy: null,
    previous_cs: null,
    previous_stillbirth: null,
    previous_miscarriage: null,
    previous_preterm: null,
    previous_pph: null,
    multiple_gestation_history: null,
    hypertension: null,
    diabetes: null,
    hiv: null,
    tuberculosis: null,
    epilepsy: null,
    asthma: null,
    cardiac_disease: null,
    sickle_cell: null,
    fh_hypertension: null,
    fh_diabetes: null,
    fh_multiple_pregnancies: null,
    fh_genetic_disorders: null,
    weight: '',
    height: '',
    bmi: '',
    bp_systolic: '',
    bp_diastolic: '',
    temperature: '',
    pulse_rate: '',
    respiratory_rate: '',
    fundal_height: '',
    fetal_heart_rate: '',
    fetal_presentation: '',
    fetal_movement: null,
    edema: null,
    vaginal_bleeding: null,
    severe_headache: null,
    blurred_vision: null,
    convulsions: null,
    reduced_fetal_movement: null,
    severe_abdominal_pain: null,
    fever: null,
    leakage_of_liquor: null,
};

function calcBmi(weight: string, height: string): string {
    const w = parseFloat(weight);
    const h = parseFloat(height) / 100;
    if (!w || !h || h === 0) return '';
    return (w / (h * h)).toFixed(1);
}

// ─── Danger Alert ─────────────────────────────────────────────────────────────

function DangerAlert() {
    return (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
            <div>
                <p className="font-semibold">Danger Sign Detected</p>
                <p className="mt-0.5 text-xs text-red-600">
                    One or more danger signs are present. Consider immediate
                    referral and initiate emergency management pathway.
                </p>
            </div>
        </div>
    );
}

// ─── Tab Panels ───────────────────────────────────────────────────────────────

function PregnancyInfoTab({
    form,
    set,
}: {
    form: FormState;
    set: (k: keyof FormState, v: any) => void;
}) {
    const handleLmpChange = (lmp: string) => {
        set('lmp', lmp);
        if (lmp) {
            const lmpDate = new Date(lmp);
            const edd = new Date(lmpDate);
            edd.setDate(edd.getDate() + 280);
            set('edd', edd.toISOString().split('T')[0]);
            const diff = Math.floor(
                (Date.now() - lmpDate.getTime()) / (1000 * 60 * 60 * 24 * 7),
            );
            set('gestational_age_weeks', String(diff > 0 ? diff : ''));
        }
    };

    return (
        <div>
            <SectionHeading title="Gestational Dating" />
            <FieldRow label="Last Menstrual Period (LMP)">
                <Input
                    type="date"
                    value={form.lmp}
                    onChange={(e) => handleLmpChange(e.target.value)}
                />
            </FieldRow>
            <FieldRow label="Estimated Date of Delivery (EDD)">
                <Input
                    type="date"
                    value={form.edd}
                    onChange={(e) => set('edd', e.target.value)}
                />
            </FieldRow>
            <FieldRow label="Gestational Age (weeks)">
                <Input
                    type="number"
                    min={1}
                    max={42}
                    placeholder="e.g. 12"
                    value={form.gestational_age_weeks}
                    onChange={(e) =>
                        set('gestational_age_weeks', e.target.value)
                    }
                />
            </FieldRow>
            <SectionHeading title="Obstetric Score" />
            <FieldRow label="Gravidity (G)">
                <Input
                    type="number"
                    min={0}
                    placeholder="Total pregnancies"
                    value={form.gravidity}
                    onChange={(e) => set('gravidity', e.target.value)}
                />
            </FieldRow>
            <FieldRow label="Parity (P)">
                <Input
                    type="number"
                    min={0}
                    placeholder="Deliveries ≥ 20 weeks"
                    value={form.parity}
                    onChange={(e) => set('parity', e.target.value)}
                />
            </FieldRow>
            <SectionHeading title="Pregnancy Intent" />
            <FieldRow label="Was this pregnancy planned?">
                <YesNoRadio
                    name="planned_pregnancy"
                    value={form.planned_pregnancy}
                    onChange={(v) => set('planned_pregnancy', v)}
                />
            </FieldRow>
        </div>
    );
}

function RiskAssessmentTab({
    form,
    set,
}: {
    form: FormState;
    set: (k: keyof FormState, v: any) => void;
}) {
    return (
        <div>
            <SectionHeading title="Obstetric History" />
            {(
                [
                    ['previous_cs', 'Previous Caesarean Section'],
                    ['previous_stillbirth', 'Previous Stillbirth'],
                    ['previous_miscarriage', 'Previous Miscarriage'],
                    ['previous_preterm', 'Previous Preterm Delivery'],
                    ['previous_pph', 'Previous Postpartum Haemorrhage'],
                    [
                        'multiple_gestation_history',
                        'Multiple Gestation History',
                    ],
                ] as [keyof FormState, string][]
            ).map(([key, label]) => (
                <FieldRow key={key} label={label}>
                    <YesNoRadio
                        name={key}
                        value={form[key] as boolean | null}
                        onChange={(v) => set(key, v)}
                    />
                </FieldRow>
            ))}
            <SectionHeading title="Medical History" />
            {(
                [
                    ['hypertension', 'Hypertension'],
                    ['diabetes', 'Diabetes Mellitus'],
                    ['hiv', 'HIV Positive'],
                    ['tuberculosis', 'Tuberculosis (TB)'],
                    ['epilepsy', 'Epilepsy'],
                    ['asthma', 'Asthma'],
                    ['cardiac_disease', 'Cardiac Disease'],
                    ['sickle_cell', 'Sickle Cell Disease'],
                ] as [keyof FormState, string][]
            ).map(([key, label]) => (
                <FieldRow key={key} label={label}>
                    <YesNoRadio
                        name={key}
                        value={form[key] as boolean | null}
                        onChange={(v) => set(key, v)}
                    />
                </FieldRow>
            ))}
            <SectionHeading title="Family History" />
            {(
                [
                    ['fh_hypertension', 'Hypertension'],
                    ['fh_diabetes', 'Diabetes'],
                    ['fh_multiple_pregnancies', 'Multiple Pregnancies'],
                    ['fh_genetic_disorders', 'Genetic Disorders'],
                ] as [keyof FormState, string][]
            ).map(([key, label]) => (
                <FieldRow key={key} label={label}>
                    <YesNoRadio
                        name={key}
                        value={form[key] as boolean | null}
                        onChange={(v) => set(key, v)}
                    />
                </FieldRow>
            ))}
        </div>
    );
}

function PhysicalExamTab({
    form,
    set,
}: {
    form: FormState;
    set: (k: keyof FormState, v: any) => void;
}) {
    const handleVitalChange = (key: keyof FormState, val: string) => {
        set(key, val);
        if (key === 'weight' || key === 'height') {
            set(
                'bmi',
                calcBmi(
                    key === 'weight' ? val : form.weight,
                    key === 'height' ? val : form.height,
                ),
            );
        }
    };

    return (
        <div>
            <SectionHeading title="General Examination" />
            <FieldRow label="Weight (kg)">
                <Input
                    type="number"
                    placeholder="kg"
                    value={form.weight}
                    onChange={(e) =>
                        handleVitalChange('weight', e.target.value)
                    }
                />
            </FieldRow>
            <FieldRow label="Height (cm)">
                <Input
                    type="number"
                    placeholder="cm"
                    value={form.height}
                    onChange={(e) =>
                        handleVitalChange('height', e.target.value)
                    }
                />
            </FieldRow>
            <FieldRow label="BMI (auto-calculated)">
                <Input
                    readOnly
                    value={form.bmi}
                    placeholder="—"
                    className="cursor-not-allowed bg-gray-50 text-gray-500"
                />
            </FieldRow>
            <FieldRow label="Blood Pressure (mmHg)">
                <div className="flex items-center gap-2">
                    <Input
                        type="number"
                        placeholder="Systolic"
                        value={form.bp_systolic}
                        onChange={(e) => set('bp_systolic', e.target.value)}
                    />
                    <span className="text-gray-400">/</span>
                    <Input
                        type="number"
                        placeholder="Diastolic"
                        value={form.bp_diastolic}
                        onChange={(e) => set('bp_diastolic', e.target.value)}
                    />
                </div>
            </FieldRow>
            <FieldRow label="Temperature (°C)">
                <Input
                    type="number"
                    step="0.1"
                    placeholder="°C"
                    value={form.temperature}
                    onChange={(e) => set('temperature', e.target.value)}
                />
            </FieldRow>
            <FieldRow label="Pulse Rate (bpm)">
                <Input
                    type="number"
                    placeholder="bpm"
                    value={form.pulse_rate}
                    onChange={(e) => set('pulse_rate', e.target.value)}
                />
            </FieldRow>
            <FieldRow label="Respiratory Rate (breaths/min)">
                <Input
                    type="number"
                    placeholder="breaths/min"
                    value={form.respiratory_rate}
                    onChange={(e) => set('respiratory_rate', e.target.value)}
                />
            </FieldRow>
            <SectionHeading title="Obstetric Examination" />
            <FieldRow label="Fundal Height (cm)">
                <Input
                    type="number"
                    placeholder="cm"
                    value={form.fundal_height}
                    onChange={(e) => set('fundal_height', e.target.value)}
                />
            </FieldRow>
            <FieldRow label="Fetal Heart Rate (bpm)">
                <Input
                    type="number"
                    placeholder="bpm"
                    value={form.fetal_heart_rate}
                    onChange={(e) => set('fetal_heart_rate', e.target.value)}
                />
            </FieldRow>
            <FieldRow label="Fetal Presentation">
                <select
                    value={form.fetal_presentation}
                    onChange={(e) => set('fetal_presentation', e.target.value)}
                    className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                    <option value="">— Select —</option>
                    <option value="cephalic">Cephalic</option>
                    <option value="breech">Breech</option>
                    <option value="transverse">Transverse</option>
                    <option value="oblique">Oblique</option>
                </select>
            </FieldRow>
            <FieldRow label="Fetal Movement Present">
                <YesNoRadio
                    name="fetal_movement"
                    value={form.fetal_movement}
                    onChange={(v) => set('fetal_movement', v)}
                />
            </FieldRow>
            <FieldRow label="Presence of Oedema">
                <YesNoRadio
                    name="edema"
                    value={form.edema}
                    onChange={(v) => set('edema', v)}
                />
            </FieldRow>
        </div>
    );
}

function DangerSignsTab({
    form,
    set,
}: {
    form: FormState;
    set: (k: keyof FormState, v: any) => void;
}) {
    const dangerFields: [keyof FormState, string][] = [
        ['vaginal_bleeding', 'Vaginal Bleeding'],
        ['severe_headache', 'Severe Headache'],
        ['blurred_vision', 'Blurred Vision'],
        ['convulsions', 'Convulsions'],
        ['reduced_fetal_movement', 'Reduced Fetal Movement'],
        ['severe_abdominal_pain', 'Severe Abdominal Pain'],
        ['fever', 'Fever'],
        ['leakage_of_liquor', 'Leakage of Liquor'],
    ];
    const anyDanger = dangerFields.some(([key]) => form[key] === true);

    return (
        <div>
            <p className="mb-4 text-sm text-gray-500">
                Screen for urgent maternal complications requiring immediate
                action.
            </p>
            {anyDanger && <DangerAlert />}
            <SectionHeading title="Maternal Danger Signs" />
            {dangerFields.map(([key, label]) => (
                <FieldRow key={key} label={label}>
                    <YesNoRadio
                        name={key}
                        value={form[key] as boolean | null}
                        onChange={(v) => set(key, v)}
                        danger
                    />
                </FieldRow>
            ))}
        </div>
    );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

interface Props {
    patientId: number;
}

export default function ANCScreeningModal({ patientId }: Props) {
    const [open, setOpen] = useState(false);
    const [activeTab, setActiveTab] = useState(antenatalTabs[0].key);
    const [form, setForm] = useState<FormState>(initialForm);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const set = (key: keyof FormState, value: any) =>
        setForm((prev) => ({ ...prev, [key]: value }));

    const currentIndex = antenatalTabs.findIndex((t) => t.key === activeTab);
    const isFirst = currentIndex === 0;
    const isLast = currentIndex === antenatalTabs.length - 1;

    const hasDangerSign = (
        [
            'vaginal_bleeding',
            'severe_headache',
            'blurred_vision',
            'convulsions',
            'reduced_fetal_movement',
            'severe_abdominal_pain',
            'fever',
            'leakage_of_liquor',
        ] as (keyof FormState)[]
    ).some((k) => form[k] === true);

    const handleClose = () => {
        setOpen(false);
        setForm(initialForm);
        setActiveTab(antenatalTabs[0].key);
        setSubmitError(null);
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        setSubmitError(null);
        try {
            const response = await Http.post('/antenatal/initial-screening', {
                patient_id: patientId,
                ...form,
            });
            if (response.status === 200) {
                Notiflix.Notify.success(
                    response.data.message ||
                        'Initial antenatal screening saved successfully',
                );
            } else {
                Notiflix.Notify.failure(
                    response.data.message ||
                        'Failed to save screening. Please try again.',
                );
            }
            handleClose();
        } catch (err: any) {
            setSubmitError(
                err?.response?.data?.message ??
                    'Submission failed. Please try again.',
            );
        } finally {
            setSubmitting(false);
        }
    };

    const renderTab = () => {
        switch (activeTab) {
            case 'pregnancy':
                return <PregnancyInfoTab form={form} set={set} />;
            case 'risk':
                return <RiskAssessmentTab form={form} set={set} />;
            case 'examination':
                return <PhysicalExamTab form={form} set={set} />;
            case 'danger':
                return <DangerSignsTab form={form} set={set} />;
            default:
                return null;
        }
    };

    return (
        <>
            {/* Trigger */}
            <Button onClick={() => setOpen(true)} size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" />
                New ANC Screening
            </Button>

            {/* Overlay + Modal */}
            {open && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{
                        backgroundColor: 'rgba(0,0,0,0.45)',
                        backdropFilter: 'blur(4px)',
                    }}
                >
                    <div className="flex h-[92vh] !w-[800px] max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                        {/* ── Header ─────────────────────────────────────── */}
                        <div className="flex flex-shrink-0 items-center justify-between border-b bg-white px-6 py-4">
                            <div>
                                <h2 className="text-base font-semibold text-gray-900">
                                    Initial ANC Screening
                                </h2>
                                <p className="mt-0.5 text-xs text-gray-400">
                                    Booking Visit · Antenatal Care
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                {hasDangerSign && (
                                    <Badge
                                        variant="destructive"
                                        className="flex items-center gap-1 text-xs"
                                    >
                                        <AlertTriangle className="h-3 w-3" />
                                        Danger Sign Present
                                    </Badge>
                                )}
                                <button
                                    onClick={handleClose}
                                    className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        {/* ── Tab Bar ────────────────────────────────────── */}
                        <nav className="flex flex-shrink-0 items-center gap-1 overflow-x-auto border-b bg-gray-50 px-4 py-2">
                            {antenatalTabs.map((tab) => {
                                const isDanger =
                                    tab.key === 'danger' && hasDangerSign;
                                const isActive = activeTab === tab.key;
                                return (
                                    <button
                                        key={tab.key}
                                        onClick={() => setActiveTab(tab.key)}
                                        className={`flex shrink-0 items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                                            isActive
                                                ? 'bg-white text-blue-600 shadow-sm ring-1 ring-gray-200'
                                                : isDanger
                                                  ? 'text-red-500 hover:bg-red-50'
                                                  : 'text-gray-500 hover:bg-white hover:text-gray-800'
                                        }`}
                                    >
                                        <span
                                            className={
                                                isActive
                                                    ? 'text-blue-500'
                                                    : isDanger
                                                      ? 'text-red-400'
                                                      : 'text-gray-400'
                                            }
                                        >
                                            {tab.icon}
                                        </span>
                                        {tab.title}
                                        {isDanger && (
                                            <span className="h-2 w-2 rounded-full bg-red-500" />
                                        )}
                                    </button>
                                );
                            })}
                        </nav>

                        {/* ── Form Body ──────────────────────────────────── */}
                        <div className="min-h-0 flex-1 overflow-y-auto bg-white px-10 py-6">
                            {renderTab()}
                        </div>

                        {/* ── Footer ─────────────────────────────────────── */}
                        <div className="flex flex-shrink-0 items-center justify-between border-t bg-gray-50 px-6 py-3">
                            <p className="text-xs text-gray-400">
                                Step {currentIndex + 1} of{' '}
                                {antenatalTabs.length} —{' '}
                                {antenatalTabs[currentIndex]?.title}
                            </p>

                            {submitError && (
                                <p className="text-xs text-red-500">
                                    {submitError}
                                </p>
                            )}

                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={isFirst}
                                    onClick={() =>
                                        setActiveTab(
                                            antenatalTabs[currentIndex - 1].key,
                                        )
                                    }
                                >
                                    <ChevronLeft className="mr-1 h-4 w-4" />{' '}
                                    Previous
                                </Button>

                                {!isLast ? (
                                    <Button
                                        size="sm"
                                        onClick={() =>
                                            setActiveTab(
                                                antenatalTabs[currentIndex + 1]
                                                    .key,
                                            )
                                        }
                                    >
                                        Next{' '}
                                        <ChevronRight className="ml-1 h-4 w-4" />
                                    </Button>
                                ) : (
                                    <Button
                                        size="sm"
                                        onClick={handleSubmit}
                                        disabled={submitting}
                                    >
                                        {submitting ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />{' '}
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="mr-2 h-4 w-4" />{' '}
                                                Save Screening
                                            </>
                                        )}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
