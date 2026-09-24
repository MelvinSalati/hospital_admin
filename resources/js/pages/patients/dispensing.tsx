import { usePage, router } from '@inertiajs/react';
import {
    Pill,
    Eye,
    CheckCircle2,
    Clock,
    X,
    Layers,
    ClipboardList,
    Truck,
} from 'lucide-react';
import Notiflix from 'notiflix';
import React, { useState } from 'react';
import PageHeader from '@/components/PageHeader';
import type { Column, Action } from '@/components/ReusableTable';
import ReusableTable from '@/components/ReusableTable';
import PatientLayout from '@/layouts/patients/PatientLayout';
import { dispensationAPI } from '@/services/api';

// Import modals
import ConfirmModal from './components/ConfirmModal';
import DispenseModal from './components/DispenseModal';
import ViewItemsModal from './components/ViewItemsModal';

// DEV MODE - Set to true to force all items as paid
const DEV_MODE = true;

// ─── Types ────────────────────────────────────────────────────────────────────

interface PrescriptionItem {
    id?: number;
    drug_id?: number;
    name?: string;
    medicine_name?: string;
    drug_name?: string;
    service_name?: string;
    dosage?: string;
    strength?: string;
    frequency?: string;
    route?: string;
    notes?: string;
    quantity?: number;
    dosage_amount?: number;
    quantity_dispensed?: number;
    price?: number | string;
    payment_status?: string;
    is_paid?: boolean;
    priority?: string;
}

interface Dispensation {
    id?: number;
    prescription_number: string;
    status:
        | 'pending'
        | 'partially_dispensed'
        | 'dispensed'
        | 'completed'
        | 'cancelled';
    items: PrescriptionItem[];
    invoice_status?: string;
    payment_scheme?: string;
    priority?: string;
    created_at?: string;
    prescribed_date?: string;
    patient_name?: string;
    patient_number?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const normalizeScheme = (scheme?: string) => {
    if (!scheme) return 'cash';
    const s = scheme.toLowerCase();
    if (['cash', 'nhima', 'insurance', 'charity', 'mobile_money'].includes(s)) {
        return s;
    }
    return 'cash';
};

const SCHEME_META: Record<
    string,
    { label: string; color: string; bg: string }
> = {
    cash: {
        label: 'Cash',
        color: 'text-emerald-700',
        bg: 'bg-emerald-50 border-emerald-200',
    },
    nhima: {
        label: 'NHIMA',
        color: 'text-blue-700',
        bg: 'bg-blue-50 border-blue-200',
    },
    insurance: {
        label: 'Insurance',
        color: 'text-violet-700',
        bg: 'bg-violet-50 border-violet-200',
    },
    charity: {
        label: 'Charity',
        color: 'text-amber-700',
        bg: 'bg-amber-50 border-amber-200',
    },
    mobile_money: {
        label: 'Mobile Money',
        color: 'text-emerald-700',
        bg: 'bg-emerald-50 border-emerald-200',
    },
};

const getSchemeMeta = (scheme?: string) => {
    const normalized = normalizeScheme(scheme);
    return SCHEME_META[normalized] || SCHEME_META.cash;
};

const formatDate = (date?: string): string => {
    if (!date) return 'N/A';
    try {
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    } catch {
        return 'N/A';
    }
};

// ─── Priority meta ───────────────────────────────────────────────────────────

const PRIORITY_META: Record<
    string,
    { label: string; color: string; bg: string; dot: string }
> = {
    stat: {
        label: 'STAT',
        color: 'text-red-700',
        bg: 'bg-red-50 border-red-200',
        dot: 'bg-red-500',
    },
    urgent: {
        label: 'Urgent',
        color: 'text-amber-700',
        bg: 'bg-amber-50 border-amber-200',
        dot: 'bg-amber-500',
    },
    routine: {
        label: 'Routine',
        color: 'text-slate-600',
        bg: 'bg-slate-50 border-slate-200',
        dot: 'bg-slate-400',
    },
};

const getPriorityMeta = (priority?: string) => {
    const key = (priority || 'routine').toLowerCase();
    return PRIORITY_META[key] || PRIORITY_META.routine;
};

// ─── Main Component ──────────────────────────────────────────────────────────

export default function Dispensation() {
    const { dispensations } = usePage().props as {
        dispensations?: Dispensation[];
    };

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPrescription, setSelectedPrescription] =
        useState<Dispensation | null>(null);
    const [isDispensing, setIsDispensing] = useState(false);
    const [editedItems, setEditedItems] = useState<any[]>([]);
    const [showRemoveConfirm, setShowRemoveConfirm] = useState<any>(null);
    const [viewItemsModalOpen, setViewItemsModalOpen] = useState(false);

