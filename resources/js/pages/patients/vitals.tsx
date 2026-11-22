import { usePage, router } from '@inertiajs/react';
import { format } from 'date-fns';
import {
    Activity,
    AlertTriangle,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Clock,
    Droplet,
    Droplets,
    Gauge,
    Heart,
    HeartPulse,
    Plus,
    Ruler,
    Save,
    Scale,
    Search,
    Stethoscope,
    Thermometer,
    User,
    Wind,
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import PatientLayout from '@/layouts/patients/PatientLayout';
import Http from '@/utils/Http';

// ============================================================
// 1. UTILITY FUNCTIONS
// ============================================================

const num = (value) => {
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : null;
};

const formatVitalValue = (value) => {
    if (
        value === null ||
        value === undefined ||
        value === '' ||
        value === '--'
    ) {
        return '—';
    }
    return value;
};

const calculateBMI = (heightCm, weightKg) => {
    if (!heightCm || !weightKg || heightCm <= 0 || weightKg <= 0) {
        return null;
    }
    const heightM = heightCm / 100;
    const bmi = weightKg / (heightM * heightM);
    return Math.round(bmi * 100) / 100;
};

const getVitalDate = (vital) => vital?.recorded_at || vital?.created_at;

const sortVitalsDesc = (vitals) =>
    [...(vitals || [])].sort(
        (a, b) => new Date(getVitalDate(b)) - new Date(getVitalDate(a)),
    );

const formatDate = (date) => {
    if (!date) return '—';
    try {
        return format(new Date(date), 'dd-MMM-yyyy');
    } catch {
        return '—';
    }
};

const formatTime = (date) => {
    if (!date) return '—';
    try {
        return format(new Date(date), 'HH:mm');
    } catch {
        return '—';
    }
};

// ------------------------------------------------------------
// Clinical status (adult reference ranges — visual aid only)
// ------------------------------------------------------------

const LEVEL_STYLES = {
    normal: {
        text: 'text-emerald-700',
        soft: 'bg-emerald-50',
        border: 'border-emerald-200',
        dot: 'bg-emerald-500',
        stroke: '#059669',
    },
    warning: {
        text: 'text-amber-700',
        soft: 'bg-amber-50',
        border: 'border-amber-200',
        dot: 'bg-amber-500',
        stroke: '#d97706',
    },
    critical: {
        text: 'text-red-700',
        soft: 'bg-red-50',
        border: 'border-red-200',
        dot: 'bg-red-500',
        stroke: '#dc2626',
    },
    none: {
        text: 'text-gray-800',
        soft: 'bg-white',
        border: 'border-gray-200',
        dot: 'bg-gray-300',
        stroke: '#2563eb',
    },
};

const BANDS = {
    temperature: { critLow: 35, warnLow: 36, warnHigh: 37.5, critHigh: 39 },
    pulse_rate: { critLow: 50, warnLow: 60, warnHigh: 100, critHigh: 120 },
    respiratory_rate: { critLow: 9, warnLow: 12, warnHigh: 20, critHigh: 25 },
    spO2: { critLow: 90, warnLow: 95 },
    blood_glucose: { critLow: 54, warnLow: 70, warnHigh: 140, critHigh: 300 },
};

const bandAssess = (value, cfg) => {
    const v = num(value);
    if (v === null) return null;
    if (cfg.critLow !== undefined && v < cfg.critLow)
        return { level: 'critical', label: 'Very low' };
    if (cfg.critHigh !== undefined && v >= cfg.critHigh)
        return { level: 'critical', label: 'Very high' };
    if (cfg.warnLow !== undefined && v < cfg.warnLow)
        return { level: 'warning', label: 'Low' };
    if (cfg.warnHigh !== undefined && v > cfg.warnHigh)
        return { level: 'warning', label: 'High' };
    return { level: 'normal', label: 'Normal' };
};

const assessBP = (systolic, diastolic) => {
    const s = num(systolic);
    const d = num(diastolic);
    if (s === null || d === null) return null;
    if (s >= 180 || d >= 120)
        return { level: 'critical', label: 'Hypertensive crisis' };
    if (s < 80) return { level: 'critical', label: 'Severe low' };
    if (s >= 140 || d >= 90) return { level: 'warning', label: 'High' };
    if (s < 90 || d < 60) return { level: 'warning', label: 'Low' };
    return { level: 'normal', label: 'Normal' };
};

const assessBMI = (bmi) => {
    const v = num(bmi);
    if (v === null) return null;
    if (v < 16) return { level: 'critical', label: 'Severely underweight' };
    if (v < 18.5) return { level: 'warning', label: 'Underweight' };
    if (v < 25) return { level: 'normal', label: 'Normal' };
    if (v < 30) return { level: 'warning', label: 'Overweight' };
    if (v < 40) return { level: 'warning', label: 'Obese' };
    return { level: 'critical', label: 'Severely obese' };
};

const getBMI = (vital) => {
    if (!vital) return null;
    if (vital.bmi) return vital.bmi;
    return calculateBMI(num(vital.height), num(vital.weight));
};

const getBPDisplay = (vital) =>
    vital?.systolic_bp && vital?.diastolic_bp
        ? `${vital.systolic_bp}/${vital.diastolic_bp}`
        : null;

const getReadings = (vital) => {
    if (!vital) return [];
    return [
        {
            key: 'temperature',
            label: 'Temperature',
            value: vital.temperature,
            unit: '°C',
            assessment: bandAssess(vital.temperature, BANDS.temperature),
        },
        {
            key: 'bp',
            label: 'Blood pressure',
            value: getBPDisplay(vital),
            unit: 'mmHg',
            assessment: assessBP(vital.systolic_bp, vital.diastolic_bp),
        },
        {
            key: 'pulse_rate',
            label: 'Pulse',
            value: vital.pulse_rate,
            unit: 'bpm',
            assessment: bandAssess(vital.pulse_rate, BANDS.pulse_rate),
        },
        {
            key: 'respiratory_rate',
            label: 'Resp. rate',
            value: vital.respiratory_rate,
            unit: '/min',
            assessment: bandAssess(
                vital.respiratory_rate,
                BANDS.respiratory_rate,
            ),
        },
        {
            key: 'spO2',
            label: 'SpO₂',
            value: vital.spO2,
            unit: '%',
            assessment: bandAssess(vital.spO2, BANDS.spO2),
        },
        {
            key: 'blood_glucose',
            label: 'Glucose',
            value: vital.blood_glucose,
            unit: 'mg/dL',
            assessment: bandAssess(vital.blood_glucose, BANDS.blood_glucose),
        },
        {
            key: 'bmi',
            label: 'BMI',
            value: getBMI(vital),
            unit: 'kg/m²',
            assessment: assessBMI(getBMI(vital)),
        },
    ];
};

const getAlerts = (vital) =>
    getReadings(vital).filter(
        (r) => r.assessment && r.assessment.level !== 'normal',
    );

const buildSeries = (vitalsAsc, getter) =>
    vitalsAsc
        .map(getter)
        .map(num)
        .filter((n) => n !== null)
        .slice(-8);

// ============================================================
// 2. SUB-COMPONENTS
// ============================================================

const StatusPill = ({ assessment }) => {
    if (!assessment) return null;
    const s = LEVEL_STYLES[assessment.level];
    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${s.border} ${s.soft} ${s.text}`}
        >
            <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
            {assessment.label}
        </span>
    );
};

const Sparkline = ({ data, stroke }) => {
    if (!data || data.length < 2) return null;
    const w = 96;
    const h = 28;
    const pad = 3;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const span = max - min || 1;
    const pts = data.map((v, i) => [
        pad + (i * (w - pad * 2)) / (data.length - 1),
        h - pad - ((v - min) / span) * (h - pad * 2),
    ]);
    const d = pts
        .map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`)
        .join(' ');
    const last = pts[pts.length - 1];

    return (
        <svg
            width={w}
            height={h}
            viewBox={`0 0 ${w} ${h}`}
            className="shrink-0"
            aria-hidden="true"
        >
            <path
                d={d}
                fill="none"
                stroke={stroke}
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <circle cx={last[0]} cy={last[1]} r="2.5" fill={stroke} />
        </svg>
    );
};

