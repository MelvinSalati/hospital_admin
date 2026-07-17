// components/VisitDetailsModal.tsx
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    X,
    Calendar,
    Heart,
    Activity,
    Weight,
    Ruler,
    Thermometer,
    Droplets,
    Baby,
    AlertTriangle,
    CheckCircle,
    Clock,
    User,
    Stethoscope,
} from 'lucide-react';

interface AntenatalVisit {
    id: number;
    visit_number: number;
    visit_date: string;
    checkup_type: string;
    gestational_age_weeks: number;
    edd: string;
    lmp: string;
    gravidity: number;
    parity: number;
    vitals?: {
        weight: number;
        height: number;
        bmi: number;
        bp: string;
        temperature: number;
        pulse_rate: number;
        respiratory_rate: number;
    };
    fetal_assessment?: {
        fundal_height: number;
        fetal_heart_rate: number;
        fetal_presentation: string;
        fetal_movement: boolean;
    };
    danger_signs?: {
        vaginal_bleeding: boolean;
        severe_headache: boolean;
        blurred_vision: boolean;
        convulsions: boolean;
        reduced_fetal_movement: boolean;
        severe_abdominal_pain: boolean;
        fever: boolean;
        leakage_of_liquor: boolean;
    };
    risk_level: string;
    next_visit_date: string;
    recommendations: string;
}

interface PostnatalVisit {
    id: number;
    visit_number: number;
    visit_date: string;
    checkup_type: string;
    baby_weight?: number;
    immunization?: string;
    baby_health_status?: string;
    maternal_health_status?: string;
    breastfeeding_status?: string;
    family_planning_method?: string;
}

interface Props {
    open: boolean;
    visit: AntenatalVisit | PostnatalVisit | null;
    type: 'antenatal' | 'postnatal';
    onClose: () => void;
}