    // ─── Payment helpers ─────────────────────────────────────────────────────
    // NOTE: Prescription prices are FIXED per course — never multiply by qty.
    // These are still used by the ViewItemsModal and DispenseModal for
    // payment gating (unpaid items cannot be dispensed).

    const isItemPaid = (item: PrescriptionItem) => {
        if (DEV_MODE) return true;
        if (item.payment_status) {
            return (
                item.payment_status === 'paid' ||
                item.payment_status === 'completed'
            );
        }
        if (selectedPrescription?.invoice_status) {
            return (
                selectedPrescription.invoice_status === 'paid' ||
                selectedPrescription.invoice_status === 'completed'
            );
        }
        return false;
    };

    const areAllItemsPaid = (items?: PrescriptionItem[]) => {
        if (!items || items.length === 0) return false;
        if (DEV_MODE) return true;
        return items.every((item) => isItemPaid(item));
    };

    const getPaidItemsCount = (items?: PrescriptionItem[]) => {
        if (DEV_MODE) return items?.length || 0;
        return items?.filter((item) => isItemPaid(item)).length || 0;
    };

    const getTotalItems = (items?: PrescriptionItem[]) => items?.length || 0;

    const getTotalQuantity = (items?: PrescriptionItem[]) => {
        return (
            items?.reduce(
                (sum, item) => sum + (item.quantity || item.dosage_amount || 1),
                0,
            ) || 0
        );
    };

    const getTotalDispensedQuantity = (items?: PrescriptionItem[]) => {
        return (
            items?.reduce(
                (sum, item) => sum + (item.quantity_dispensed || 0),
                0,
            ) || 0
        );
    };

    // ✅ FIX: Fixed course price only — no qty multiplication
    const getTotalPaidAmount = (items?: PrescriptionItem[]) => {
        return (
            items?.reduce((sum, item) => {
                if (!item.is_paid) return sum;
                const price =
                    typeof item.price === 'string'
                        ? parseFloat(item.price)
                        : item.price || 0;
                return sum + (isNaN(price) ? 0 : price);
            }, 0) || 0
        );
    };

    // ─── Derived progress helpers ────────────────────────────────────────────

    const getDispensedCount = (items?: PrescriptionItem[]) => {
        if (!items) return 0;
        return items.filter(
            (item) =>
                item.quantity_dispensed !== undefined &&
                item.quantity_dispensed !== null &&
                item.quantity_dispensed >=
                    (item.quantity || item.dosage_amount || 1),
        ).length;
    };

    const getOverallPriority = (row: Dispensation): string => {
        if (row.priority) return row.priority;
        const itemPriorities = (row.items || [])
            .map((i) => i.priority)
            .filter(Boolean) as string[];
        if (itemPriorities.includes('stat')) return 'stat';
        if (itemPriorities.includes('urgent')) return 'urgent';
        return 'routine';
    };

    // ─── Handlers ────────────────────────────────────────────────────────────

    const handleViewItems = (prescription: Dispensation) => {
        setSelectedPrescription(prescription);
        setViewItemsModalOpen(true);
    };

    const handleDispenseClick = (prescription: Dispensation) => {
        if (!DEV_MODE) {
            const hasPaidItems = prescription.items?.some((item) =>
                isItemPaid(item),
            );
            if (!hasPaidItems) {
                Notiflix.Notify.warning(
                    'Cannot dispense: No items have been paid for.',
                );
                return;
            }
        }

        const initialItems =
            prescription.items?.map((item) => {
                const isPaid = DEV_MODE ? true : isItemPaid(item);
                const prescribedQty = item.quantity || item.dosage_amount || 1;
                return {
                    ...item,
                    original_quantity: prescribedQty,
                    quantity_dispensed: isPaid ? prescribedQty : 0,
                    quantity_prescribed: prescribedQty,
                    status: isPaid ? 'pending' : 'not_dispensed',
                    reason_not_dispensed: isPaid ? null : 'payment_pending',
                    is_removed: !isPaid,
                    is_paid: isPaid,
                };
            }) || [];

        setSelectedPrescription(prescription);
        setEditedItems(initialItems);
        setIsModalOpen(true);
    };