const MetricCard = ({
    icon: Icon,
    label,
    value,
    unit,
    assessment,
    trend,
    trendLabel,
}) => {
    const s = LEVEL_STYLES[assessment?.level || 'none'];
    const display = formatVitalValue(value);
    const hasValue = display !== '—';

    return (
        <div
            className={`flex flex-col justify-between rounded-xl border p-4 ${s.border} ${s.soft}`}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-gray-500 uppercase">
                    <Icon className="h-4 w-4 text-gray-400" />
                    {label}
                </div>
                <StatusPill assessment={assessment} />
            </div>

            <div className="mt-3 flex items-end justify-between gap-3">
                <div>
                    <span
                        className={`text-2xl font-semibold ${hasValue ? s.text : 'text-gray-300'}`}
                    >
                        {display}
                    </span>
                    {hasValue && unit && (
                        <span className="ml-1 text-xs text-gray-500">
                            {unit}
                        </span>
                    )}
                </div>
                <div className="flex flex-col items-end">
                    <Sparkline data={trend} stroke={s.stroke} />
                    {trend && trend.length > 1 && (
                        <span className="mt-0.5 text-[10px] text-gray-400">
                            {trendLabel || `last ${trend.length}`}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

const AnthropometryTile = ({ icon: Icon, label, value, unit, assessment }) => {
    const s = LEVEL_STYLES[assessment?.level || 'none'];
    const display = formatVitalValue(value);

    return (
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                <Icon className="h-4 w-4 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
                <div className="text-[11px] font-semibold tracking-wider text-gray-500 uppercase">
                    {label}
                </div>
                <div className={`text-base font-semibold ${s.text}`}>
                    {display}
                    {display !== '—' && unit && (
                        <span className="ml-1 text-xs font-normal text-gray-500">
                            {unit}
                        </span>
                    )}
                </div>
            </div>
            <StatusPill assessment={assessment} />
        </div>
    );
};

const AttentionBanner = ({ alerts }) => {
    if (!alerts || alerts.length === 0) return null;
    const hasCritical = alerts.some((a) => a.assessment.level === 'critical');
    const tone = hasCritical
        ? 'border-red-200 bg-red-50 text-red-800'
        : 'border-amber-200 bg-amber-50 text-amber-800';

    return (
        <div
            className={`mb-4 flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2 text-sm ${tone}`}
        >
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span className="font-medium">Needs attention:</span>
            {alerts.map((a) => (
                <span
                    key={a.key}
                    className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-medium"
                >
                    {a.label} {a.value}
                    {a.unit ? ` ${a.unit}` : ''} · {a.assessment.label}
                </span>
            ))}
        </div>
    );
};

const EmptyState = ({ onAddVital }) => (
    <Card>
        <CardContent className="py-14 text-center">
            <div className="flex flex-col items-center justify-center text-gray-500">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
                    <Heart className="h-8 w-8 text-blue-300" />
                </div>
                <p className="text-lg font-medium text-gray-500">
                    No vital signs recorded
                </p>
                <p className="mt-1 text-sm text-gray-400">
                    This patient has no vital observations yet.
                </p>
                <Button onClick={onAddVital} className="mt-4">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Vital
                </Button>
            </div>
        </CardContent>
    </Card>
);

// ============================================================
// ADD VITAL FORM
// ============================================================

const Field = ({ id, label, error, assessment, children, className = '' }) => (
    <div className={className}>
        <Label htmlFor={id} className="text-xs font-medium text-gray-600">
            {label}
        </Label>
        <div className="mt-1">{children}</div>
        {error ? (
            <p className="mt-0.5 text-xs text-red-500">
                {Array.isArray(error) ? error[0] : error}
            </p>
        ) : assessment && assessment.level !== 'normal' ? (
            <p
                className={`mt-0.5 text-xs font-medium ${LEVEL_STYLES[assessment.level].text}`}
            >
                {assessment.label}
            </p>
        ) : null}
    </div>
);

const FormSection = ({ title, children }) => (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h3 className="mb-3 text-xs font-semibold tracking-wider text-gray-500 uppercase">
            {title}
        </h3>
        {children}
    </div>
);

const AddVitalForm = ({ patientId, onSuccess, onCancel, createdBy }) => {
    const [formData, setFormData] = useState({
        recorded_at: '',
        height: '',
        weight: '',
        bmi: '',
        temperature: '',
        systolic_bp: '',
        diastolic_bp: '',
        pulse_rate: '',
        respiratory_rate: '',
        spO2: '',
        blood_glucose: '',
        notes: '',
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState({});

    const handleAnthropometryChange = (field, value) => {
        const updatedData = { ...formData, [field]: value };

        if (field === 'height' || field === 'weight') {
            const height = parseFloat(
                field === 'height' ? value : formData.height,
            );
            const weight = parseFloat(
                field === 'weight' ? value : formData.weight,
            );

            if (!isNaN(height) && !isNaN(weight) && height > 0 && weight > 0) {
                const calculatedBMI = calculateBMI(height, weight);
                updatedData.bmi =
                    calculatedBMI !== null ? calculatedBMI.toString() : '';
            } else {
                updatedData.bmi = '';
            }
        }

        setFormData(updatedData);
        if (errors[field]) setErrors({ ...errors, [field]: null });
    };

    const handleChange = (field, value) => {
        setFormData({ ...formData, [field]: value });
        if (errors[field]) setErrors({ ...errors, [field]: null });
    };

    const validateForm = () => {
        const newErrors = {};

        if (formData.height && parseFloat(formData.height) <= 0)
            newErrors.height = 'Height must be a positive number';
        if (formData.weight && parseFloat(formData.weight) <= 0)
            newErrors.weight = 'Weight must be a positive number';
        if (formData.temperature && isNaN(parseFloat(formData.temperature)))
            newErrors.temperature = 'Temperature must be a valid number';
        if (
            formData.pulse_rate &&
            (isNaN(parseFloat(formData.pulse_rate)) ||
                parseFloat(formData.pulse_rate) < 0)
        )
            newErrors.pulse_rate = 'Pulse rate must be a non-negative number';
        if (
            formData.respiratory_rate &&
            (isNaN(parseFloat(formData.respiratory_rate)) ||
                parseFloat(formData.respiratory_rate) < 0)
        )
            newErrors.respiratory_rate =
                'Respiratory rate must be a non-negative number';
        if (formData.systolic_bp && parseFloat(formData.systolic_bp) <= 0)
            newErrors.systolic_bp = 'Systolic BP must be a positive number';
        if (formData.diastolic_bp && parseFloat(formData.diastolic_bp) <= 0)
            newErrors.diastolic_bp = 'Diastolic BP must be a positive number';
        if (
            formData.spO2 &&
            (parseFloat(formData.spO2) < 0 || parseFloat(formData.spO2) > 100)
        )
            newErrors.spO2 = 'SpO2 must be between 0 and 100';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            toast.error('Please fix the validation errors');
            return;
        }

        setIsSubmitting(true);

        try {
            const submitData = {
                patient_id: patientId,
                encounter_date:
                    formData.recorded_at ||
                    new Date().toISOString().split('T')[0],
                recorded_at: formData.recorded_at || new Date().toISOString(),
                height: parseFloat(formData.height) || null,
                weight: parseFloat(formData.weight) || null,
                bmi: formData.bmi ? parseFloat(formData.bmi) : null,
                temperature: parseFloat(formData.temperature) || null,
                systolic_bp: parseFloat(formData.systolic_bp) || null,
                diastolic_bp: parseFloat(formData.diastolic_bp) || null,
                pulse_rate: parseFloat(formData.pulse_rate) || null,
                respiratory_rate: parseFloat(formData.respiratory_rate) || null,
                spO2: parseFloat(formData.spO2) || null,
                blood_glucose: parseFloat(formData.blood_glucose) || null,
                notes: formData.notes || null,
                created_by: createdBy,
            };

            const response = await Http.post(
                `/patients/vital-signs/${patientId}`,
                submitData,
            );

            if (response.status === 200 || response.status === 201) {
                toast.success('Vital signs saved successfully');
                // Parent will close modal + reload
                onSuccess();
            } else {
                toast.error(
                    response.data.message || 'Failed to save vital signs',
                );
            }
        } catch (error) {
            console.error('Error saving vitals:', error);
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
                toast.error('Please fix the validation errors');
            } else {
                toast.error('Failed to save vital signs');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const bpAssessment = assessBP(formData.systolic_bp, formData.diastolic_bp);

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <FormSection title="Measurement Information">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field id="recorded_at" label="Vitals Date">
                        <Input
                            id="recorded_at"
                            type="date"
                            value={
                                formData.recorded_at
                                    ? formData.recorded_at.split('T')[0]
                                    : ''
                            }
                            onChange={(e) =>
                                handleChange('recorded_at', e.target.value)
                            }
                            className="h-9 text-sm"
                        />
                    </Field>
                    <Field id="vital_time" label="Vital Time">
                        <Input
                            id="vital_time"
                            type="time"
                            value={
                                formData.recorded_at
                                    ? formData.recorded_at
                                          .split('T')[1]
                                          ?.slice(0, 5)
                                    : ''
                            }
                            onChange={(e) => {
                                const date = formData.recorded_at
                                    ? formData.recorded_at.split('T')[0]
                                    : new Date().toISOString().split('T')[0];
                                handleChange(
                                    'recorded_at',
                                    `${date}T${e.target.value}`,
                                );
                            }}
                            className="h-9 text-sm"
                        />
                    </Field>
                </div>
            </FormSection>

            <FormSection title="Anthropometry">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <Field
                        id="height"
                        label="Height/Length (cm)"
                        error={errors.height}
                    >
                        <Input
                            id="height"
                            type="number"
                            step="0.1"
                            value={formData.height}
                            onChange={(e) =>
                                handleAnthropometryChange(
                                    'height',
                                    e.target.value,
                                )
                            }
                            className={`h-9 text-sm ${errors.height ? 'border-red-500' : ''}`}
                            placeholder="e.g., 168"
                        />
                    </Field>
                    <Field
                        id="weight"
                        label="Weight (kg)"
                        error={errors.weight}
                    >
                        <Input
                            id="weight"
                            type="number"
                            step="0.1"
                            value={formData.weight}
                            onChange={(e) =>
                                handleAnthropometryChange(
                                    'weight',
                                    e.target.value,
                                )
                            }
                            className={`h-9 text-sm ${errors.weight ? 'border-red-500' : ''}`}
                            placeholder="e.g., 75"
                        />
                    </Field>
                    <Field
                        id="bmi"
                        label="BMI (auto)"
                        assessment={assessBMI(formData.bmi)}
                    >
                        <Input
                            id="bmi"
                            type="text"
                            value={
                                formData.bmi
                                    ? parseFloat(formData.bmi).toFixed(2)
                                    : ''
                            }
                            className="h-9 bg-gray-50 text-sm text-gray-600"
                            readOnly
                            placeholder="Auto-calculated"
                        />
                    </Field>
                </div>
            </FormSection>

            <FormSection title="Vital Signs">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <Field
                        id="temperature"
                        label="Temperature (°C)"
                        error={errors.temperature}
                        assessment={bandAssess(
                            formData.temperature,
                            BANDS.temperature,
                        )}
                    >
                        <Input
                            id="temperature"
                            type="number"
                            step="0.1"
                            value={formData.temperature}
                            onChange={(e) =>
                                handleChange('temperature', e.target.value)
                            }
                            className={`h-9 text-sm ${errors.temperature ? 'border-red-500' : ''}`}
                            placeholder="e.g., 36.5"
                        />
                    </Field>

                    <Field
                        id="systolic_bp"
                        label="Blood Pressure (mmHg)"
                        error={errors.systolic_bp || errors.diastolic_bp}
                        assessment={bpAssessment}
                    >
                        <div className="flex items-center gap-2">
                            <Input
                                id="systolic_bp"
                                type="number"
                                value={formData.systolic_bp}
                                onChange={(e) =>
                                    handleChange('systolic_bp', e.target.value)
                                }
                                className={`h-9 text-sm ${errors.systolic_bp ? 'border-red-500' : ''}`}
                                placeholder="SYS"
                            />
                            <span className="text-sm text-gray-500">/</span>
                            <Input
                                type="number"
                                value={formData.diastolic_bp}
                                onChange={(e) =>
                                    handleChange('diastolic_bp', e.target.value)
                                }
                                className={`h-9 text-sm ${errors.diastolic_bp ? 'border-red-500' : ''}`}
                                placeholder="DIA"
                            />
                        </div>
                    </Field>

                    <Field
                        id="pulse_rate"
                        label="Pulse Rate (bpm)"
                        error={errors.pulse_rate}
                        assessment={bandAssess(
                            formData.pulse_rate,
                            BANDS.pulse_rate,
                        )}
                    >
                        <Input
                            id="pulse_rate"
                            type="number"
                            value={formData.pulse_rate}
                            onChange={(e) =>
                                handleChange('pulse_rate', e.target.value)
                            }
                            className={`h-9 text-sm ${errors.pulse_rate ? 'border-red-500' : ''}`}
                            placeholder="e.g., 72"
                        />
                    </Field>

                    <Field
                        id="spO2"
                        label="SpO₂ (%)"
                        error={errors.spO2}
                        assessment={bandAssess(formData.spO2, BANDS.spO2)}
                    >
                        <Input
                            id="spO2"
                            type="number"
                            step="0.1"
                            value={formData.spO2}
                            onChange={(e) =>
                                handleChange('spO2', e.target.value)
                            }
                            className={`h-9 text-sm ${errors.spO2 ? 'border-red-500' : ''}`}
                            placeholder="e.g., 98"
                        />
                    </Field>

                    <Field
                        id="respiratory_rate"
                        label="Respiratory Rate (breaths/min)"
                        error={errors.respiratory_rate}
                        assessment={bandAssess(
                            formData.respiratory_rate,
                            BANDS.respiratory_rate,
                        )}
                    >
                        <Input
                            id="respiratory_rate"
                            type="number"
                            value={formData.respiratory_rate}
                            onChange={(e) =>
                                handleChange('respiratory_rate', e.target.value)
                            }
                            className={`h-9 text-sm ${errors.respiratory_rate ? 'border-red-500' : ''}`}
                            placeholder="e.g., 16"
                        />
                    </Field>

                    <Field
                        id="blood_glucose"
                        label="Blood Glucose (mg/dL)"
                        error={errors.blood_glucose}
                        assessment={bandAssess(
                            formData.blood_glucose,
                            BANDS.blood_glucose,
                        )}
                    >
                        <Input
                            id="blood_glucose"
                            type="number"
                            value={formData.blood_glucose}
                            onChange={(e) =>
                                handleChange('blood_glucose', e.target.value)
                            }
                            className="h-9 text-sm"
                            placeholder="e.g., 110"
                        />
                    </Field>
                </div>
            </FormSection>

            <FormSection title="Notes">
                <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => handleChange('notes', e.target.value)}
                    className="min-h-[70px] text-sm"
                    placeholder="Additional observations or comments..."
                />
            </FormSection>

            <div className="flex justify-end gap-3 border-t pt-4">
                <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    size="sm"
                    disabled={isSubmitting}
                    className="min-w-[80px]"
                >
                    Cancel
                </Button>
                <Button
                    type="submit"
                    disabled={isSubmitting}
                    size="sm"
                    className="min-w-[110px]"
                >
                    {isSubmitting ? (
                        <>
                            <span className="mr-2 h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Save className="mr-2 h-3 w-3" />
                            Save Vital
                        </>
                    )}
                </Button>
            </div>
        </form>
    );
};

// ============================================================
// HISTORY TABLE
// ============================================================

const Cell = ({ value, assessment, unit }) => {
    const s = LEVEL_STYLES[assessment?.level || 'none'];
    const display = formatVitalValue(value);
    return (
        <span
            className={`${display === '—' ? 'text-gray-300' : `${s.text} font-medium`}`}
            title={assessment?.label}
        >
            {display}
            {display !== '—' && unit ? (
                <span className="ml-0.5 text-[10px] font-normal text-gray-400">
                    {unit}
                </span>
            ) : null}
        </span>
    );
};

const HistoryTable = ({ vitals, onViewDetails }) => {
    if (!vitals || vitals.length === 0) {
        return (
            <div className="py-10 text-center text-sm text-gray-400">
                No matching observations
            </div>
        );
    }

    return (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        {[
                            'Date',
                            'Time',
                            'BP',
                            'Pulse',
                            'Temp',
                            'RR',
                            'SpO₂',
                            'Weight',
                            'BMI',
                            'Recorded by',
                            '',
                        ].map((h, i) => (
                            <th
                                key={`${h}-${i}`}
                                className="px-4 py-2.5 text-left text-xs font-medium tracking-wider whitespace-nowrap text-gray-500 uppercase"
                            >
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                    {vitals.map((vital) => {
                        const r = Object.fromEntries(
                            getReadings(vital).map((x) => [x.key, x]),
                        );
                        const abnormal = getAlerts(vital).length > 0;

                        return (
                            <tr
                                key={vital.id}
                                className="transition-colors hover:bg-blue-50/40"
                            >
                                <td className="px-4 py-2.5 text-sm whitespace-nowrap text-gray-900">
                                    <span className="inline-flex items-center gap-2">
                                        <span
                                            className={`h-2 w-2 rounded-full ${abnormal ? 'bg-amber-500' : 'bg-emerald-400'}`}
                                            title={
                                                abnormal
                                                    ? 'Has abnormal values'
                                                    : 'All within range'
                                            }
                                        />
                                        {formatDate(getVitalDate(vital))}
                                    </span>
                                </td>
                                <td className="px-4 py-2.5 text-sm whitespace-nowrap text-gray-600">
                                    {formatTime(getVitalDate(vital))}
                                </td>
                                <td className="px-4 py-2.5 text-sm whitespace-nowrap">
                                    <Cell
                                        value={r.bp.value}
                                        assessment={r.bp.assessment}
                                    />
                                </td>
                                <td className="px-4 py-2.5 text-sm whitespace-nowrap">
                                    <Cell
                                        value={r.pulse_rate.value}
                                        assessment={r.pulse_rate.assessment}
                                    />
                                </td>
                                <td className="px-4 py-2.5 text-sm whitespace-nowrap">
                                    <Cell
                                        value={r.temperature.value}
                                        assessment={r.temperature.assessment}
                                    />
                                </td>
                                <td className="px-4 py-2.5 text-sm whitespace-nowrap">
                                    <Cell
                                        value={r.respiratory_rate.value}
                                        assessment={
                                            r.respiratory_rate.assessment
                                        }
                                    />
                                </td>
                                <td className="px-4 py-2.5 text-sm whitespace-nowrap">
                                    <Cell
                                        value={r.spO2.value}
                                        assessment={r.spO2.assessment}
                                    />
                                </td>
                                <td className="px-4 py-2.5 text-sm whitespace-nowrap">
                                    <Cell value={vital.weight} />
                                </td>
                                <td className="px-4 py-2.5 text-sm whitespace-nowrap">
                                    <Cell
                                        value={r.bmi.value}
                                        assessment={r.bmi.assessment}
                                    />
                                </td>
                                <td className="px-4 py-2.5 text-sm whitespace-nowrap text-gray-500">
                                    {vital.recorder?.name || '—'}
                                </td>
                                <td className="px-4 py-2.5 text-sm whitespace-nowrap">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => onViewDetails(vital)}
                                        className="text-blue-600 hover:bg-blue-50 hover:text-blue-800"
                                    >
                                        Details
                                    </Button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

// ============================================================
// DETAILS MODAL TILE
// ============================================================

const DetailTile = ({ label, value, unit, assessment }) => {
    const s = LEVEL_STYLES[assessment?.level || 'none'];
    const display = formatVitalValue(value);
    return (
        <div className={`rounded-lg border p-3 ${s.border} ${s.soft}`}>
            <div className="text-[11px] font-semibold tracking-wider text-gray-500 uppercase">
                {label}
            </div>
            <div className={`mt-0.5 text-base font-semibold ${s.text}`}>
                {display}
                {display !== '—' && unit && (
                    <span className="ml-1 text-xs font-normal text-gray-500">
                        {unit}
                    </span>
                )}
            </div>
            {assessment && assessment.level !== 'normal' && (
                <div className={`text-[11px] font-medium ${s.text}`}>
                    {assessment.label}
                </div>
            )}
        </div>
    );
};

// ============================================================
// 3. MAIN COMPONENT
// ============================================================

export default function Vitals() {
    const { props } = usePage();
    const patientId =
        props.patientId || window.location.pathname.split('/').pop();
    const vitals = props.vitals;

    const [showHistory, setShowHistory] = useState(false);
    const [selectedVital, setSelectedVital] = useState(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [abnormalOnly, setAbnormalOnly] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    // Newest first / oldest first (computed once)
    const vitalsDesc = useMemo(() => sortVitalsDesc(vitals), [vitals]);
    const vitalsAsc = useMemo(() => [...vitalsDesc].reverse(), [vitalsDesc]);

    const latestVital = vitalsDesc[0] || null;
    const latestBMI = getBMI(latestVital);
    const latestAlerts = useMemo(() => getAlerts(latestVital), [latestVital]);

    const trends = useMemo(
        () => ({
            temperature: buildSeries(vitalsAsc, (v) => v.temperature),
            bp: buildSeries(vitalsAsc, (v) => v.systolic_bp),
            pulse_rate: buildSeries(vitalsAsc, (v) => v.pulse_rate),
            respiratory_rate: buildSeries(vitalsAsc, (v) => v.respiratory_rate),
            spO2: buildSeries(vitalsAsc, (v) => v.spO2),
            blood_glucose: buildSeries(vitalsAsc, (v) => v.blood_glucose),
        }),
        [vitalsAsc],
    );

    const filteredVitals = useMemo(() => {
        let filtered = [...vitalsDesc];

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(
                (v) =>
                    v.recorder?.name?.toLowerCase().includes(term) ||
                    v.notes?.toLowerCase().includes(term),
            );
        }

        if (abnormalOnly) {
            filtered = filtered.filter((v) => getAlerts(v).length > 0);
        }

        return filtered;
    }, [vitalsDesc, searchTerm, abnormalOnly]);

    const totalPages = Math.ceil(filteredVitals.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentVitals = filteredVitals.slice(
        indexOfFirstItem,
        indexOfLastItem,
    );

    const handleSearch = (value) => {
        setSearchTerm(value);
        setCurrentPage(1);
    };

    const handleToggleAbnormal = () => {
        setAbnormalOnly((prev) => !prev);
        setCurrentPage(1);
    };

    const handleAddVital = () => setIsAddModalOpen(true);

    /**
     * Close modal first, THEN reload data.
     * The short delay lets the Dialog finish closing before Inertia reloads.
     */
    const handleAddVitalSuccess = () => {
        setIsAddModalOpen(false);
        setTimeout(() => {
            router.reload({
                only: ['vitals'],
                preserveUrl: true,
                preserveState: true,
            });
        }, 200);
    };

    const handleViewDetails = (vital) => {
        setSelectedVital(vital);
        setShowHistory(true);
    };

    const hasVitals = vitals && vitals.length > 0;
    const showEmpty = !hasVitals;

    const selectedReadings = useMemo(
        () =>
            Object.fromEntries(
                getReadings(selectedVital).map((x) => [x.key, x]),
            ),
        [selectedVital],
    );

    return (
        <PatientLayout
            breadcrumbs={[
                { title: 'Patient', href: '' },
                { title: 'Vital Signs', href: '' },
            ]}
        >
            {/*
              Only the patient-header (rendered by PatientLayout) stays fixed.
              This wrapper fills the space under it and scrolls on its own,
              so the header never moves and never overflows.
            */}
            <div className="flex h-full min-h-0 flex-col bg-blue-50">
                <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
                    <div className="mx-auto w-full max-w-7xl space-y-4">
                        <PageHeader
                            icon={<Activity />}
                            title="Vitals & Anthropometry"
                            subtitle={
                                latestVital
                                    ? `Last recorded ${formatDate(getVitalDate(latestVital))} at ${formatTime(getVitalDate(latestVital))}`
                                    : 'Latest recorded observations'
                            }
                            actions={[
                                {
                                    label: 'Add Vital Signs',
                                    icon: <Plus className="h-4 w-4" />,
                                    onClick: handleAddVital,
                                },
                            ]}
                        />

                        {showEmpty && (
                            <EmptyState onAddVital={handleAddVital} />
                        )}

                        {hasVitals && (
                            <>
                                {/* ---------------- Latest reading ---------------- */}
                                <Card>
                                    <CardContent className="p-4 sm:p-5">
                                        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                                            <h2 className="text-sm font-semibold text-gray-800">
                                                Latest reading
                                            </h2>
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                                                {latestVital?.encounter_date && (
                                                    <span>
                                                        <span className="font-medium">
                                                            Encounter:
                                                        </span>{' '}
                                                        {formatDate(
                                                            latestVital.encounter_date,
                                                        )}
                                                    </span>
                                                )}
                                                <span className="inline-flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    {formatDate(
                                                        getVitalDate(
                                                            latestVital,
                                                        ),
                                                    )}{' '}
                                                    {formatTime(
                                                        getVitalDate(
                                                            latestVital,
                                                        ),
                                                    )}
                                                </span>
                                                {latestVital?.recorder
                                                    ?.name && (
                                                    <span className="inline-flex items-center gap-1">
                                                        <User className="h-3 w-3" />
                                                        {
                                                            latestVital.recorder
                                                                .name
                                                        }
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <AttentionBanner
                                            alerts={latestAlerts}
                                        />

                                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                            <MetricCard
                                                icon={Thermometer}
                                                label="Temperature"
                                                value={latestVital?.temperature}
                                                unit="°C"
                                                assessment={bandAssess(
                                                    latestVital?.temperature,
                                                    BANDS.temperature,
                                                )}
                                                trend={trends.temperature}
                                            />
                                            <MetricCard
                                                icon={Gauge}
                                                label="Blood Pressure"
                                                value={getBPDisplay(
                                                    latestVital,
                                                )}
                                                unit="mmHg"
                                                assessment={assessBP(
                                                    latestVital?.systolic_bp,
                                                    latestVital?.diastolic_bp,
                                                )}
                                                trend={trends.bp}
                                                trendLabel="systolic trend"
                                            />
                                            <MetricCard
                                                icon={HeartPulse}
                                                label="Pulse Rate"
                                                value={latestVital?.pulse_rate}
                                                unit="bpm"
                                                assessment={bandAssess(
                                                    latestVital?.pulse_rate,
                                                    BANDS.pulse_rate,
                                                )}
                                                trend={trends.pulse_rate}
                                            />
                                            <MetricCard
                                                icon={Wind}
                                                label="Respiratory Rate"
                                                value={
                                                    latestVital?.respiratory_rate
                                                }
                                                unit="breaths/min"
                                                assessment={bandAssess(
                                                    latestVital?.respiratory_rate,
                                                    BANDS.respiratory_rate,
                                                )}
                                                trend={trends.respiratory_rate}
                                            />
                                            <MetricCard
                                                icon={Droplets}
                                                label="SpO₂"
                                                value={latestVital?.spO2}
                                                unit="%"
                                                assessment={bandAssess(
                                                    latestVital?.spO2,
                                                    BANDS.spO2,
                                                )}
                                                trend={trends.spO2}
                                            />
                                            <MetricCard
                                                icon={Droplet}
                                                label="Blood Glucose"
                                                value={
                                                    latestVital?.blood_glucose
                                                }
                                                unit="mg/dL"
                                                assessment={bandAssess(
                                                    latestVital?.blood_glucose,
                                                    BANDS.blood_glucose,
                                                )}
                                                trend={trends.blood_glucose}
                                            />
                                        </div>

                                        <div className="mt-3 grid gap-3 sm:grid-cols-3">
                                            <AnthropometryTile
                                                icon={Ruler}
                                                label="Height"
                                                value={latestVital?.height}
                                                unit="cm"
                                            />
                                            <AnthropometryTile
                                                icon={Scale}
                                                label="Weight"
                                                value={latestVital?.weight}
                                                unit="kg"
                                            />
                                            <AnthropometryTile
                                                icon={Activity}
                                                label="BMI"
                                                value={latestBMI}
                                                unit="kg/m²"
                                                assessment={assessBMI(
                                                    latestBMI,
                                                )}
                                            />
                                        </div>

                                        {latestVital?.notes && (
                                            <div className="mt-4 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">
                                                <span className="font-medium text-gray-500">
                                                    Notes:
                                                </span>{' '}
                                                {latestVital.notes}
                                            </div>
                                        )}

                                        <p className="mt-3 text-[11px] text-gray-400">
                                            Status flags use adult reference
                                            ranges and are a visual aid only.
                                        </p>
                                    </CardContent>
                                </Card>

                                {/* ---------------- History ---------------- */}
                                <Card>
                                    <CardContent className="p-4 sm:p-5">
                                        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                            <h2 className="text-sm font-semibold text-gray-800">
                                                History
                                                <span className="ml-2 text-xs font-normal text-gray-400">
                                                    ({filteredVitals.length}{' '}
                                                    records)
                                                </span>
                                            </h2>
                                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                                <button
                                                    type="button"
                                                    onClick={
                                                        handleToggleAbnormal
                                                    }
                                                    className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors ${
                                                        abnormalOnly
                                                            ? 'border-amber-300 bg-amber-50 text-amber-800'
                                                            : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                                                    }`}
                                                >
                                                    <AlertTriangle className="h-3.5 w-3.5" />
                                                    Abnormal only
                                                </button>
                                                <div className="relative sm:w-64">
                                                    <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                                    <Input
                                                        type="text"
                                                        placeholder="Search notes or recorder..."
                                                        value={searchTerm}
                                                        onChange={(e) =>
                                                            handleSearch(
                                                                e.target.value,
                                                            )
                                                        }
                                                        className="h-9 w-full pl-9 text-sm"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <HistoryTable
                                            vitals={currentVitals}
                                            onViewDetails={handleViewDetails}
                                        />

                                        {totalPages > 1 && (
                                            <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
                                                <div className="text-xs text-gray-500">
                                                    Page {currentPage} of{' '}
                                                    {totalPages}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() =>
                                                            setCurrentPage(1)
                                                        }
                                                        disabled={
                                                            currentPage === 1
                                                        }
                                                        className="h-8 w-8 p-0"
                                                    >
                                                        <ChevronsLeft className="h-3 w-3" />
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() =>
                                                            setCurrentPage(
                                                                (prev) =>
                                                                    Math.max(
                                                                        prev -
                                                                            1,
                                                                        1,
                                                                    ),
                                                            )
                                                        }
                                                        disabled={
                                                            currentPage === 1
                                                        }
                                                        className="h-8 w-8 p-0"
                                                    >
                                                        <ChevronLeft className="h-3 w-3" />
                                                    </Button>
                                                    <span className="px-2 text-xs">
                                                        {currentPage} /{' '}
                                                        {totalPages}
                                                    </span>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() =>
                                                            setCurrentPage(
                                                                (prev) =>
                                                                    Math.min(
                                                                        prev +
                                                                            1,
                                                                        totalPages,
                                                                    ),
                                                            )
                                                        }
                                                        disabled={
                                                            currentPage ===
                                                            totalPages
                                                        }
                                                        className="h-8 w-8 p-0"
                                                    >
                                                        <ChevronRight className="h-3 w-3" />
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() =>
                                                            setCurrentPage(
                                                                totalPages,
                                                            )
                                                        }
                                                        disabled={
                                                            currentPage ===
                                                            totalPages
                                                        }
                                                        className="h-8 w-8 p-0"
                                                    >
                                                        <ChevronsRight className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* ============================================================
                ADD VITAL MODAL
                - Fixed header
                - Scrollable body only
                ============================================================ */}
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
                    <DialogHeader className="flex-shrink-0 border-b bg-slate-50 px-6 py-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500">
                                <Stethoscope className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <DialogTitle className="text-base font-semibold text-gray-900">
                                    Add Vital Signs
                                </DialogTitle>
                                <DialogDescription className="text-xs text-gray-500">
                                    Record patient's vital signs and
                                    anthropometric measurements
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto bg-slate-50/50 px-6 py-4">
                        <AddVitalForm
                            patientId={patientId}
                            onSuccess={handleAddVitalSuccess}
                            createdBy={props.auth.user.id}
                            onCancel={() => setIsAddModalOpen(false)}
                        />
                    </div>
                </DialogContent>
            </Dialog>

            {/* ============================================================
                DETAILS MODAL
                ============================================================ */}
            <Dialog open={showHistory} onOpenChange={setShowHistory}>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Vital Details</DialogTitle>
                        <DialogDescription>
                            Detailed observation record
                        </DialogDescription>
                    </DialogHeader>
                    {selectedVital && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <span className="font-medium text-gray-500">
                                        Date
                                    </span>
                                    <p className="text-gray-900">
                                        {formatDate(
                                            getVitalDate(selectedVital),
                                        )}
                                    </p>
                                </div>
                                <div>
                                    <span className="font-medium text-gray-500">
                                        Time
                                    </span>
                                    <p className="text-gray-900">
                                        {formatTime(
                                            getVitalDate(selectedVital),
                                        )}
                                    </p>
                                </div>
                                {selectedVital.encounter_date && (
                                    <div className="col-span-2">
                                        <span className="font-medium text-gray-500">
                                            Encounter Date
                                        </span>
                                        <p className="text-gray-900">
                                            {formatDate(
                                                selectedVital.encounter_date,
                                            )}
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="border-t border-gray-100 pt-3">
                                <h4 className="mb-2 text-xs font-semibold tracking-wider text-gray-500 uppercase">
                                    Anthropometry
                                </h4>
                                <div className="grid grid-cols-3 gap-2">
                                    <DetailTile
                                        label="Height"
                                        value={selectedVital.height}
                                        unit="cm"
                                    />
                                    <DetailTile
                                        label="Weight"
                                        value={selectedVital.weight}
                                        unit="kg"
                                    />
                                    <DetailTile
                                        label="BMI"
                                        value={selectedReadings.bmi?.value}
                                        unit="kg/m²"
                                        assessment={
                                            selectedReadings.bmi?.assessment
                                        }
                                    />
                                </div>
                            </div>

                            <div className="border-t border-gray-100 pt-3">
                                <h4 className="mb-2 text-xs font-semibold tracking-wider text-gray-500 uppercase">
                                    Vital Signs
                                </h4>
                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                    <DetailTile
                                        label="Temperature"
                                        value={
                                            selectedReadings.temperature?.value
                                        }
                                        unit="°C"
                                        assessment={
                                            selectedReadings.temperature
                                                ?.assessment
                                        }
                                    />
                                    <DetailTile
                                        label="Blood Pressure"
                                        value={selectedReadings.bp?.value}
                                        unit="mmHg"
                                        assessment={
                                            selectedReadings.bp?.assessment
                                        }
                                    />
                                    <DetailTile
                                        label="Pulse Rate"
                                        value={
                                            selectedReadings.pulse_rate?.value
                                        }
                                        unit="bpm"
                                        assessment={
                                            selectedReadings.pulse_rate
                                                ?.assessment
                                        }
                                    />
                                    <DetailTile
                                        label="Resp. Rate"
                                        value={
                                            selectedReadings.respiratory_rate
                                                ?.value
                                        }
                                        unit="breaths/min"
                                        assessment={
                                            selectedReadings.respiratory_rate
                                                ?.assessment
                                        }
                                    />
                                    <DetailTile
                                        label="SpO₂"
                                        value={selectedReadings.spO2?.value}
                                        unit="%"
                                        assessment={
                                            selectedReadings.spO2?.assessment
                                        }
                                    />
                                    {selectedVital.blood_glucose && (
                                        <DetailTile
                                            label="Glucose"
                                            value={
                                                selectedReadings.blood_glucose
                                                    ?.value
                                            }
                                            unit="mg/dL"
                                            assessment={
                                                selectedReadings.blood_glucose
                                                    ?.assessment
                                            }
                                        />
                                    )}
                                </div>
                            </div>

                            {selectedVital.notes && (
                                <div className="border-t border-gray-100 pt-3">
                                    <h4 className="mb-1 text-xs font-semibold tracking-wider text-gray-500 uppercase">
                                        Notes
                                    </h4>
                                    <p className="text-sm text-gray-700">
                                        {selectedVital.notes}
                                    </p>
                                </div>
                            )}

                            {selectedVital.recorder?.name && (
                                <div className="border-t border-gray-100 pt-3 text-xs text-gray-400">
                                    Recorded by: {selectedVital.recorder.name}
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </PatientLayout>
    );
}
