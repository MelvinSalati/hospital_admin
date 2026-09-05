// components/PatientVisitSchemeModal.tsx
import {
    X,
    Banknote,
    Shield,
    Calendar,
    UserCheck2,
    DatabaseIcon,
    Users2Icon,
    CheckCircle2,
    Building2,
    ChevronRight,
} from 'lucide-react';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

// Types
interface InsuranceProvider {
    id: number | string;
    name: string;
    code?: string;
    scheme_type?: string;
    type?: string;
    scheme_name?: string;
    [key: string]: any;
}

interface PatientData {
    id?: number | string;
    first_name?: string;
    last_name?: string;
    name?: string;
    gender?: string;
    date_of_birth?: string;
    patient_number?: string;
    medical_record_number?: string;
    age?: string | number;
    [key: string]: any;
}

interface PaymentScheme {
    id: string;
    label: string;
    icon: React.ElementType;
    description: string;
}

interface PatientVisitSchemeModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: {
        scheme: string;
        provider_id?: number | string | null;
    }) => void | Promise<void>;
    patient?: PatientData | null;
    schemes?: InsuranceProvider[] | null;
    loading?: boolean;
    title?: string;
    subtitle?: string;
}

// Default payment schemes with professional icons
const defaultSchemes: PaymentScheme[] = [
    {
        id: 'cash',
        label: 'Cash',
        icon: Banknote,
        description: 'Pay with cash',
    },
    {
        id: 'insurance',
        label: 'Insurance',
        icon: Shield,
        description: 'Use insurance coverage',
    },
];

// Helper to normalize scheme type
const getSchemeType = (provider: InsuranceProvider): string => {
    return (
        provider.scheme_type ||
        provider.type ||
        provider.scheme_name ||
        provider.name ||
        ''
    );
};

export const PatientVisitSchemeModal: React.FC<
    PatientVisitSchemeModalProps