    const handleRemoveItem = (itemIndex: number) => {
        const item = editedItems[itemIndex];
        if (!item.is_paid && !DEV_MODE) {
            Notiflix.Notify.warning('Cannot remove unpaid item.');
            return;
        }
        setShowRemoveConfirm({
            index: itemIndex,
            item: editedItems[itemIndex],
        });
    };

    const confirmRemoveItem = () => {
        if (showRemoveConfirm) {
            const updatedItems = [...editedItems];
            updatedItems[showRemoveConfirm.index] = {
                ...updatedItems[showRemoveConfirm.index],
                quantity_dispensed: 0,
                is_removed: true,
                reason_not_dispensed: 'out_of_stock',
                status: 'not_dispensed',
            };
            setEditedItems(updatedItems);
            setShowRemoveConfirm(null);
        }
    };

    const handleUpdateQuantity = (itemIndex: number, newQuantity: number) => {
        const updatedItems = [...editedItems];
        const item = updatedItems[itemIndex];
        if (!item.is_paid && !DEV_MODE) {
            Notiflix.Notify.warning('Cannot dispense unpaid item.');
            return;
        }
        const maxQuantity = item.original_quantity;
        const quantity = Math.max(0, Math.min(maxQuantity, newQuantity));
        updatedItems[itemIndex] = {
            ...item,
            quantity_dispensed: quantity,
            is_removed: quantity === 0,
            status:
                quantity === 0
                    ? 'not_dispensed'
                    : quantity < maxQuantity
                      ? 'partially_dispensed'
                      : 'dispensed',
            reason_not_dispensed:
                quantity === 0
                    ? item.reason_not_dispensed || 'out_of_stock'
                    : null,
        };
        setEditedItems(updatedItems);
    };

    const handleDispenseAll = async () => {
        if (selectedPrescription) {
            setIsDispensing(true);
            try {
                const itemsToDispense = editedItems.filter(
                    (item) => item.quantity_dispensed > 0 && item.is_paid,
                );
                if (itemsToDispense.length === 0) {
                    Notiflix.Notify.warning('No items to dispense.');
                    setIsDispensing(false);
                    return;
                }

                const dispensationData = {
                    items: itemsToDispense.map((item) => ({
                        drug_id: item.id || item.drug_id,
                        drug_name:
                            item.name ||
                            item.medicine_name ||
                            item.drug_name ||
                            item.service_name,
                        quantity_dispensed: item.quantity_dispensed,
                        quantity_prescribed: item.original_quantity,
                        dosage: item.dosage || item.strength,
                        frequency: item.frequency,
                        route: item.route,
                        notes: item.notes,
                        reason_not_dispensed: null,
                        payment_status: 'paid',
                    })),
                    dispensed_at: new Date().toISOString(),
                    status: itemsToDispense.some(
                        (item) =>
                            item.quantity_dispensed < item.original_quantity,
                    )
                        ? 'partially_dispensed'
                        : 'dispensed',
                };

                const response = await dispensationAPI.dispense(
                    selectedPrescription.prescription_number,
                    dispensationData,
                );
                if (response.data.success) {
                    setIsModalOpen(false);
                    setSelectedPrescription(null);
                    setEditedItems([]);
                    setIsDispensing(false);
                    Notiflix.Notify.success(
                        'Dispensation completed successfully!',
                    );
                    router.reload({
                        preserveScroll: true,
                        preserveState: true,
                        only: ['dispensations'],
                    });
                }
            } catch (error: any) {
                console.error('Dispensation failed:', error);
                setIsDispensing(false);
                Notiflix.Notify.failure(
                    error.response?.data?.message || 'Dispensation failed.',
                );
            }
        }
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedPrescription(null);
        setEditedItems([]);
        setShowRemoveConfirm(null);
    };

    const closeViewModal = () => {
        setViewItemsModalOpen(false);
        setSelectedPrescription(null);
    };

    // ─── Status badge config ─────────────────────────────────────────────────

    const getStatusBadge = (status: string) => {
        const configs: Record<
            string,
            { label: string; gradient: string; icon: JSX.Element }
        > = {
            pending: {
                label: 'Pending',
                gradient: 'from-amber-400 to-amber-500',
                icon: <Clock size={14} />,
            },
            partially_dispensed: {
                label: 'Partial',
                gradient: 'from-blue-400 to-blue-500',
                icon: <Layers size={14} />,
            },
            dispensed: {
                label: 'Dispensed',
                gradient: 'from-emerald-400 to-emerald-500',
                icon: <CheckCircle2 size={14} />,
            },
            completed: {
                label: 'Completed',
                gradient: 'from-emerald-400 to-emerald-500',
                icon: <CheckCircle2 size={14} />,
            },
            cancelled: {
                label: 'Cancelled',
                gradient: 'from-red-400 to-red-500',
                icon: <X size={14} />,
            },
        };
        return (
            configs[status?.toLowerCase()] || {
                label: status || 'Unknown',
                gradient: 'from-gray-400 to-gray-500',
                icon: <Clock size={14} />,
            }
        );
    };

