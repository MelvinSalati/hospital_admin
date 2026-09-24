// pages/patients/MCH.tsx
import { usePage, router } from '@inertiajs/react';
import {
    Baby,
    HeartPulse,
    Stethoscope,
    Calendar,
    Activity,
    Droplet,
} from 'lucide-react';
import Notiflix from 'notiflix';
import { useMemo } from 'react';
import PageHeader from '@/components/PageHeader';
import type { Column, Action } from '@/components/ReusableTable';
import ReusableTable from '@/components/ReusableTable';
import PatientLayout from '@/layouts/patients/PatientLayout';
import Http from '@/utils/Http';
import type { CartItem } from './components/PreviousOrdersTable';
import PreviousOrdersTable from './components/PreviousOrdersTable';

// ─── Page props coming from the Laravel controller ────────────────────────────
interface MCHProps {
    patientId: string;
    services: Array<{
        id: number;
        service_name: string;
        service_category?: string;
        price: number | string;
    }>;
    previousOrders: Array<{
        id: string;
        order_number: string;
        service_name: string;
        service_category: string;
        quantity: number;
        unit_price: number;
        total_price: number;
        status: 'pending' | 'completed' | 'cancelled';
        priority?: string;
        created_at: string;
    }> | null;
    antenatalVisits?: Array<any>;
    postnatalVisits?: Array<any>;
    childHealthRecords?: Array<any>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (dateStr?: string): string => {
    if (!dateStr) return '—';
    try {
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    } catch {
        return dateStr;
    }
};

/**
 * Derive the MCH order type from the categories of the selected services.
 * Falls back to 'antenatal' when nothing matches — same default as the old
 * tab-based version.
 */
const deriveOrderType = (items: CartItem[]): string => {
    const categories = items
        .map((i) => (i.service_category || '').toLowerCase())
        .filter(Boolean);

    if (categories.some((c) => c.includes('postnatal'))) return 'postnatal';
    if (categories.some((c) => c.includes('child') || c.includes('paediatric')))
        return 'child_health';
    if (categories.some((c) => c.includes('antenatal'))) return 'antenatal';

    // Fallback — keeps backward compatibility with the old default
    return 'antenatal';
};

// ─── Risk Level Badge ────────────────────────────────────────────────────────

const RiskLevelBadge: React.FC<{ level?: string }> = ({ level }) => {
    const normalized = (level || 'normal').toLowerCase();
    const config: Record<
        string,
        { label: string; bg: string; border: string }
    > = {
        high: {
            label: 'High Risk',
            bg: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400',
            border: 'border-red-200 dark:border-red-800',
        },
        medium: {
            label: 'Medium Risk',
            bg: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
            border: 'border-amber-200 dark:border-amber-800',
        },
        normal: {
            label: 'Normal',
            bg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
            border: 'border-emerald-200 dark:border-emerald-800',
        },
        low: {
            label: 'Low Risk',
            bg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
            border: 'border-emerald-200 dark:border-emerald-800',
        },
    };
    const { label, bg, border } = config[normalized] || config.normal;
    return (
        <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${bg} ${border}`}
        >
            {label}
        </span>
    );
};

// ─── Section Heading ─────────────────────────────────────────────────────────

const SectionHeading: React.FC<{
    icon: React.ReactNode;
    title: string;
    subtitle?: string;
    count?: number;
    tone?: 'pink' | 'blue' | 'emerald';
}> = ({ icon, title, subtitle, count, tone = 'blue' }) => {
    const tones = {
        pink: 'bg-pink-100 text-pink-600 dark:bg-pink-950/40 dark:text-pink-400',
        blue: 'bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400',
        emerald:
            'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
    };
    return (
        <div className="mb-3 flex items-center gap-2.5">
            <div
                className={`flex h-8 w-8 items-center justify-center rounded-lg ${tones[tone]}`}
            >
                {icon}
            </div>
            <div>
                <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold tracking-tight text-slate-800 dark:text-slate-100">
                        {title}
                    </h3>
                    {typeof count === 'number' && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-400">
                            {count}
                        </span>
                    )}
                </div>
                {subtitle && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {subtitle}
                    </p>
                )}
            </div>
        </div>
    );
};

// ─── Main Component ──────────────────────────────────────────────────────────

export default function MCH() {
    const {
        patientId,
        services,
        previousOrders,
        antenatalVisits,
        postnatalVisits,
        childHealthRecords,
    } = usePage<MCHProps>().props;

    /**
     * Called when the ServiceModal saves.
     * The `type` is now derived from the selected services' categories
     * instead of being driven by a tab.
     */
    const handleSaveOrder = async (items: CartItem[], identifier: string) => {
        try {
            const orderType = deriveOrderType(items);

            const response = await Http.post(
                `patients/${identifier}/martenal-orders`,
                {
                    patient_id: identifier,
                    type: orderType,
                    services: items.map((item) => ({
                        id: item.id,
                        service_name: item.service_name,
                        service_category: item.service_category || 'MCH',
                        price: item.price,
                        quantity: item.quantity || 1,
                        notes: item.notes ?? null,
                        priority: item.priority || 'routine',
                        modality: item.modality || null,
                        body_part: item.body_part || null,
                        total_amount: (item.price || 0) * (item.quantity || 1),
                    })),
                },
            );
            if (response.status === 200 || response.status === 201) {
                Notiflix.Notify.success(
                    response.data.message || 'Order saved successfully',
                );
                router.reload({ only: ['previousOrders'] });
            } else if (response.data.status === 400) {
                Notiflix.Notify.failure(response.data.message);
            }
        } catch (error) {
            Notiflix.Notify.failure(
                'You have already initialized this MCH order.',
            );
        }
    };

    // ─── Antenatal Visits Columns ────────────────────────────────────────────

    const antenatalColumns: Column<any>[] = useMemo(
        () => [
            {
                id: 'visit_date',
                label: 'Visit Date',
                sortable: true,
                format: (value) => (
                    <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-slate-400" />
                        <span className="text-[11px] text-slate-700 dark:text-slate-300">
                            {formatDate(value)}
                        </span>
                    </div>
                ),
            },
            {
                id: 'gestational_age_weeks',
                label: 'Gestational Age',
                sortable: true,
                format: (value) => (
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
                        {value ?? '—'} weeks
                    </span>
                ),
            },
            {
                id: 'risk_level',
                label: 'Risk Level',
                sortable: true,
                format: (value) => <RiskLevelBadge level={value} />,
            },
            {
                id: 'next_visit_date',
                label: 'Next Visit',
                sortable: true,
                format: (value) => (
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        {value ? formatDate(value) : 'N/A'}
                    </span>
                ),
            },
        ],
        [],
    );

    // ─── Postnatal Visits Columns ────────────────────────────────────────────

    const postnatalColumns: Column<any>[] = useMemo(
        () => [
            {
                id: 'visit_date',
                label: 'Visit Date',
                sortable: true,
                format: (value) => (
                    <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-slate-400" />
                        <span className="text-[11px] text-slate-700 dark:text-slate-300">
                            {formatDate(value)}
                        </span>
                    </div>
                ),
            },
            {
                id: 'baby_weight',
                label: 'Baby Weight',
                sortable: true,
                format: (value) => (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                        <Activity size={12} className="text-slate-400" />
                        {value ?? '—'} kg
                    </span>
                ),
            },
            {
                id: 'immunization_given',
                label: 'Immunization',
                sortable: false,
                format: (value) =>
                    value ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                            <Droplet size={10} />
                            {value}
                        </span>
                    ) : (
                        <span className="text-[11px] text-slate-400">N/A</span>
                    ),
            },
            {
                id: 'breastfeeding_status',
                label: 'Breastfeeding',
                sortable: false,
                format: (value) => (
                    <span className="text-[11px] text-slate-600 capitalize dark:text-slate-400">
                        {value || 'N/A'}
                    </span>
                ),
            },
        ],
        [],
    );

    // ─── Child Health Columns ────────────────────────────────────────────────

    const childHealthColumns: Column<any>[] = useMemo(
        () => [
            {
                id: 'child_name',
                label: 'Child Name',
                sortable: true,
                format: (value) => (
                    <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-pink-100 dark:bg-pink-950/40">
                            <Baby
                                size={12}
                                className="text-pink-600 dark:text-pink-400"
                            />
                        </div>
                        <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                            {value || 'Unnamed'}
                        </span>
                    </div>
                ),
            },
            {
                id: 'child_dob',
                label: 'Date of Birth',
                sortable: true,
                format: (value) => (
                    <span className="text-[11px] text-slate-600 dark:text-slate-400">
                        {formatDate(value)}
                    </span>
                ),
            },
            {
                id: 'gender',
                label: 'Gender',
                sortable: true,
                format: (value) => (
                    <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${
                            value?.toLowerCase() === 'male'
                                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'
                                : value?.toLowerCase() === 'female'
                                  ? 'bg-pink-50 text-pink-700 dark:bg-pink-950/40 dark:text-pink-400'
                                  : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                        }`}
                    >
                        {value || '—'}
                    </span>
                ),
            },
            {
                id: 'birth_weight',
                label: 'Birth Weight',
                sortable: true,
                format: (value) => (
                    <span className="text-[11px] font-medium text-slate-700 tabular-nums dark:text-slate-300">
                        {value ?? '—'} kg
                    </span>
                ),
            },
        ],
        [],
    );

    // Empty actions — tables are read-only views of visit history
    const emptyActions: Action<any>[] = [];

    const hasAntenatal = (antenatalVisits?.length ?? 0) > 0;
    const hasPostnatal = (postnatalVisits?.length ?? 0) > 0;
    const hasChildHealth = (childHealthRecords?.length ?? 0) > 0;

    // ─── Render ──────────────────────────────────────────────────────────────

    return (
        <PatientLayout
            breadcrumbs={[
                { title: 'Patient', href: '/' },
                { title: 'MCH', href: '/' },
                { title: 'Services', href: '/' },
            ]}
        >
            <div className="h-full space-y-6 bg-blue-50 p-2">
                <PageHeader
                    icon={<HeartPulse className="h-6 w-6" />}
                    title="Maternal & Child Health"
                    subtitle="Order MCH services and review visit history for this patient"
                />

                {/* ─── Services / Orders (single, service-driven) ──────────── */}
                <div className="rounded-sm bg-white p-4">
                    <PreviousOrdersTable
                        patientId={patientId}
                        services={services}
                        previousOrders={previousOrders}
                        onSaveOrder={handleSaveOrder}
                        orderLabel="MCH Service"
                    />
                </div>

                {/* ─── Visit History ──────────────────────────────────────── */}
                {hasAntenatal && (
                    <div className="rounded-sm bg-white p-4">
                        <SectionHeading
                            icon={<Stethoscope size={16} />}
                            title="Antenatal Visit History"
                            subtitle={`${antenatalVisits!.length} visit${
                                antenatalVisits!.length === 1 ? '' : 's'
                            } recorded`}
                            count={antenatalVisits!.length}
                            tone="blue"
                        />
                        <ReusableTable
                            title=""
                            columns={antenatalColumns}
                            data={antenatalVisits!}
                            actions={emptyActions}
                            loading={false}
                            filterPlaceholder="Search antenatal visits..."
                            rowsPerPageOptions={[5, 10, 25]}
                            defaultRowsPerPage={5}
                            defaultOrderBy="visit_date"
                            emptyMessage="No antenatal visits recorded"
                        />
                    </div>
                )}

                {hasPostnatal && (
                    <div className="rounded-sm bg-white p-4">
                        <SectionHeading
                            icon={<HeartPulse size={16} />}
                            title="Postnatal Visit History"
                            subtitle={`${postnatalVisits!.length} visit${
                                postnatalVisits!.length === 1 ? '' : 's'
                            } recorded`}
                            count={postnatalVisits!.length}
                            tone="pink"
                        />
                        <ReusableTable
                            title=""
                            columns={postnatalColumns}
                            data={postnatalVisits!}
                            actions={emptyActions}
                            loading={false}
                            filterPlaceholder="Search postnatal visits..."
                            rowsPerPageOptions={[5, 10, 25]}
                            defaultRowsPerPage={5}
                            defaultOrderBy="visit_date"
                            emptyMessage="No postnatal visits recorded"
                        />
                    </div>
                )}

                {hasChildHealth && (
                    <div className="rounded-sm bg-white p-4">
                        <SectionHeading
                            icon={<Baby size={16} />}
                            title="Child Health Records"
                            subtitle={`${childHealthRecords!.length} record${
                                childHealthRecords!.length === 1 ? '' : 's'
                            } available`}
                            count={childHealthRecords!.length}
                            tone="emerald"
                        />
                        <ReusableTable
                            title=""
                            columns={childHealthColumns}
                            data={childHealthRecords!}
                            actions={emptyActions}
                            loading={false}
                            filterPlaceholder="Search child records..."
                            rowsPerPageOptions={[5, 10, 25]}
                            defaultRowsPerPage={5}
                            defaultOrderBy="child_name"
                            emptyMessage="No child health records available"
                        />
                    </div>
                )}
            </div>
        </PatientLayout>
    );
}