export default function VisitDetailsModal({
    open,
    visit,
    type,
    onClose,
}: Props) {
    if (!open || !visit) return null;

    const getRiskLevelColor = (risk: string) => {
        switch (risk?.toLowerCase()) {
            case 'critical':
                return 'bg-red-100 text-red-800 border-red-200';
            case 'high':
                return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'medium':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            default:
                return 'bg-green-100 text-green-800 border-green-200';
        }
    };

    const Section = ({
        title,
        icon: Icon,
        children,
    }: {
        title: string;
        icon: any;
        children: React.ReactNode;
    }) => (
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
            <div className="mb-3 flex items-center gap-2 border-b border-gray-200 pb-2">
                <Icon className="h-5 w-5 text-blue-500" />
                <h3 className="font-semibold text-gray-900">{title}</h3>
            </div>
            <div className="space-y-3">{children}</div>
        </div>
    );

    const InfoRow = ({
        label,
        value,
        icon: Icon,
    }: {
        label: string;
        value: any;
        icon?: any;
    }) => (
        <div className="flex items-start gap-3 text-sm">
            {Icon && <Icon className="mt-0.5 h-4 w-4 text-gray-400" />}
            <div className="flex-1">
                <span className="text-gray-500">{label}:</span>
                <span className="ml-2 font-medium text-gray-900">
                    {value || '—'}
                </span>
            </div>
        </div>
    );

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{
                backgroundColor: 'rgba(0,0,0,0.45)',
                backdropFilter: 'blur(4px)',
            }}
            onClick={onClose}
        >
            <div
                className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b bg-gradient-to-r from-blue-50 to-white px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="rounded-full bg-blue-100 p-2">
                            {type === 'antenatal' ? (
                                <Heart className="h-5 w-5 text-blue-600" />
                            ) : (
                                <Baby className="h-5 w-5 text-green-600" />
                            )}
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900">
                                {type === 'antenatal'
                                    ? 'Antenatal'
                                    : 'Postnatal'}{' '}
                                Visit Details
                            </h2>
                            <p className="text-sm text-gray-500">
                                Visit #{visit.visit_number} •{' '}
                                {new Date(
                                    visit.visit_date,
                                ).toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div
                    className="overflow-y-auto p-6"
                    style={{ maxHeight: 'calc(90vh - 80px)' }}
                >
                    {type === 'antenatal' ? (
                        <>
                            {/* Risk Level Banner */}
                            {(visit as AntenatalVisit).risk_level && (
                                <div
                                    className={`mb-6 rounded-lg border p-4 ${getRiskLevelColor((visit as AntenatalVisit).risk_level)}`}
                                >
                                    <div className="flex items-center gap-2">
                                        {(visit as AntenatalVisit)
                                            .risk_level === 'critical' ? (
                                            <AlertTriangle className="h-5 w-5" />
                                        ) : (
                                            <CheckCircle className="h-5 w-5" />
                                        )}
                                        <span className="font-semibold">
                                            Risk Level:{' '}
                                            {(
                                                (visit as AntenatalVisit)
                                                    .risk_level || 'LOW'
                                            ).toUpperCase()}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Pregnancy Information */}
                            <Section
                                title="Pregnancy Information"
                                icon={Calendar}
                            >
                                <InfoRow
                                    label="LMP"
                                    value={(visit as AntenatalVisit).lmp}
                                    icon={Calendar}
                                />
                                <InfoRow
                                    label="EDD"
                                    value={(visit as AntenatalVisit).edd}
                                    icon={Calendar}
                                />
                                <InfoRow
                                    label="Gestational Age"
                                    value={`${(visit as AntenatalVisit).gestational_age_weeks || '—'} weeks`}
                                    icon={Clock}
                                />
                                <InfoRow
                                    label="Gravidity"
                                    value={(visit as AntenatalVisit).gravidity}
                                    icon={User}
                                />
                                <InfoRow
                                    label="Parity"
                                    value={(visit as AntenatalVisit).parity}
                                    icon={User}
                                />
                            </Section>

                            {/* Vital Signs */}
                            {(visit as AntenatalVisit).vitals && (
                                <Section title="Vital Signs" icon={Activity}>
                                    <div className="grid grid-cols-2 gap-3">
                                        <InfoRow
                                            label="Weight"
                                            value={
                                                (visit as AntenatalVisit).vitals
                                                    ?.weight
                                                    ? `${(visit as AntenatalVisit).vitals?.weight} kg`
                                                    : null
                                            }
                                            icon={Weight}
                                        />
                                        <InfoRow
                                            label="Height"
                                            value={
                                                (visit as AntenatalVisit).vitals
                                                    ?.height
                                                    ? `${(visit as AntenatalVisit).vitals?.height} cm`
                                                    : null
                                            }
                                            icon={Ruler}
                                        />
                                        <InfoRow
                                            label="BMI"
                                            value={
                                                (visit as AntenatalVisit).vitals
                                                    ?.bmi
                                            }
                                            icon={Activity}
                                        />
                                        <InfoRow
                                            label="Blood Pressure"
                                            value={
                                                (visit as AntenatalVisit).vitals
                                                    ?.bp
                                            }
                                            icon={Droplets}
                                        />
                                        <InfoRow
                                            label="Temperature"
                                            value={
                                                (visit as AntenatalVisit).vitals
                                                    ?.temperature
                                                    ? `${(visit as AntenatalVisit).vitals?.temperature}°C`
                                                    : null
                                            }
                                            icon={Thermometer}
                                        />
                                        <InfoRow
                                            label="Pulse Rate"
                                            value={
                                                (visit as AntenatalVisit).vitals
                                                    ?.pulse_rate
                                                    ? `${(visit as AntenatalVisit).vitals?.pulse_rate} bpm`
                                                    : null
                                            }
                                            icon={Heart}
                                        />
                                    </div>
                                </Section>
                            )}

                            {/* Fetal Assessment */}
                            {(visit as AntenatalVisit).fetal_assessment && (
                                <Section title="Fetal Assessment" icon={Baby}>
                                    <InfoRow
                                        label="Fundal Height"
                                        value={
                                            (visit as AntenatalVisit)
                                                .fetal_assessment?.fundal_height
                                                ? `${(visit as AntenatalVisit).fetal_assessment?.fundal_height} cm`
                                                : null
                                        }
                                    />
                                    <InfoRow
                                        label="Fetal Heart Rate"
                                        value={
                                            (visit as AntenatalVisit)
                                                .fetal_assessment
                                                ?.fetal_heart_rate
                                                ? `${(visit as AntenatalVisit).fetal_assessment?.fetal_heart_rate} bpm`
                                                : null
                                        }
                                    />
                                    <InfoRow
                                        label="Fetal Presentation"
                                        value={
                                            (visit as AntenatalVisit)
                                                .fetal_assessment
                                                ?.fetal_presentation || '—'
                                        }
                                    />
                                    <InfoRow
                                        label="Fetal Movement"
                                        value={
                                            (visit as AntenatalVisit)
                                                .fetal_assessment
                                                ?.fetal_movement
                                                ? 'Present'
                                                : 'Not Present'
                                        }
                                    />
                                </Section>
                            )}

                            {/* Danger Signs */}
                            {(visit as AntenatalVisit).danger_signs &&
                                Object.values(
                                    (visit as AntenatalVisit).danger_signs!,
                                ).some((v) => v === true) && (
                                    <Section
                                        title="Danger Signs"
                                        icon={AlertTriangle}
                                    >
                                        <div className="space-y-2">
                                            {(visit as AntenatalVisit)
                                                .danger_signs
                                                ?.vaginal_bleeding && (
                                                <Badge
                                                    variant="destructive"
                                                    className="mr-2"
                                                >
                                                    Vaginal Bleeding
                                                </Badge>
                                            )}
                                            {(visit as AntenatalVisit)
                                                .danger_signs
                                                ?.severe_headache && (
                                                <Badge
                                                    variant="destructive"
                                                    className="mr-2"
                                                >
                                                    Severe Headache
                                                </Badge>
                                            )}
                                            {(visit as AntenatalVisit)
                                                .danger_signs
                                                ?.blurred_vision && (
                                                <Badge
                                                    variant="destructive"
                                                    className="mr-2"
                                                >
                                                    Blurred Vision
                                                </Badge>
                                            )}
                                            {(visit as AntenatalVisit)
                                                .danger_signs?.convulsions && (
                                                <Badge
                                                    variant="destructive"
                                                    className="mr-2"
                                                >
                                                    Convulsions
                                                </Badge>
                                            )}
                                            {(visit as AntenatalVisit)
                                                .danger_signs
                                                ?.reduced_fetal_movement && (
                                                <Badge
                                                    variant="destructive"
                                                    className="mr-2"
                                                >
                                                    Reduced Fetal Movement
                                                </Badge>
                                            )}
                                        </div>
                                    </Section>
                                )}

                            {/* Recommendations */}
                            {(visit as AntenatalVisit).recommendations && (
                                <Section
                                    title="Recommendations & Follow-up"
                                    icon={Stethoscope}
                                >
                                    <InfoRow
                                        label="Next Visit"
                                        value={
                                            (visit as AntenatalVisit)
                                                .next_visit_date
                                                ? new Date(
                                                      (visit as AntenatalVisit)
                                                          .next_visit_date!,
                                                  ).toLocaleDateString()
                                                : null
                                        }
                                    />
                                    <div className="mt-2 rounded-md bg-blue-50 p-3">
                                        <p className="text-sm text-gray-700">
                                            {
                                                (visit as AntenatalVisit)
                                                    .recommendations
                                            }
                                        </p>
                                    </div>
                                </Section>
                            )}
                        </>
                    ) : (
                        <>
                            {/* Postnatal Information */}
                            <Section title="Postnatal Information" icon={Baby}>
                                <InfoRow
                                    label="Visit Date"
                                    value={new Date(
                                        visit.visit_date,
                                    ).toLocaleDateString()}
                                    icon={Calendar}
                                />
                                <InfoRow
                                    label="Baby Weight"
                                    value={
                                        (visit as PostnatalVisit).baby_weight
                                            ? `${(visit as PostnatalVisit).baby_weight} kg`
                                            : null
                                    }
                                    icon={Weight}
                                />
                                <InfoRow
                                    label="Immunization Given"
                                    value={
                                        (visit as PostnatalVisit)
                                            .immunization || '—'
                                    }
                                    icon={CheckCircle}
                                />
                                <InfoRow
                                    label="Baby Health Status"
                                    value={
                                        (visit as PostnatalVisit)
                                            .baby_health_status || '—'
                                    }
                                    icon={Heart}
                                />
                                <InfoRow
                                    label="Maternal Health Status"
                                    value={
                                        (visit as PostnatalVisit)
                                            .maternal_health_status || '—'
                                    }
                                    icon={Activity}
                                />
                                <InfoRow
                                    label="Breastfeeding Status"
                                    value={
                                        (visit as PostnatalVisit)
                                            .breastfeeding_status || '—'
                                    }
                                    icon={Droplets}
                                />
                                <InfoRow
                                    label="Family Planning Method"
                                    value={
                                        (visit as PostnatalVisit)
                                            .family_planning_method || '—'
                                    }
                                    icon={Stethoscope}
                                />
                            </Section>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end border-t bg-gray-50 px-6 py-3">
                    <Button onClick={onClose} variant="outline">
                        Close
                    </Button>
                </div>
            </div>
        </div>
    );
}
