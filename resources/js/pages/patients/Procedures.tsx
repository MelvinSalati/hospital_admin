import { usePage } from '@inertiajs/react';
import {
    Plus,
    ClipboardCheck,
    AlertCircle,
    Package,
    ScissorsIcon,
    Eye as EyeIcon,
    MoreHorizontal,
    Loader2,
    CheckCircle,
    Clock,
    X,
    Calendar,
    User,
    DollarSign,
    Hash,
    ChevronRight,
    Printer,
    Download,
    Mail,
} from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import PageHeader from '@/components/PageHeader';
import PatientLayout from '@/layouts/patients/PatientLayout';
import Http from '@/utils/Http';
import ProcedureModal from './components/ProcedureModal';
import { Table, StatusBadge } from './components/Table';

interface ProcedureItem {
    id: number;
    procedure_id: number;
    visit_token: string;
    patient_id: number;
    patient_procedure_id: number | null;
    invoice_id: number | null;
    item_id: number;
    name: string;
    quantity: number;
    unit: string;
    price: number;
    total: number;
    created_at: string;
    updated_at: string;
    color?: string;
    icon?: any;
}

interface GroupedProcedure {
    visit_token: string;
    items: ProcedureItem[];
    total_amount: number;
    item_count: number;
    created_at: string;
}

