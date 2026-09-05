import { usePage, router } from '@inertiajs/react';
import axios from 'axios';
import { format } from 'date-fns';
import {
    Heart,
    Activity,
    Thermometer,
    Ruler,
    Search,
    Calendar,
    Download,
    AlertCircle,
    AlertTriangle,
    Info,
    Droplet,
    TrendingUp,
    TrendingDown,
    Minus,
    Gauge,
    Wind,
    BarChart3,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Plus,
    X,
    Save,
    Clock,
    Stethoscope,
} from 'lucide-react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import PageHeader from '@/components/PageHeader';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import PatientLayout from '@/layouts/patients/PatientLayout';
import Http from '@/utils/Http';

// ============================================================
// 1. UTILITY FUNCTIONS
// ============================================================

/**
 * Format a value for display, returning '—' for null/undefined/empty
 */
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

/**
 * Calculate BMI from height (cm) and weight (kg)
 */
const calculateBMI = (heightCm, weightKg) => {
    if (!heightCm || !weightKg || heightCm <= 0 || weightKg <= 0) {
        return null;
    }
    const heightM = heightCm / 100;
    const bmi = weightKg / (heightM * heightM);
    return Math.round(bmi * 100) / 100; // Round to 2 decimal places
};

/**
 * Get the latest vital observation from an array
 */
const getLatestVital = (vitals) => {
    if (!vitals || vitals.length === 0) return null;

    // Sort by recorded_at (or created_at) descending
    const sorted = [...vitals].sort((a, b) => {
        const dateA = new Date(a.recorded_at || a.created_at);
        const dateB = new Date(b.recorded_at || b.created_at);
        return dateB - dateA;
    });

    return sorted[0] || null;
};

/**
 * Format date for display
 */
const formatDate = (date) => {
    if (!date) return '—';
    try {
        return format(new Date(date), 'dd-MMM-yyyy');
    } catch {
        return '—';
    }
};

/**
 * Format time for display
 */
const formatTime = (date) => {
    if (!date) return '—';
    try {
        return format(new Date(date), 'HH:mm');
    } catch {
        return '—';
    }
};

// ============================================================
// 2. SUB-COMPONENTS
// ============================================================

/**
 * Compact metric display for the latest vitals summary
 */
const VitalMetric = ({ label, value, unit, status, className = '' }) => {
    const displayValue = formatVitalValue(value);
    const statusColor =
        status === 'normal'
            ? 'text-green-700'
            : status === 'warning'
              ? 'text-yellow-700'
              : status === 'critical'
                ? 'text-red-700'
                : 'text-gray-700';

    return (
        <div className={`text-center ${className}`}>
            <div className="text-xs font-medium tracking-wider text-gray-500 uppercase">
                {label}
            </div>
            <div className={`text-base font-semibold ${statusColor}`}>
                {displayValue}
                {displayValue !== '—' && unit && (
                    <span className="ml-0.5 text-xs font-normal text-gray-500">
                        {unit}
                    </span>
                )}
            </div>
        </div>
    );
};

/**
 * Compact Anthropometry section
 */
const AnthropometrySummary = ({ height, weight, bmi }) => {
    return (
        <div className="space-y-1">
            <div className="text-xs font-semibold tracking-wider text-blue-500 uppercase">
                Anthropometry
            </div>
            <div className="grid grid-cols-3 gap-2">
                <VitalMetric label="Height" value={height} unit="cm" />
                <VitalMetric label="Weight" value={weight} unit="kg" />
                <VitalMetric label="BMI" value={bmi} unit="kg/m²" />
            </div>
        </div>
    );
};

/**
 * Compact Vital Signs section
 */