    // ─── Table Columns ───────────────────────────────────────────────────────
    // Dispenser-focused: no prices, no totals — just what to pull, how much
    // has been done, who to route to, and how urgent it is.

    const columns: Column<Dispensation>[] = [
        {
            id: 'prescription_number',
            label: 'Prescription #',
            sortable: true,
            format: (value) => (
                <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-blue-100 p-1.5 text-blue-600">
                        <Pill size={14} />
                    </div>
                    <span className="font-mono text-sm font-semibold text-blue-600">
                        {value}
                    </span>
                </div>
            ),
        },
        {
            id: 'items',
            label: 'Items',
            sortable: false,
            format: (_, row) => {
                const items = row.items || [];
                const names = items.map(
                    (item) =>
                        item.name ||
                        item.medicine_name ||
                        item.drug_name ||
                        item.service_name ||
                        'Drug',
                );
                const total = names.length;
                return (
                    <div className="space-y-1">
                        {names.slice(0, 2).map((name, idx) => (
                            <div key={idx} className="text-sm text-gray-700">
                                {name}
                            </div>
                        ))}
                        {total > 2 && (
                            <div className="text-xs text-gray-400">
                                +{total - 2} more
                            </div>
                        )}
                        <div className="pt-0.5">
                            <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                                {total} {total === 1 ? 'item' : 'items'}
                            </span>
                        </div>
                    </div>
                );
            },
        },
        {
            id: 'progress',
            label: 'Progress',
            sortable: false,
            format: (_, row) => {
                const items = row.items || [];
                const total = items.length;
                if (total === 0) {
                    return <span className="text-xs text-gray-400">—</span>;
                }

                // Determine per-item state
                const dispensed = items.filter((i) => {
                    const prescribed = i.quantity || i.dosage_amount || 1;
                    return (
                        (i.quantity_dispensed || 0) >= prescribed &&
                        prescribed > 0
                    );
                }).length;
                const partial = items.filter((i) => {
                    const prescribed = i.quantity || i.dosage_amount || 1;
                    const d = i.quantity_dispensed || 0;
                    return d > 0 && d < prescribed;
                }).length;

                const isComplete = dispensed === total;
                const isPartial = !isComplete && (dispensed > 0 || partial > 0);
                const pct = Math.round((dispensed / total) * 100);

                const barColor = isComplete
                    ? 'bg-emerald-500'
                    : isPartial
                      ? 'bg-blue-500'
                      : 'bg-amber-400';
                const textColor = isComplete
                    ? 'text-emerald-700'
                    : isPartial
                      ? 'text-blue-700'
                      : 'text-amber-700';

                return (
                    <div className="min-w-[110px] space-y-1.5">
                        <div className="flex items-baseline gap-1">
                            <span
                                className={`text-sm font-semibold tabular-nums ${textColor}`}
                            >
                                {dispensed}
                            </span>
                            <span className="text-xs text-gray-400">
                                / {total} dispensed
                            </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                            <div
                                className={`h-full rounded-full transition-all ${barColor}`}
                                style={{ width: `${pct}%` }}
                            />
                        </div>
                        {partial > 0 && (
                            <div className="text-[11px] text-blue-600">
                                {partial} partial
                            </div>
                        )}
                    </div>
                );
            },
        },
        {
            id: 'payment_scheme',
            label: 'Scheme',
            sortable: true,
            filterable: true,
            filterType: 'status',
            format: (value) => {
                const meta = getSchemeMeta(value);
                return (
                    <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${meta.bg} ${meta.color}`}
                    >
                        {meta.label}
                    </span>
                );
            },
        },
        {
            id: 'priority',
            label: 'Priority',
            sortable: false,
            format: (_, row) => {
                const meta = getPriorityMeta(getOverallPriority(row));
                return (
                    <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${meta.bg} ${meta.color}`}
                    >
                        <span
                            className={`h-1.5 w-1.5 rounded-full ${meta.dot}`}
                        />
                        {meta.label}
                    </span>
                );
            },
        },
        {
            id: 'created_at',
            label: 'Date',
            sortable: true,
            format: (value, row) => (
                <div className="flex items-center gap-2">
                    <Clock size={14} className="text-gray-400" />
                    <span className="text-sm text-gray-700">
                        {formatDate(value || row.prescribed_date)}
                    </span>
                </div>
            ),
        },
        {
            id: 'status',
            label: 'Status',
            sortable: true,
            filterable: true,
            filterType: 'status',
            statusColors: {
                pending: 'warning',
                partially_dispensed: 'info',
                dispensed: 'success',
                completed: 'success',
                cancelled: 'error',
            },
            format: (value) => {
                const config = getStatusBadge(value);
                return (
                    <span
                        className={`inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r ${config.gradient} px-3 py-1 text-xs font-medium text-white shadow-sm`}
                    >
                        {config.icon}
                        {config.label}
                    </span>
                );
            },
        },
    ];

    // ─── Table Actions ───────────────────────────────────────────────────────

    const actions: Action<Dispensation>[] = [
        {
            label: 'View Items',
            icon: <Eye size={16} />,
            color: 'info',
            onClick: (row) => handleViewItems(row),
        },
        {
            label: 'Dispense',
            icon: <Truck size={16} />,
            color: 'success',
            show: (row) =>
                row.status !== 'dispensed' &&
                row.status !== 'completed' &&
                row.status !== 'cancelled',
            onClick: (row) => handleDispenseClick(row),
        },
    ];

    // ─── Render ──────────────────────────────────────────────────────────────

    const displayData = dispensations || [];

    return (
        <PatientLayout
            breadcrumbs={[
                { title: 'Patient', href: '#' },
                { title: 'Dispensation', href: '#' },
            ]}
        >
            <div className="h-full space-y-6 bg-blue-50 p-2">
                <PageHeader
                    icon={<ClipboardList className="h-6 w-6" />}
                    title="Dispensation"
                    subtitle="Dispense prescribed medications to patients"
                />

                <ReusableTable
                    title="Prescriptions for Dispensation"
                    columns={columns}
                    data={displayData}
                    actions={actions}
                    loading={false}
                    filterPlaceholder="Search by prescription number..."
                    statusFilterKey="status"
                    statusOptions={[
                        { value: 'pending', label: 'Pending' },
                        {
                            value: 'partially_dispensed',
                            label: 'Partially Dispensed',
                        },
                        { value: 'dispensed', label: 'Dispensed' },
                        { value: 'completed', label: 'Completed' },
                        { value: 'cancelled', label: 'Cancelled' },
                    ]}
                    rowsPerPageOptions={[8, 15, 25, 50]}
                    defaultRowsPerPage={8}
                    defaultOrderBy="created_at"
                    emptyMessage="No prescriptions available for dispensation"
                />

                {/* Modals */}
                <ViewItemsModal
                    isOpen={viewItemsModalOpen}
                    onClose={closeViewModal}
                    prescription={selectedPrescription}
                    onDispense={handleDispenseClick}
                    getPaidItemsCount={getPaidItemsCount}
                    getTotalItems={getTotalItems}
                    getTotalQuantity={getTotalQuantity}
                    getTotalPaidAmount={getTotalPaidAmount}
                    isItemPaid={isItemPaid}
                    devMode={DEV_MODE}
                />

                <DispenseModal
                    isOpen={isModalOpen}
                    onClose={closeModal}
                    prescription={selectedPrescription}
                    editedItems={editedItems}
                    isDispensing={isDispensing}
                    onUpdateQuantity={handleUpdateQuantity}
                    onRemoveItem={handleRemoveItem}
                    onDispenseAll={handleDispenseAll}
                    getTotalDispensedQuantity={getTotalDispensedQuantity}
                    getTotalQuantity={getTotalQuantity}
                    getTotalPaidAmount={getTotalPaidAmount}
                />

                <ConfirmModal
                    isOpen={!!showRemoveConfirm}
                    onClose={() => setShowRemoveConfirm(null)}
                    onConfirm={confirmRemoveItem}
                    title="Confirm Removal"
                    message={`Are you sure you want to remove "${
                        showRemoveConfirm?.item?.name ||
                        showRemoveConfirm?.item?.drug_name ||
                        showRemoveConfirm?.item?.service_name
                    }" from this prescription?`}
                    confirmText="Remove Item"
                    confirmVariant="destructive"
                />
            </div>
        </PatientLayout>
    );
}