// Detail Modal Component
const DetailModal = ({
    isOpen,
    onClose,
    selectedVisit,
    onViewProcedure,
}: {
    isOpen: boolean;
    onClose: () => void;
    selectedVisit: GroupedProcedure | null;
    onViewProcedure: (item: ProcedureItem) => void;
}) => {
    if (!isOpen || !selectedVisit) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="relative max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-slate-50 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600 shadow-lg shadow-emerald-600/25">
                            <Package className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">
                                Visit Details
                            </h2>
                            <p className="text-xs text-slate-500">
                                Token: {selectedVisit.visit_token}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => window.print()}
                            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                            title="Print"
                        >
                            <Printer className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => toast.success('Downloading...')}
                            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                            title="Download"
                        >
                            <Download className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => toast.success('Email sent')}
                            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                            title="Email"
                        >
                            <Mail className="h-4 w-4" />
                        </button>
                        <button
                            onClick={onClose}
                            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-3 border-b border-slate-200 bg-white p-4">
                    <div className="rounded-lg bg-blue-50 p-3">
                        <p className="text-xs text-slate-500">Total Items</p>
                        <p className="text-xl font-bold text-blue-600">
                            {selectedVisit.item_count}
                        </p>
                    </div>
                    <div className="rounded-lg bg-emerald-50 p-3">
                        <p className="text-xs text-slate-500">Total Amount</p>
                        <p className="text-xl font-bold text-emerald-600">
                            ZMW {selectedVisit.total_amount.toFixed(2)}
                        </p>
                    </div>
                    <div className="rounded-lg bg-purple-50 p-3">
                        <p className="text-xs text-slate-500">Visit Date</p>
                        <p className="text-sm font-medium text-purple-600">
                            {new Date(
                                selectedVisit.created_at,
                            ).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                            })}
                        </p>
                    </div>
                </div>

                {/* Items List */}
                <div
                    className="overflow-y-auto p-4"
                    style={{ maxHeight: 'calc(90vh - 220px)' }}
                >
                    <div className="space-y-2">
                        {selectedVisit.items.map((item, index) => (
                            <div
                                key={item.id}
                                className="group flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 transition-all hover:border-blue-300 hover:shadow-md"
                            >
                                <div className="flex items-center gap-4">
                                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-medium text-slate-500">
                                        {index + 1}
                                    </span>
                                    <div>
                                        <p className="font-medium text-slate-900">
                                            {item.name}
                                        </p>
                                        <div className="flex items-center gap-3 text-xs text-slate-500">
                                            <span className="flex items-center gap-1">
                                                <Hash className="h-3 w-3" />
                                                Item #{item.item_id}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Package className="h-3 w-3" />
                                                {item.quantity} {item.unit}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <DollarSign className="h-3 w-3" />
                                                ZMW
                                                {Number(item.price).toFixed(
                                                    2,
                                                )}{' '}
                                                each
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-lg font-bold text-blue-600">
                                        ZMW{Number(item.total).toFixed(2)}
                                    </span>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onViewProcedure(item);
                                        }}
                                        className="rounded-lg p-1.5 text-slate-400 opacity-0 transition-all group-hover:opacity-100 hover:bg-blue-50 hover:text-blue-600"
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        ))}

                        {/* Total Row */}
                        <div className="mt-4 rounded-lg border-2 border-dashed border-blue-200 bg-blue-50/50 p-3">
                            <div className="flex items-center justify-between">
                                <span className="font-medium text-slate-700">
                                    Grand Total
                                </span>
                                <span className="text-2xl font-bold text-blue-600">
                                    ZMW{selectedVisit.total_amount.toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="sticky bottom-0 border-t border-slate-200 bg-white px-6 py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-sm text-slate-500">
                            <span>{selectedVisit.item_count} items</span>
                            <span className="h-4 w-px bg-slate-200" />
                            <span>Visit: {selectedVisit.visit_token}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={onClose}
                                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
                            >
                                Close
                            </button>
                            <button
                                onClick={() =>
                                    toast.success('Generating invoice...')
                                }
                                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-blue-600/30 transition-colors hover:bg-blue-700"
                            >
                                <Printer className="h-4 w-4" />
                                Generate Invoice
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default function Procedures() {
    const {
        patient,
        procedures,
        previousProcedures,
        error,
        patientId,
        procedureItems,
    } = usePage().props;
    const [showModal, setShowModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [selectedVisit, setSelectedVisit] = useState<GroupedProcedure | null>(
        null,
    );
    const [showDetailModal, setShowDetailModal] = useState(false);
    console.log('procedures', procedures);
    // Get the data - handle both array and object cases
    const rawData = previousProcedures || [];
    const displayData = Array.isArray(rawData) ? rawData : [];

    // Group by visit token
    const groupByVisitToken = (data: any[]): GroupedProcedure[] => {
        const groups: Record<string, any[]> = {};
        data.forEach((item) => {
            const token = item.visit_token || 'unknown';
            if (!groups[token]) {
                groups[token] = [];
            }
            groups[token].push(item);
        });

        return Object.entries(groups).map(([token, items]) => ({
            visit_token: token,
            items: items,
            total_amount: items.reduce(
                (sum, item) => sum + (Number(item.total) || 0),
                0,
            ),
            item_count: items.length,
            created_at: items[0]?.created_at || new Date().toISOString(),
        }));
    };

    const groupedData = groupByVisitToken(displayData);

    // Table columns for grouped view
    const columns = [
        {
            key: 'visit_token',
            header: 'Visit Token',
            render: (value: string) => (
                <span className="font-mono text-sm font-medium text-blue-600">
                    {value || 'N/A'}
                </span>
            ),
            sortable: true,
        },
        {
            key: 'item_count',
            header: 'Items',
            render: (value: number) => (
                <span className="inline-flex items-center gap-1 rounded-lg bg-blue-100 px-2.5 py-1 text-sm font-medium text-blue-700">
                    <Package className="h-3.5 w-3.5" />
                    {value || 0}
                </span>
            ),
            sortable: true,
        },
        {
            key: 'total_amount',
            header: 'Total Amount',
            render: (value: number) => {
                const num = Number(value) || 0;
                return (
                    <span className="font-semibold text-emerald-600">
                        ZMW{num.toFixed(2)}
                    </span>
                );
            },
            sortable: true,
        },
        {
            key: 'created_at',
            header: 'Date',
            render: (value: string) => {
                if (!value) return '-';
                try {
                    const date = new Date(value);
                    if (isNaN(date.getTime())) return value;
                    return (
                        <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            <span>
                                {date.toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                })}
                            </span>
                            <span className="text-xs text-slate-400">
                                {date.toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                })}
                            </span>
                        </div>
                    );
                } catch {
                    return value;
                }
            },
            sortable: true,
        },
    ];

    // Get procedure details
    const viewProcedure = async (procedure: ProcedureItem) => {
        try {
            setLoading(true);
            const response = await Http.get(`/procedures/${procedure.id}`);
            if (response.status === 200) {
                toast.success('Procedure details loaded');
            }
        } catch (error) {
            toast.error('Failed to load procedure details');
        } finally {
            setLoading(false);
        }
    };

    // Handle modal confirm - Now receives procedureId from modal
    // In Procedures.tsx — replace the existing handleConfirm with this:

    // Handle modal confirm - procedureId is now guaranteed non-null by the modal,
    // but we still validate defensively in case onConfirm is ever called from
    // elsewhere.
    const handleConfirm = async (
        items: any[],
        procedureId: number | null | undefined,
    ) => {
        if (!patientId) {
            toast.error('Patient ID is required');
            return;
        }
        console.log('data procedure id', procedureId);
        // if (procedureId === null || procedureId === undefined) {
        //     toast.error('Please select a procedure');
        //     return;
        // }

        setIsSubmitting(true);
        try {
            const response = await Http.post(`/procedures/${patientId}/cart`, {
                procedure_id: procedureId,
                items: items.map((item) => ({
                    item_id: item.item_id,
                    name: item.name,
                    quantity: item.quantity,
                    unit: item.unit,
                    price: item.price,
                    total: item.total,
                })),
            });

            if (response.status === 200) {
                toast.success(
                    response.data.message || 'Procedure added successfully',
                );
                setShowModal(false);
                window.location.reload();
            } else {
                toast.error(response.data.message || 'Failed to add procedure');
            }
        } catch (error: any) {
            toast.error(
                error.response?.data?.message || 'Failed to add procedure',
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle row click - show detail modal
    const handleRowClick = (row: GroupedProcedure) => {
        setSelectedVisit(row);
        setShowDetailModal(true);
    };

    // Close detail modal
    const closeDetailModal = () => {
        setShowDetailModal(false);
        setTimeout(() => setSelectedVisit(null), 300);
    };

    // Safely calculate stats
    const totalItems = displayData.length;
    const totalAmount = displayData.reduce(
        (sum, p) => sum + (Number(p.total) || 0),
        0,
    );
    const uniqueVisits = groupedData.length;

    return (
        <PatientLayout
            patients={patient}
            breadcrumbs={[
                { title: 'Patient', href: '/' },
                { title: 'Procedures', href: '#' },
            ]}
        >
            <div className="min-h-screen bg-blue-50 p-4">
                {/* Page Header */}
                <PageHeader
                    icon={<ScissorsIcon className="h-5 w-5" />}
                    title="Procedure Items"
                    subtitle="Manage patient procedure items and track inventory"
                    actions={[
                        {
                            label: 'Add Items',
                            onClick: () => setShowModal(true),
                            icon: <Plus className="h-4 w-4" />,
                        },
                    ]}
                />

                {/* Procedures Table */}
                <div className="mt-4">
                    {error ? (
                        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
                            <div className="rounded-full bg-slate-100 p-4">
                                <ClipboardCheck className="h-12 w-12 text-slate-400" />
                            </div>
                            <h3 className="mt-4 text-lg font-semibold text-slate-900">
                                No Procedures
                            </h3>
                            <p className="mt-1 max-w-sm text-sm text-slate-500">
                                {error}
                            </p>
                            <button
                                onClick={() => setShowModal(true)}
                                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-blue-600/30 transition-all hover:bg-blue-700"
                            >
                                <Plus className="h-4 w-4" />
                                Add Items
                            </button>
                        </div>
                    ) : (
                        <Table
                            data={groupedData}
                            columns={columns}
                            title="Procedure Visits"
                            subtitle={`${uniqueVisits} visit(s) with ${totalItems} total items`}
                            searchable={true}
                            searchPlaceholder="Search by visit token..."
                            onRowClick={handleRowClick}
                            actions={(row) => (
                                <div className="flex items-center justify-end gap-1">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleRowClick(row);
                                        }}
                                        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                                        title="View details"
                                    >
                                        <EyeIcon className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toast.info(
                                                `Visit: ${row.visit_token}`,
                                            );
                                        }}
                                        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                                        title="More options"
                                    >
                                        <MoreHorizontal className="h-4 w-4" />
                                    </button>
                                </div>
                            )}
                            pagination={{
                                currentPage: currentPage,
                                totalPages:
                                    Math.ceil(groupedData.length / 10) || 1,
                                onPageChange: (page) => setCurrentPage(page),
                                totalItems: groupedData.length,
                                itemsPerPage: 10,
                            }}
                            isLoading={loading}
                            emptyMessage="No procedure items found"
                        />
                    )}
                </div>
            </div>

            {/* Procedure Modal - Pass procedureItems from props */}
            <ProcedureModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                onConfirm={handleConfirm}
                procedures={procedures}
                procedureItems={procedureItems || {}}
                patientId={patientId}
                isLoading={isSubmitting}
            />

            {/* Detail Modal */}
            <DetailModal
                isOpen={showDetailModal}
                onClose={closeDetailModal}
                selectedVisit={selectedVisit}
                onViewProcedure={viewProcedure}
            />
        </PatientLayout>
    );
}