const VitalSignsSummary = ({
    temperature,
    systolic_bp,
    diastolic_bp,
    pulse_rate,
    respiratory_rate,
    spO2,
}) => {
    // Determine BP display
    const bpDisplay =
        systolic_bp && diastolic_bp
            ? `${formatVitalValue(systolic_bp)}/${formatVitalValue(diastolic_bp)}`
            : '—';
    const bpUnit = systolic_bp && diastolic_bp ? 'mmHg' : '';

    return (
        <div className="space-y-1">
            <div className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
                Vital Signs
            </div>
            <div className="grid gap-2 bg-green-100 sm:grid-cols-3 lg:grid-cols-5">
                <VitalMetric
                    label="Temperature"
                    value={temperature}
                    unit="°C"
                />
                <VitalMetric
                    label="Blood Pressure"
                    value={bpDisplay}
                    unit={bpUnit}
                />
                <VitalMetric label="Pulse Rate" value={pulse_rate} unit="bpm" />
                <VitalMetric
                    label="Respiratory Rate"
                    value={respiratory_rate}
                    unit="breaths/min"
                />
                <VitalMetric label="SpO₂" value={spO2} unit="%" />
            </div>
        </div>
    );
};

/**
 * Empty state component
 */
const EmptyState = ({ onAddVital }) => {
    return (
        <Card>
            <CardContent className="py-12 text-center">
                <div className="flex flex-col items-center justify-center text-gray-500">
                    <Heart className="mb-4 h-12 w-12 text-gray-300" />
                    <p className="text-lg font-medium text-gray-400">
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
};

/**
 * Loading state component
 */
const LoadingState = () => {
    return (
        <Card>
            <CardContent className="py-8">
                <div className="flex items-center justify-center space-x-3">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                    <span className="text-sm text-gray-500">
                        Loading vitals...
                    </span>
                </div>
            </CardContent>
        </Card>
    );
};

/**
 * Error state component
 */
const ErrorState = ({ onRetry }) => {
    return (
        <div className="p-2">
            <Card>
                <CardContent className="py-8">
                    <div className="flex flex-col items-center justify-center text-gray-500">
                        <AlertCircle className="mb-2 h-8 w-8 text-red-400" />
                        <p className="text-sm font-medium text-red-600">
                            Unable to load vital signs
                        </p>
                        <Button
                            variant="outline"
                            onClick={onRetry}
                            className="mt-3"
                        >
                            Retry
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

/**
 * Add Vital Form Component (inside Modal)
 */
const AddVitalForm = ({ patientId, onSuccess, onCancel, createdBy }) => {
    // Form state
    const [formData, setFormData] = useState({
        encounter_date: '',
        recorded_at: '',
        // Anthropometry
        height: '',
        weight: '',
        bmi: '',
        // Vital Signs
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

    // Auto-calculate BMI when height or weight changes
    const handleAnthropometryChange = (field, value) => {
        const updatedData = { ...formData, [field]: value };

        // Calculate BMI if both height and weight are present
        if (field === 'height' || field === 'weight') {
            const height = parseFloat(
                field === 'height' ? value : formData.height,
            );
            const weight = parseFloat(
                field === 'weight' ? value : formData.weight,
            );

            if (!isNaN(height) && !isNaN(weight) && height > 0 && weight > 0) {
                const calculatedBMI = calculateBMI(height, weight);
                if (calculatedBMI !== null) {
                    updatedData.bmi = calculatedBMI.toString();
                }
            } else {
                updatedData.bmi = '';
            }
        }

        setFormData(updatedData);
        // Clear error for this field if it exists
        if (errors[field]) {
            setErrors({ ...errors, [field]: null });
        }
    };

    // Generic change handler
    const handleChange = (field, value) => {
        setFormData({ ...formData, [field]: value });
        if (errors[field]) {
            setErrors({ ...errors, [field]: null });
        }
    };

    // Validate form
    const validateForm = () => {
        const newErrors = {};

        // Basic validation - positive numbers where applicable
        if (formData.height && parseFloat(formData.height) <= 0) {
            newErrors.height = 'Height must be a positive number';
        }
        if (formData.weight && parseFloat(formData.weight) <= 0) {
            newErrors.weight = 'Weight must be a positive number';
        }
        if (formData.temperature && isNaN(parseFloat(formData.temperature))) {
            newErrors.temperature = 'Temperature must be a valid number';
        }
        if (
            formData.pulse_rate &&
            (isNaN(parseFloat(formData.pulse_rate)) ||
                parseFloat(formData.pulse_rate) < 0)
        ) {
            newErrors.pulse_rate = 'Pulse rate must be a non-negative number';
        }
        if (
            formData.respiratory_rate &&
            (isNaN(parseFloat(formData.respiratory_rate)) ||
                parseFloat(formData.respiratory_rate) < 0)
        ) {
            newErrors.respiratory_rate =
                'Respiratory rate must be a non-negative number';
        }
        if (formData.systolic_bp && parseFloat(formData.systolic_bp) <= 0) {
            newErrors.systolic_bp = 'Systolic BP must be a positive number';
        }
        if (formData.diastolic_bp && parseFloat(formData.diastolic_bp) <= 0) {
            newErrors.diastolic_bp = 'Diastolic BP must be a positive number';
        }
        if (
            formData.spO2 &&
            (parseFloat(formData.spO2) < 0 || parseFloat(formData.spO2) > 100)
        ) {
            newErrors.spO2 = 'SpO2 must be between 0 and 100';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Submit form
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
                    formData.encounter_date ||
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

            console.log(submitData);

            // Use the existing API endpoint
            const response = await Http.post(
                `/patients/vital-signs/${patientId}`,
                submitData,
            );

            if (response.data.success) {
                toast.success('Vital signs saved successfully');
                onSuccess(); // Refresh parent data
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

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Group 1: Measurement Information */}
            <div>
                <h3 className="mb-2 text-xs font-semibold tracking-wider text-gray-500 uppercase">
                    Measurement Information
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {/* <div>
                        <Label
                            htmlFor="encounter_date"
                            className="text-xs text-gray-600"
                        ></Label>
                        <Input
                            type="hidden"
                            id="encounter_date"
                            type="date"
                            value={formData.encounter_date}
                            onChange={(e) =>
                                handleChange('encounter_date', e.target.value)
                            }
                            className="mt-1 h-8 text-sm"
                        />
                    </div> */}
                    <div>
                        <Label
                            htmlFor="recorded_at"
                            className="text-xs text-gray-600"
                        >
                            Vitals Date
                        </Label>
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
                            className="mt-1 h-8 text-sm"
                        />
                    </div>
                    <div>
                        <Label
                            htmlFor="vital_time"
                            className="text-xs text-gray-600"
                        >
                            Vital Time
                        </Label>
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
                            className="mt-1 h-8 text-sm"
                        />
                    </div>
                </div>
            </div>

            {/* Group 2: Anthropometry */}
            <div>
                <h3 className="mb-2 text-xs font-semibold tracking-wider text-gray-500 uppercase">
                    Anthropometry
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                        <Label
                            htmlFor="height"
                            className="text-xs text-gray-600"
                        >
                            Height/Length (cm)
                        </Label>
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
                            className={`mt-1 h-8 text-sm ${errors.height ? 'border-red-500' : ''}`}
                            placeholder="e.g., 168"
                        />
                        {errors.height && (
                            <p className="mt-0.5 text-xs text-red-500">
                                {errors.height}
                            </p>
                        )}
                    </div>
                    <div>
                        <Label
                            htmlFor="weight"
                            className="text-xs text-gray-600"
                        >
                            Weight (kg)
                        </Label>
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
                            className={`mt-1 h-8 text-sm ${errors.weight ? 'border-red-500' : ''}`}
                            placeholder="e.g., 75"
                        />
                        {errors.weight && (
                            <p className="mt-0.5 text-xs text-red-500">
                                {errors.weight}
                            </p>
                        )}
                    </div>
                    <div>
                        <Label htmlFor="bmi" className="text-xs text-gray-600">
                            BMI
                        </Label>
                        <Input
                            id="bmi"
                            type="text"
                            value={
                                formData.bmi
                                    ? parseFloat(formData.bmi).toFixed(2)
                                    : ''
                            }
                            className="mt-1 h-8 bg-gray-50 text-sm text-gray-600"
                            readOnly
                            placeholder="Auto-calculated"
                        />
                        <p className="mt-0.5 text-xs text-gray-400">
                            Auto-calculated from height and weight
                        </p>
                    </div>
                </div>
            </div>

            {/* Group 3: Vital Signs */}
            <div>
                <h3 className="mb-2 text-xs font-semibold tracking-wider text-gray-500 uppercase">
                    Vital Signs
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                        <Label
                            htmlFor="temperature"
                            className="text-xs text-gray-600"
                        >
                            Temperature (°C)
                        </Label>
                        <Input
                            id="temperature"
                            type="number"
                            step="0.1"
                            value={formData.temperature}
                            onChange={(e) =>
                                handleChange('temperature', e.target.value)
                            }
                            className={`mt-1 h-8 text-sm ${errors.temperature ? 'border-red-500' : ''}`}
                            placeholder="e.g., 36.5"
                        />
                        {errors.temperature && (
                            <p className="mt-0.5 text-xs text-red-500">
                                {errors.temperature}
                            </p>
                        )}
                    </div>
                    <div>
                        <Label className="text-xs text-gray-600">
                            Blood Pressure (mmHg)
                        </Label>
                        <div className="mt-1 flex items-center gap-2">
                            <Input
                                type="number"
                                value={formData.systolic_bp}
                                onChange={(e) =>
                                    handleChange('systolic_bp', e.target.value)
                                }
                                className={`h-8 text-sm ${errors.systolic_bp ? 'border-red-500' : ''}`}
                                placeholder="SYS"
                            />
                            <span className="text-sm text-gray-500">/</span>
                            <Input
                                type="number"
                                value={formData.diastolic_bp}
                                onChange={(e) =>
                                    handleChange('diastolic_bp', e.target.value)
                                }
                                className={`h-8 text-sm ${errors.diastolic_bp ? 'border-red-500' : ''}`}
                                placeholder="DIA"
                            />
                        </div>
                        {(errors.systolic_bp || errors.diastolic_bp) && (
                            <p className="mt-0.5 text-xs text-red-500">
                                {errors.systolic_bp || errors.diastolic_bp}
                            </p>
                        )}
                    </div>
                    <div>
                        <Label
                            htmlFor="pulse_rate"
                            className="text-xs text-gray-600"
                        >
                            Pulse Rate (bpm)
                        </Label>
                        <Input
                            id="pulse_rate"
                            type="number"
                            value={formData.pulse_rate}
                            onChange={(e) =>
                                handleChange('pulse_rate', e.target.value)
                            }
                            className={`mt-1 h-8 text-sm ${errors.pulse_rate ? 'border-red-500' : ''}`}
                            placeholder="e.g., 72"
                        />
                        {errors.pulse_rate && (
                            <p className="mt-0.5 text-xs text-red-500">
                                {errors.pulse_rate}
                            </p>
                        )}
                    </div>
                    <div>
                        <Label htmlFor="spO2" className="text-xs text-gray-600">
                            SpO₂ (%)
                        </Label>
                        <Input
                            id="spO2"
                            type="number"
                            step="0.1"
                            value={formData.spO2}
                            onChange={(e) =>
                                handleChange('spO2', e.target.value)
                            }
                            className={`mt-1 h-8 text-sm ${errors.spO2 ? 'border-red-500' : ''}`}
                            placeholder="e.g., 98"
                        />
                        {errors.spO2 && (
                            <p className="mt-0.5 text-xs text-red-500">
                                {errors.spO2}
                            </p>
                        )}
                    </div>
                    <div>
                        <Label
                            htmlFor="respiratory_rate"
                            className="text-xs text-gray-600"
                        >
                            Respiratory Rate (breaths/min)
                        </Label>
                        <Input
                            id="respiratory_rate"
                            type="number"
                            value={formData.respiratory_rate}
                            onChange={(e) =>
                                handleChange('respiratory_rate', e.target.value)
                            }
                            className={`mt-1 h-8 text-sm ${errors.respiratory_rate ? 'border-red-500' : ''}`}
                            placeholder="e.g., 16"
                        />
                        {errors.respiratory_rate && (
                            <p className="mt-0.5 text-xs text-red-500">
                                {errors.respiratory_rate}
                            </p>
                        )}
                    </div>
                    <div>
                        <Label
                            htmlFor="blood_glucose"
                            className="text-xs text-gray-600"
                        >
                            Blood Glucose (mg/dL)
                        </Label>
                        <Input
                            id="blood_glucose"
                            type="number"
                            value={formData.blood_glucose}
                            onChange={(e) =>
                                handleChange('blood_glucose', e.target.value)
                            }
                            className="mt-1 h-8 text-sm"
                            placeholder="e.g., 110"
                        />
                    </div>
                </div>
            </div>

            {/* Notes */}
            <div>
                <Label htmlFor="notes" className="text-xs text-gray-600">
                    Notes
                </Label>
                <Textarea
                    id="notes"
                    type="text"
                    value={formData.notes}
                    onChange={(e) => handleChange('notes', e.target.value)}
                    className="mt-1 h-8 text-sm"
                    placeholder="Additional observations or comments..."
                />
            </div>

            {/* Footer Actions */}
            <div className="flex justify-end gap-3 border-t bg-white pt-3">
                <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    size="sm"
                    className="min-w-[80px]"
                >
                    Cancel
                </Button>
                <Button
                    type="submit"
                    disabled={isSubmitting}
                    size="sm"
                    className="min-w-[100px]"
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

/**
 * History table component
 */
const HistoryTable = ({ vitals, onViewDetails }) => {
    if (!vitals || vitals.length === 0) {
        return (
            <div className="py-8 text-center text-sm text-gray-400">
                No historical observations available
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                            Date
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                            Time
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                            BP
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                            Pulse
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                            Temp
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                            RR
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                            SpO₂
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                            Weight
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                            BMI
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                            Action
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                    {vitals.map((vital) => {
                        const bpDisplay =
                            vital.systolic_bp && vital.diastolic_bp
                                ? `${formatVitalValue(vital.systolic_bp)}/${formatVitalValue(vital.diastolic_bp)}`
                                : '—';

                        return (
                            <tr
                                key={vital.id}
                                className="transition-colors hover:bg-gray-50"
                            >
                                <td className="px-4 py-2 text-sm whitespace-nowrap text-gray-900">
                                    {formatDate(
                                        vital.recorded_at || vital.created_at,
                                    )}
                                </td>
                                <td className="px-4 py-2 text-sm whitespace-nowrap text-gray-700">
                                    {formatTime(
                                        vital.recorded_at || vital.created_at,
                                    )}
                                </td>
                                <td className="px-4 py-2 text-sm font-medium whitespace-nowrap">
                                    {bpDisplay}
                                </td>
                                <td className="px-4 py-2 text-sm whitespace-nowrap">
                                    {formatVitalValue(vital.pulse_rate)}
                                </td>
                                <td className="px-4 py-2 text-sm whitespace-nowrap">
                                    {formatVitalValue(vital.temperature)}
                                </td>
                                <td className="px-4 py-2 text-sm whitespace-nowrap">
                                    {formatVitalValue(vital.respiratory_rate)}
                                </td>
                                <td className="px-4 py-2 text-sm whitespace-nowrap">
                                    {formatVitalValue(vital.spO2)}
                                </td>
                                <td className="px-4 py-2 text-sm whitespace-nowrap">
                                    {formatVitalValue(vital.weight)}
                                </td>
                                <td className="px-4 py-2 text-sm whitespace-nowrap">
                                    {formatVitalValue(vital.bmi)}
                                </td>
                                <td className="px-4 py-2 text-sm whitespace-nowrap">
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
// 3. MAIN COMPONENT
// ============================================================

export default function Vitals() {
    // Get patientId from props
    const { props } = usePage();
    const patientId =
        props.patientId || window.location.pathname.split('/').pop();
    const vitals = props.vitals;

    // State
    // const [vitals, setVitals] = useState(vitalSigns);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showHistory, setShowHistory] = useState(false);
    const [selectedVital, setSelectedVital] = useState(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [dateFilter, setDateFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    // Pagination state for history
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    // Get latest vital
    const latestVital = useMemo(() => getLatestVital(vitals), [vitals]);

    // Calculate BMI for latest if not present
    const latestBMI = useMemo(() => {
        if (latestVital?.bmi) return latestVital.bmi;
        if (latestVital?.height && latestVital?.weight) {
            return calculateBMI(latestVital.height, latestVital.weight);
        }
        return null;
    }, [latestVital]);

    // Filtered vitals for history
    const filteredVitals = useMemo(() => {
        if (!vitals) return [];

        let filtered = [...vitals];

        // Apply search
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(
                (v) =>
                    v.recorder?.name?.toLowerCase().includes(term) ||
                    v.notes?.toLowerCase().includes(term),
            );
        }

        // Sort by date descending (newest first)
        filtered.sort((a, b) => {
            const dateA = new Date(a.recorded_at || a.created_at);
            const dateB = new Date(b.recorded_at || b.created_at);
            return dateB - dateA;
        });

        return filtered;
    }, [vitals, searchTerm]);

    // Pagination
    const totalPages = Math.ceil(filteredVitals.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentVitals = filteredVitals.slice(
        indexOfFirstItem,
        indexOfLastItem,
    );

    // Handlers
    const handleAddVital = () => {
        setIsAddModalOpen(true);
    };

    const handleAddVitalSuccess = () => {
        setIsAddModalOpen(false);
        // Refresh data
    };

    const handleViewDetails = (vital) => {
        setSelectedVital(vital);
        setShowHistory(true);
    };

    // Determine if we should show the main content
    const hasVitals = vitals && vitals.length > 0;
    const showLoading = loading && !hasVitals;
    const showError = error && !hasVitals;
    const showEmpty = !loading && !error && !hasVitals;

    return (
        <PatientLayout
            breadcrumbs={[
                { title: 'Patient', href: '' },
                { title: 'Vital Signs', href: '' },
            ]}
        >
            <div className="min-h-screen bg-blue-50">
                <div className="">
                    {/* ============================================================
                        SECTION HEADER - Using PageHeader from your file
                        ============================================================ */}
                    <PageHeader
                        icon={<Activity />}
                        title="Vitals & Anthropometry"
                        subtitle="Latest recorded observations"
                        actions={[
                            {
                                label: 'Add Vital',
                                onClick: handleAddVital,
                            },
                        ]}
                    />

                    {/* ============================================================
                        MAIN CONTENT
                        ============================================================ */}

                    {/* Loading State */}
                    {showLoading && <LoadingState />}

                    {/* Error State */}
                    {showError && <ErrorState onRetry={handleRetry} />}

                    {/* Empty State */}
                    {showEmpty && <EmptyState onAddVital={handleAddVital} />}

                    {/* Main Content */}
                    {hasVitals && !loading && (
                        <div className="p-6">
                            {/* Latest Vitals Display */}
                            <Card>
                                <CardContent className="p-4 sm:p-5">
                                    {/* Date/Time header */}
                                    <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
                                        {latestVital?.encounter_date && (
                                            <span>
                                                <span className="font-medium text-gray-500">
                                                    Encounter:
                                                </span>{' '}
                                                {formatDate(
                                                    latestVital.encounter_date,
                                                )}
                                            </span>
                                        )}
                                        {latestVital?.recorded_at && (
                                            <span>
                                                <span className="font-medium text-gray-500">
                                                    Vitals:
                                                </span>{' '}
                                                {formatDate(
                                                    latestVital.recorded_at,
                                                )}{' '}
                                                <span className="text-gray-400">
                                                    {formatTime(
                                                        latestVital.recorded_at,
                                                    )}
                                                </span>
                                            </span>
                                        )}
                                        {latestVital?.created_at &&
                                            !latestVital?.recorded_at && (
                                                <span>
                                                    <span className="font-medium text-gray-500">
                                                        Recorded:
                                                    </span>{' '}
                                                    {formatDate(
                                                        latestVital.created_at,
                                                    )}{' '}
                                                    <span className="text-gray-400">
                                                        {formatTime(
                                                            latestVital.created_at,
                                                        )}
                                                    </span>
                                                </span>
                                            )}
                                    </div>

                                    {/* Anthropometry */}
                                    <div className="mb-4">
                                        <AnthropometrySummary
                                            height={latestVital?.height}
                                            weight={latestVital?.weight}
                                            bmi={latestBMI}
                                        />
                                    </div>

                                    {/* Vital Signs */}
                                    <VitalSignsSummary
                                        temperature={latestVital?.temperature}
                                        systolic_bp={latestVital?.systolic_bp}
                                        diastolic_bp={latestVital?.diastolic_bp}
                                        pulse_rate={latestVital?.pulse_rate}
                                        respiratory_rate={
                                            latestVital?.respiratory_rate
                                        }
                                        spO2={latestVital?.spO2}
                                    />

                                    {/* Additional info if present */}
                                    {latestVital?.notes && (
                                        <div className="mt-3 border-t border-gray-100 pt-3">
                                            <p className="text-xs text-gray-400">
                                                <span className="font-medium text-gray-500">
                                                    Notes:
                                                </span>{' '}
                                                {latestVital.notes}
                                            </p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* History Section */}
                            <Card>
                                <CardContent className="p-4 sm:p-5">
                                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <h2 className="text-sm font-semibold text-gray-700">
                                            History
                                            <span className="ml-2 text-xs font-normal text-gray-400">
                                                ({filteredVitals.length}{' '}
                                                records)
                                            </span>
                                        </h2>
                                        <div className="relative flex-1 sm:max-w-xs">
                                            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                            <Input
                                                type="text"
                                                placeholder="Search history..."
                                                value={searchTerm}
                                                onChange={(e) =>
                                                    setSearchTerm(
                                                        e.target.value,
                                                    )
                                                }
                                                className="h-9 w-full pl-9 text-sm"
                                            />
                                        </div>
                                    </div>

                                    <HistoryTable
                                        vitals={currentVitals}
                                        onViewDetails={handleViewDetails}
                                    />

                                    {/* Pagination */}
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
                                                    disabled={currentPage === 1}
                                                    className="h-8 w-8 p-0"
                                                >
                                                    <ChevronsLeft className="h-3 w-3" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() =>
                                                        setCurrentPage((prev) =>
                                                            Math.max(
                                                                prev - 1,
                                                                1,
                                                            ),
                                                        )
                                                    }
                                                    disabled={currentPage === 1}
                                                    className="h-8 w-8 p-0"
                                                >
                                                    <ChevronLeft className="h-3 w-3" />
                                                </Button>
                                                <span className="px-2 text-xs">
                                                    {currentPage} / {totalPages}
                                                </span>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() =>
                                                        setCurrentPage((prev) =>
                                                            Math.min(
                                                                prev + 1,
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
                        </div>
                    )}
                </div>
            </div>

            {/* ============================================================
                ADD VITAL MODAL - With Icon and Compact Design
                ============================================================ */}
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                <DialogContent className="max-h-[90vh] overflow-y-auto p-0 sm:max-w-3xl">
                    {/* Modal Header with Icon */}
                    <div className="sticky top-0 z-10 border-b bg-slate-50 px-6 py-4">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500">
                                    <Stethoscope className="h-6 w-6 text-white" />
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
                        </div>
                    </div>

                    {/* Modal Body with bg-slate-50 */}
                    <div className="px-6 py-4">
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
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Vital Details</DialogTitle>
                        <DialogDescription>
                            Detailed observation record
                        </DialogDescription>
                    </DialogHeader>
                    {selectedVital && (
                        <div className="space-y-4">
                            {/* Date/Time */}
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <span className="font-medium text-gray-500">
                                        Date
                                    </span>
                                    <p className="text-gray-900">
                                        {formatDate(
                                            selectedVital.recorded_at ||
                                                selectedVital.created_at,
                                        )}
                                    </p>
                                </div>
                                <div>
                                    <span className="font-medium text-gray-500">
                                        Time
                                    </span>
                                    <p className="text-gray-900">
                                        {formatTime(
                                            selectedVital.recorded_at ||
                                                selectedVital.created_at,
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

                            {/* Anthropometry */}
                            <div className="border-t border-gray-100 pt-3">
                                <h4 className="mb-2 text-xs font-semibold tracking-wider text-gray-500 uppercase">
                                    Anthropometry
                                </h4>
                                <div className="grid grid-cols-3 gap-2 text-sm">
                                    <div>
                                        <span className="text-gray-500">
                                            Height
                                        </span>
                                        <p className="font-medium text-gray-900">
                                            {formatVitalValue(
                                                selectedVital.height,
                                            )}
                                            {selectedVital.height && ' cm'}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">
                                            Weight
                                        </span>
                                        <p className="font-medium text-gray-900">
                                            {formatVitalValue(
                                                selectedVital.weight,
                                            )}
                                            {selectedVital.weight && ' kg'}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">
                                            BMI
                                        </span>
                                        <p className="font-medium text-gray-900">
                                            {formatVitalValue(
                                                selectedVital.bmi,
                                            )}
                                            {selectedVital.bmi && ' kg/m²'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Vital Signs */}
                            <div className="border-t border-gray-100 pt-3">
                                <h4 className="mb-2 text-xs font-semibold tracking-wider text-gray-500 uppercase">
                                    Vital Signs
                                </h4>
                                <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
                                    <div>
                                        <span className="text-gray-500">
                                            Temperature
                                        </span>
                                        <p className="font-medium text-gray-900">
                                            {formatVitalValue(
                                                selectedVital.temperature,
                                            )}
                                            {selectedVital.temperature && ' °C'}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">
                                            Blood Pressure
                                        </span>
                                        <p className="font-medium text-gray-900">
                                            {selectedVital.systolic_bp &&
                                            selectedVital.diastolic_bp
                                                ? `${selectedVital.systolic_bp}/${selectedVital.diastolic_bp} mmHg`
                                                : '—'}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">
                                            Pulse Rate
                                        </span>
                                        <p className="font-medium text-gray-900">
                                            {formatVitalValue(
                                                selectedVital.pulse_rate,
                                            )}
                                            {selectedVital.pulse_rate && ' bpm'}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">
                                            Respiratory Rate
                                        </span>
                                        <p className="font-medium text-gray-900">
                                            {formatVitalValue(
                                                selectedVital.respiratory_rate,
                                            )}
                                            {selectedVital.respiratory_rate &&
                                                ' breaths/min'}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">
                                            SpO₂
                                        </span>
                                        <p className="font-medium text-gray-900">
                                            {formatVitalValue(
                                                selectedVital.spO2,
                                            )}
                                            {selectedVital.spO2 && ' %'}
                                        </p>
                                    </div>
                                    {selectedVital.blood_glucose && (
                                        <div>
                                            <span className="text-gray-500">
                                                Glucose
                                            </span>
                                            <p className="font-medium text-gray-900">
                                                {selectedVital.blood_glucose}{' '}
                                                mg/dL
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Notes */}
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

                            {/* Recorder */}
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