> = ({
    open,
    onOpenChange,
    onSubmit,
    patient = null,
    schemes = null,
    loading = false,
    title = 'Start Patient Visit',
    subtitle = 'Create encounter and resolve visit pricing',
}) => {
    // State
    const [selectedScheme, setSelectedScheme] = useState<string | null>(null);
    const [selectedProvider, setSelectedProvider] = useState<
        number | string | null
    >(null);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Normalize patient data
    const normalizedPatient = useMemo(() => {
        if (!patient) return null;
        return {
            id: patient.id || patient.patient_id,
            name:
                patient.name ||
                `${patient.first_name || ''} ${patient.last_name || ''}`.trim() ||
                'Unknown Patient',
            gender: patient.gender || '—',
            age:
                patient.age ||
                (patient.date_of_birth
                    ? calculateAge(patient.date_of_birth)
                    : '—'),
            patientNumber:
                patient.patient_number || patient.medical_record_number || '—',
        };
    }, [patient]);

    // Normalize schemes
    const normalizedSchemes = useMemo(() => {
        if (!schemes || !Array.isArray(schemes)) return [];
        return schemes.map((scheme) => ({
            ...scheme,
            normalizedType: getSchemeType(scheme),
        }));
    }, [schemes]);

    // Filter schemes based on selected scheme type
    const filteredProviders = useMemo(() => {
        if (!selectedScheme) return [];
        if (selectedScheme === 'cash') return [];
        if (selectedScheme === 'insurance') {
            return normalizedSchemes;
        }
        return normalizedSchemes.filter(
            (s) =>
                s.normalizedType.toLowerCase() === selectedScheme.toLowerCase(),
        );
    }, [selectedScheme, normalizedSchemes]);

    // Calculate age from date of birth
    function calculateAge(dob: string): string {
        if (!dob) return '—';
        try {
            const birthDate = new Date(dob);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate()))
                age--;
            return String(age);
        } catch {
            return '—';
        }
    }

    // Reset state when modal closes
    useEffect(() => {
        if (!open) {
            setSelectedScheme(null);
            setSelectedProvider(null);
            setError(null);
            setIsSubmitting(false);
        }
    }, [open]);

    // Handle ESC key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && open) {
                onOpenChange(false);
            }
        };
        document.addEventListener('keydown', handleEsc);
        return () => document.removeEventListener('keydown', handleEsc);
    }, [open, onOpenChange]);

    // Handle outside click
    const handleOverlayClick = useCallback(
        (e: React.MouseEvent<HTMLDivElement>) => {
            if (e.target === e.currentTarget) {
                onOpenChange(false);
            }
        },
        [onOpenChange],
    );

    // Handle scheme selection
    const handleSchemeSelect = (schemeId: string) => {
        setSelectedScheme(schemeId);
        setSelectedProvider(null);
        setError(null);
    };

    // Handle provider selection
    const handleProviderSelect = (providerId: number | string) => {
        setSelectedProvider(providerId);
        setError(null);
    };

    // Handle submit
    const handleSubmit = async () => {
        if (isSubmitting || loading) return;

        if (!selectedScheme) {
            setError('Please select a payment scheme');
            return;
        }

        // If insurance is selected, require provider
        if (selectedScheme === 'insurance' && !selectedProvider) {
            setError('Please select an insurance provider');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const data = {
                scheme: selectedScheme,
                provider_id: selectedProvider,
            };

            await onSubmit(data);
        } catch (err: any) {
            setError(
                err?.message || 'Failed to start visit. Please try again.',
            );
            setIsSubmitting(false);
        }
    };

    // Handle cancel
    const handleCancel = () => {
        onOpenChange(false);
    };

    // Check if continue button should be disabled
    const isContinueDisabled = useMemo(() => {
        if (loading || isSubmitting) return true;
        if (!selectedScheme) return true;
        if (selectedScheme === 'insurance' && !selectedProvider) return true;
        return false;
    }, [loading, isSubmitting, selectedScheme, selectedProvider]);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={handleOverlayClick}
        >
            <div
                className="relative max-h-[85vh] w-[95%] max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header - Compact */}
                <div className="border-b border-slate-200/80 bg-gradient-to-r from-slate-50 to-blue-50/50 px-5 py-3.5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 shadow-lg shadow-blue-600/25">
                                <Calendar className="h-4.5 w-4.5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-base font-semibold text-slate-900">
                                    {title}
                                </h2>
                                <p className="text-xs text-slate-500">
                                    {subtitle}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleCancel}
                            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                            aria-label="Close modal"
                        >
                            <X className="h-4.5 w-4.5" />
                        </button>
                    </div>
                </div>

                {/* Body - Compact */}
                <div className="max-h-[calc(85vh-140px)] overflow-y-auto p-5">
                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
                        {/* Left Column - 3/5 */}
                        <div className="space-y-4 lg:col-span-3">
                            {/* Patient Info - Compact */}
                            {normalizedPatient && (
                                <div>
                                    <div className="mb-1.5 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                                        Patient
                                    </div>
                                    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/50 px-3.5 py-2">
                                        <div className="flex items-center gap-2.5">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                                                <Users2Icon className="h-4 w-4 text-blue-600" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-slate-900">
                                                    {normalizedPatient.name}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {normalizedPatient.gender} •{' '}
                                                    {normalizedPatient.age}{' '}
                                                    years
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[9px] tracking-wide text-slate-400 uppercase">
                                                MRN
                                            </p>
                                            <p className="font-mono text-xs font-medium text-slate-700">
                                                {
                                                    normalizedPatient.patientNumber
                                                }
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Payment Method - Compact */}
                            <div>
                                <div className="mb-2 flex items-center justify-between">
                                    <Label className="text-xs font-semibold text-slate-700">
                                        Payment Method{' '}
                                        <span className="text-red-500">*</span>
                                    </Label>
                                    {selectedScheme && (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-600">
                                            <CheckCircle2 className="h-3 w-3" />
                                            Selected
                                        </span>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-2.5">
                                    {defaultSchemes.map((scheme) => {
                                        const Icon = scheme.icon;
                                        const isSelected =
                                            selectedScheme === scheme.id;

                                        return (
                                            <button
                                                key={scheme.id}
                                                type="button"
                                                onClick={() =>
                                                    handleSchemeSelect(
                                                        scheme.id,
                                                    )
                                                }
                                                className={cn(
                                                    'relative flex items-center gap-3 rounded-lg border-2 p-2.5 text-left transition-all focus:ring-2 focus:ring-blue-500 focus:outline-none',
                                                    isSelected
                                                        ? 'border-blue-600 bg-blue-50 shadow-md shadow-blue-100/50'
                                                        : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50',
                                                )}
                                            >
                                                <div
                                                    className={cn(
                                                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                                                        isSelected
                                                            ? 'bg-blue-600'
                                                            : 'bg-slate-100',
                                                    )}
                                                >
                                                    <Icon
                                                        className={cn(
                                                            'h-4 w-4',
                                                            isSelected
                                                                ? 'text-white'
                                                                : 'text-slate-500',
                                                        )}
                                                    />
                                                </div>
                                                <div className="min-w-0">
                                                    <p
                                                        className={cn(
                                                            'text-sm font-semibold',
                                                            isSelected
                                                                ? 'text-blue-700'
                                                                : 'text-slate-700',
                                                        )}
                                                    >
                                                        {scheme.label}
                                                    </p>
                                                    <p className="text-[10px] text-slate-500">
                                                        {scheme.description}
                                                    </p>
                                                </div>
                                                {isSelected && (
                                                    <div className="absolute -top-1.5 -right-1.5">
                                                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 shadow-lg shadow-blue-600/30">
                                                            <CheckCircle2 className="h-3 w-3 text-white" />
                                                        </div>
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Insurance Providers - Compact */}
                            {selectedScheme === 'insurance' && (
                                <div className="animate-in duration-200 fade-in slide-in-from-top-2">
                                    <div className="mb-2 flex items-center justify-between">
                                        <Label className="text-xs font-semibold text-slate-700">
                                            Insurance Provider{' '}
                                            <span className="text-red-500">
                                                *
                                            </span>
                                        </Label>
                                        {selectedProvider && (
                                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-600">
                                                <CheckCircle2 className="h-3 w-3" />
                                                Selected
                                            </span>
                                        )}
                                    </div>
                                    <div className="max-h-[150px] space-y-1.5 overflow-y-auto pr-1">
                                        {filteredProviders.length === 0 ? (
                                            <div className="flex h-[80px] items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-slate-50">
                                                <div className="text-center">
                                                    <Building2 className="mx-auto h-6 w-6 text-slate-400" />
                                                    <p className="mt-1 text-xs font-medium text-slate-600">
                                                        No providers available
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            filteredProviders.map(
                                                (provider) => {
                                                    const isSelected =
                                                        selectedProvider ===
                                                        provider.id;
                                                    const providerName =
                                                        provider.name ||
                                                        provider.scheme_name ||
                                                        'Unnamed Provider';

                                                    return (
                                                        <button
                                                            key={provider.id}
                                                            type="button"
                                                            onClick={() =>
                                                                handleProviderSelect(
                                                                    provider.id,
                                                                )
                                                            }
                                                            className={cn(
                                                                'flex w-full items-center gap-3 rounded-lg border-2 p-2 text-left transition-all focus:ring-2 focus:ring-blue-500 focus:outline-none',
                                                                isSelected
                                                                    ? 'border-blue-600 bg-blue-50 shadow-md shadow-blue-100/50'
                                                                    : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50',
                                                            )}
                                                        >
                                                            <div
                                                                className={cn(
                                                                    'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2',
                                                                    isSelected
                                                                        ? 'border-blue-600 bg-blue-600'
                                                                        : 'border-slate-300',
                                                                )}
                                                            >
                                                                {isSelected && (
                                                                    <CheckCircle2 className="h-2.5 w-2.5 text-white" />
                                                                )}
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <p
                                                                    className={cn(
                                                                        'text-sm font-medium',
                                                                        isSelected
                                                                            ? 'text-blue-700'
                                                                            : 'text-slate-700',
                                                                    )}
                                                                >
                                                                    {
                                                                        providerName
                                                                    }
                                                                </p>
                                                                <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                                                    {provider.code && (
                                                                        <span>
                                                                            Code:{' '}
                                                                            {
                                                                                provider.code
                                                                            }
                                                                        </span>
                                                                    )}
                                                                    {provider.normalizedType && (
                                                                        <span className="capitalize">
                                                                            {
                                                                                provider.normalizedType
                                                                            }
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            {isSelected && (
                                                                <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-600" />
                                                            )}
                                                        </button>
                                                    );
                                                },
                                            )
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right Column - 2/5 - Compact */}
                        <div className="space-y-3 lg:col-span-2">
                            {/* Summary Card - Compact */}
                            <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                                <h3 className="mb-2 text-xs font-semibold tracking-wider text-slate-700 uppercase">
                                    Visit Summary
                                </h3>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-slate-500">
                                            Patient
                                        </span>
                                        <span className="max-w-[120px] truncate font-medium text-slate-700">
                                            {normalizedPatient?.name || '—'}
                                        </span>
                                    </div>
                                    <Separator className="bg-slate-200/60" />

                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-slate-500">
                                            Scheme
                                        </span>
                                        <span className="font-medium text-slate-700">
                                            {selectedScheme
                                                ? defaultSchemes.find(
                                                      (s) =>
                                                          s.id ===
                                                          selectedScheme,
                                                  )?.label || selectedScheme
                                                : 'Not selected'}
                                        </span>
                                    </div>
                                    <Separator className="bg-slate-200/60" />

                                    {selectedScheme === 'insurance' && (
                                        <>
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-slate-500">
                                                    Provider
                                                </span>
                                                <span className="max-w-[120px] truncate font-medium text-slate-700">
                                                    {selectedProvider
                                                        ? filteredProviders.find(
                                                              (p) =>
                                                                  p.id ===
                                                                  selectedProvider,
                                                          )?.name || 'Selected'
                                                        : 'Not selected'}
                                                </span>
                                            </div>
                                            <Separator className="bg-slate-200/60" />
                                        </>
                                    )}

                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-slate-500">
                                            Status
                                        </span>
                                        <span
                                            className={cn(
                                                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium',
                                                selectedScheme
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-slate-100 text-slate-500',
                                            )}
                                        >
                                            <span
                                                className={cn(
                                                    'h-1.5 w-1.5 rounded-full',
                                                    selectedScheme
                                                        ? 'bg-green-500'
                                                        : 'bg-slate-400',
                                                )}
                                            />
                                            {selectedScheme
                                                ? 'Ready'
                                                : 'Pending'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Pricing Status - Compact */}
                            <div
                                className={cn(
                                    'rounded-lg border p-3',
                                    selectedScheme
                                        ? 'border-green-200 bg-green-50/50'
                                        : 'border-slate-200 bg-slate-50/50',
                                )}
                            >
                                <div className="flex items-center gap-2.5">
                                    <div
                                        className={cn(
                                            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                                            selectedScheme
                                                ? 'bg-green-100'
                                                : 'bg-slate-100',
                                        )}
                                    >
                                        {selectedScheme ? (
                                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                                        ) : (
                                            <DatabaseIcon className="h-4 w-4 text-slate-400" />
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-medium text-slate-700">
                                            {selectedScheme
                                                ? 'Pricing profile ready'
                                                : 'Pricing profile'}
                                        </p>
                                        {selectedScheme === 'insurance' &&
                                            selectedProvider && (
                                                <p className="truncate text-[10px] text-green-600">
                                                    {filteredProviders.find(
                                                        (p) =>
                                                            p.id ===
                                                            selectedProvider,
                                                    )?.name ||
                                                        'Provider selected'}
                                                </p>
                                            )}
                                        {selectedScheme === 'cash' && (
                                            <p className="text-[10px] text-green-600">
                                                Cash payment selected
                                            </p>
                                        )}
                                    </div>
                                    {selectedScheme && (
                                        <span className="text-[10px] font-medium text-green-600">
                                            Ready
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Error - Compact */}
                    {error && (
                        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5">
                            <p className="text-xs text-red-600">{error}</p>
                        </div>
                    )}
                </div>

                {/* Footer - Compact */}
                <div className="border-t border-slate-200/80 bg-slate-50/80 px-5 py-2.5">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] text-slate-500">
                            {selectedScheme === 'insurance' && !selectedProvider
                                ? 'Please select an insurance provider'
                                : selectedScheme
                                  ? 'Ready to start the patient visit'
                                  : 'Select a payment scheme to continue'}
                        </p>
                        <div className="flex items-center gap-2.5">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={handleCancel}
                                disabled={loading || isSubmitting}
                                className="h-7 px-3 text-xs text-slate-600 hover:bg-slate-100"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                onClick={handleSubmit}
                                disabled={isContinueDisabled}
                                className="h-7 bg-blue-600 px-4 text-xs font-medium text-white shadow-lg shadow-blue-600/30 hover:bg-blue-700 hover:shadow-blue-600/40 disabled:opacity-50 disabled:shadow-none"
                            >
                                {loading || isSubmitting ? (
                                    <>
                                        <span className="mr-1.5 inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        Start Visit
                                        <ChevronRight className="ml-1 h-3.5 w-3.5" />
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PatientVisitSchemeModal;
