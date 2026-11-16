import axios from 'axios';
import {
    AlertTriangle,
    CheckCircle,
    DollarSign,
    Info,
    Loader2,
    Pencil,
    Tag,
    TrendingDown,
    TrendingUp,
    X,
} from 'lucide-react';
import Notiflix from 'notiflix';
import { useEffect, useMemo, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import type { Action, Column } from '@/components/ReusableTable';
import ReusableTable from '@/components/ReusableTable';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Service {
    id: number;
    service_uuid: string;
    service_name: string;
    service_code: string | null;
    service_category: string | null;
    description: string | null;
    price: number | string;
    scheme_type: number | string;
    is_active: boolean | number;
    has_unit?: boolean | number;
    unit?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
}

interface Props {
    departmentId: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatMoney = (n: number | string) =>
    `ZMW ${Number(n).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;

const formatDate = (value?: string | null) =>
    value
        ? new Date(value).toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
          })
        : '—';

const sameName = (a: string, b: string) =>
    a.trim().toLowerCase() === b.trim().toLowerCase();

// ─── Components ──────────────────────────────────────────────────────────────

const StatusBadge = ({ active }: { active: boolean | number }) =>
    Number(active) === 1 ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
            <CheckCircle className="h-3 w-3" />
            Active
        </span>
    ) : (
        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
            <X className="h-3 w-3" />
            Inactive
        </span>
    );

// scheme_type: 1 = Cash, 2 = Insurance
const SchemeBadge = ({ scheme }: { scheme: number | string }) => {
    const value = Number(scheme);

    if (value === 1) {
        return (
            <span className="inline-flex rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                Cash
            </span>
        );
    }

    if (value === 2) {
        return (
            <span className="inline-flex rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700">
                Insurance
            </span>
        );
    }

    return <span className="text-xs text-gray-400">—</span>;
};

const DetailRow = ({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) => (
    <div className="flex items-start justify-between gap-3 py-1.5 text-xs">
        <span className="shrink-0 text-gray-500">{label}</span>
        <span className="text-right font-medium text-gray-900">{children}</span>
    </div>
);

// ─── Edit Service Modal ───────────────────────────────────────────────────────

const EditServiceModal = ({
    isOpen,
    onClose,
    onSuccess,
    service,
    allServices,
}: {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    service: Service | null;
    allServices: Service[];
}) => {
    const [price, setPrice] = useState('');
    const [schemeType, setSchemeType] = useState('1');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (service) {
            setPrice(String(service.price ?? '0'));
            setSchemeType(String(service.scheme_type ?? '1'));
            setError('');
        }
    }, [service]);

    // Other entries in this department with the same service name
    const related = useMemo(
        () =>
            service
                ? allServices.filter(
                      (s) =>
                          s.id !== service.id &&
                          sameName(s.service_name, service.service_name),
                  )
                : [],
        [allServices, service],
    );

    if (!isOpen || !service) return null;

    const currentPrice = Number(service.price);
    const newPrice = Number(price);
    const priceIsValid =
        price.trim() !== '' && Number.isFinite(newPrice) && newPrice >= 0;

    const delta = priceIsValid ? newPrice - currentPrice : 0;
    const percent =
        priceIsValid && currentPrice > 0 ? (delta / currentPrice) * 100 : null;

    const hasChanges =
        priceIsValid &&
        (newPrice !== currentPrice ||
            Number(schemeType) !== Number(service.scheme_type));

    // Another entry with the same name already uses the chosen scheme
    const duplicateInScheme = related.filter(
        (s) => Number(s.scheme_type) === Number(schemeType),
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!priceIsValid) {
            setError('Enter a valid price');
            return;
        }

        setIsSubmitting(true);
        try {
            await axios.patch(`/api/services/${service.id}`, {
                price: newPrice,
                scheme_type: Number(schemeType),
            });
            Notiflix.Notify.success('Service updated successfully');
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.errors?.price?.[0] || '');
            Notiflix.Notify.failure(
                err.response?.data?.message || 'Failed to update service',
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
                {/* Header - Fixed */}
                <div className="flex items-start justify-between rounded-t-lg border-b bg-white px-5 py-3">
                    <div>
                        <h2 className="text-base font-semibold">
                            Update Service Pricing
                        </h2>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                            <p className="text-xs text-gray-500">
                                {service.service_name}
                                {service.service_code
                                    ? ` (${service.service_code})`
                                    : ''}
                            </p>
                            <SchemeBadge scheme={service.scheme_type} />
                            <StatusBadge active={service.is_active} />
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Scrollable Body */}
                <div className="grid flex-1 grid-cols-1 gap-5 overflow-y-auto p-5 md:grid-cols-5">
                    {/* LEFT — form + impact */}
                    <div className="space-y-4 md:col-span-3">
                        <form
                            id="edit-service-form"
                            onSubmit={handleSubmit}
                            className="space-y-4"
                        >
                            <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-blue-800">
                                    <DollarSign className="h-4 w-4" />
                                    Pricing
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="mb-1 block text-xs font-medium text-gray-700">
                                            Price (ZMW) *
                                        </label>
                                        <div className="relative">
                                            <span className="absolute top-1/2 left-3 -translate-y-1/2 text-xs text-gray-500">
                                                ZMW
                                            </span>
                                            <input
                                                type="number"
                                                value={price}
                                                onChange={(e) => {
                                                    setPrice(e.target.value);
                                                    setError('');
                                                }}
                                                step="0.01"
                                                min="0"
                                                className={`w-full rounded border ${error ? 'border-red-500' : 'border-gray-300'} py-1.5 pr-3 pl-12 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none`}
                                                placeholder="0.00"
                                                required
                                            />
                                        </div>
                                        {error && (
                                            <p className="mt-1 text-xs text-red-500">
                                                {error}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-xs font-medium text-gray-700">
                                            Billing Scheme *
                                        </label>
                                        <select
                                            value={schemeType}
                                            onChange={(e) =>
                                                setSchemeType(e.target.value)
                                            }
                                            className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        >
                                            <option value="1">Cash</option>
                                            <option value="2">Insurance</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </form>

                        {/* Change summary */}
                        <div className="rounded-lg border border-gray-100 p-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-500">
                                    Current price
                                </span>
                                <span className="font-medium">
                                    {formatMoney(currentPrice)}
                                </span>
                            </div>
                            <div className="mt-2 flex justify-between">
                                <span className="text-gray-500">New price</span>
                                <span className="font-semibold text-green-700">
                                    {formatMoney(priceIsValid ? newPrice : 0)}
                                </span>
                            </div>
                            <div className="mt-2 flex items-center justify-between border-t pt-2">
                                <span className="text-gray-500">Change</span>
                                {!priceIsValid || delta === 0 ? (
                                    <span className="text-xs text-gray-400">
                                        No price change
                                    </span>
                                ) : (
                                    <span
                                        className={`inline-flex items-center gap-1 text-xs font-semibold ${delta > 0 ? 'text-red-600' : 'text-green-700'}`}
                                    >
                                        {delta > 0 ? (
                                            <TrendingUp className="h-3.5 w-3.5" />
                                        ) : (
                                            <TrendingDown className="h-3.5 w-3.5" />
                                        )}
                                        {delta > 0 ? '+' : '−'}
                                        {formatMoney(Math.abs(delta))}
                                        {percent !== null &&
                                            ` (${delta > 0 ? '+' : '−'}${Math.abs(percent).toFixed(1)}%)`}
                                    </span>
                                )}
                            </div>
                            {Number(schemeType) !==
                                Number(service.scheme_type) && (
                                <div className="mt-2 flex items-center justify-between">
                                    <span className="text-gray-500">
                                        Billing scheme
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 text-xs">
                                        <SchemeBadge
                                            scheme={service.scheme_type}
                                        />
                                        →
                                        <SchemeBadge scheme={schemeType} />
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Warnings */}
                        {duplicateInScheme.length > 0 && (
                            <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                                <p>
                                    {duplicateInScheme.length} other{' '}
                                    {Number(schemeType) === 1
                                        ? 'cash'
                                        : 'insurance'}{' '}
                                    {duplicateInScheme.length === 1
                                        ? 'entry'
                                        : 'entries'}{' '}
                                    named “{service.service_name}” already{' '}
                                    {duplicateInScheme.length === 1
                                        ? 'exists'
                                        : 'exist'}{' '}
                                    (
                                    {duplicateInScheme
                                        .map(
                                            (s) => s.service_code || `#${s.id}`,
                                        )
                                        .join(', ')}
                                    ). Check for duplicates before saving.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* RIGHT — service details + related */}
                    <div className="space-y-4 md:col-span-2">
                        <div className="rounded-lg border border-gray-200 bg-gray-50/60 p-3">
                            <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-gray-700">
                                <Info className="h-4 w-4" />
                                Service details
                            </h3>
                            <div className="divide-y divide-gray-100">
                                <DetailRow label="Category">
                                    {service.service_category ||
                                        'Uncategorized'}
                                </DetailRow>
                                <DetailRow label="Code">
                                    <span className="font-mono">
                                        {service.service_code || '—'}
                                    </span>
                                </DetailRow>
                                {Number(service.has_unit) === 1 && (
                                    <DetailRow label="Unit">
                                        {service.unit || '—'}
                                    </DetailRow>
                                )}
                                <DetailRow label="Created">
                                    {formatDate(service.created_at)}
                                </DetailRow>
                                <DetailRow label="Last updated">
                                    {formatDate(service.updated_at)}
                                </DetailRow>
                            </div>
                            {service.description && (
                                <p className="mt-2 border-t border-gray-100 pt-2 text-xs text-gray-600">
                                    {service.description}
                                </p>
                            )}
                        </div>

                        <div className="rounded-lg border border-gray-200 p-3">
                            <h3 className="mb-2 text-sm font-semibold text-gray-700">
                                Same service in this department
                            </h3>
                            {related.length === 0 ? (
                                <p className="text-xs text-gray-400">
                                    No other entries with this name
                                </p>
                            ) : (
                                <ul className="space-y-1.5">
                                    {related.slice(0, 6).map((s) => (
                                        <li
                                            key={s.id}
                                            className="flex items-center justify-between gap-2 rounded bg-gray-50 px-2 py-1.5 text-xs"
                                        >
                                            <div className="flex min-w-0 items-center gap-2">
                                                <SchemeBadge
                                                    scheme={s.scheme_type}
                                                />
                                                <span className="truncate font-mono text-[11px] text-gray-500">
                                                    {s.service_code ||
                                                        `#${s.id}`}
                                                </span>
                                            </div>
                                            <span className="shrink-0 font-mono font-semibold text-gray-800">
                                                {formatMoney(s.price)}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer - Fixed */}
                <div className="flex items-center justify-between rounded-b-lg border-t bg-gray-50 px-5 py-3">
                    <p className="text-xs text-gray-400">
                        {hasChanges ? 'Unsaved changes' : 'No changes yet'}
                    </p>
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="text-sm"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            form="edit-service-form"
                            disabled={isSubmitting || !hasChanges}
                            className="bg-blue-600 text-sm hover:bg-blue-700"
                        >
                            {isSubmitting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                'Save Changes'
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── Main Component ──────────────────────────────────────────────────────────

export default function Index({ departmentId }: Props) {
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(false);
    const [filterCategory, setFilterCategory] = useState('all');
    const [selectedService, setSelectedService] = useState<Service | null>(
        null,
    );
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const getServices = async () => {
        try {
            setLoading(true);

            const response = await axios.get(
                `/api/services/department/${departmentId}`,
            );

            setServices(response.data.data);
        } catch (error) {
            console.error('Unable to retrieve services:', error);
            Notiflix.Notify.failure('Unable to retrieve services');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        getServices();
    }, [departmentId]);

    const openEditModal = (service: Service) => {
        setSelectedService(service);
        setIsEditModalOpen(true);
    };

    const closeEditModal = () => {
        setIsEditModalOpen(false);
        setSelectedService(null);
    };

    // ─── Category filter ──────────────────────────────────────────────────────

    const categories = useMemo(
        () =>
            [
                ...new Set(
                    services
                        .map((s) => s.service_category)
                        .filter((c): c is string => !!c),
                ),
            ].sort(),
        [services],
    );

    const filteredServices = useMemo(
        () =>
            filterCategory === 'all'
                ? services
                : services.filter((s) => s.service_category === filterCategory),
        [services, filterCategory],
    );

    // ─── Table columns ────────────────────────────────────────────────────────

    const columns: Column<Service>[] = [
        {
            id: 'service_name',
            label: 'Service',
            sortable: true,
            filterable: true,
            format: (_, row) => (
                <div>
                    <p className="text-sm font-medium text-gray-900">
                        {row.service_name}
                    </p>
                    {row.service_code && (
                        <p className="font-mono text-[11px] text-gray-400">
                            {row.service_code}
                        </p>
                    )}
                </div>
            ),
        },
        {
            id: 'service_category',
            label: 'Category',
            sortable: true,
            filterable: true,
            format: (value) =>
                value ? (
                    <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600">
                        {value}
                    </span>
                ) : (
                    <span className="text-xs text-gray-400">Uncategorized</span>
                ),
        },
        {
            id: 'scheme_type',
            label: 'Billing Scheme',
            sortable: true,
            format: (value) => <SchemeBadge scheme={value} />,
        },
        {
            id: 'price',
            label: 'Price (ZMW)',
            sortable: true,
            format: (value) => (
                <span className="font-mono text-xs font-semibold text-green-600">
                    {formatMoney(value)}
                </span>
            ),
        },
        {
            id: 'is_active',
            label: 'Status',
            format: (value) => <StatusBadge active={value} />,
        },
    ];

    const actions: Action<Service>[] = [
        {
            label: 'Edit Price',
            icon: <Pencil size={16} />,
            color: 'info',
            onClick: (row) => openEditModal(row),
        },
    ];

    return (
        <AppLayout
            breadcrumbs={[
                {
                    title: 'Altaf Memorial Hospital',
                    href: '',
                },
                {
                    title: 'Services',
                    href: '',
                },
                {
                    title: 'Settings',
                    href: '',
                },
            ]}
        >
            <div className="h-full space-y-4 bg-blue-50 px-4 py-2">
                <PageHeader
                    icon={<Tag className="h-5 w-5" />}
                    title="Configure Services"
                    subtitle="Manage service prices and billing schemes for this department."
                />

                {/* Category filter */}
                <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2">
                    <label
                        htmlFor="category-filter"
                        className="text-xs font-medium text-gray-700"
                    >
                        Category
                    </label>
                    <select
                        id="category-filter"
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="rounded border border-gray-200 px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                        <option value="all">All Categories</option>
                        {categories.map((category) => (
                            <option key={category} value={category}>
                                {category}
                            </option>
                        ))}
                    </select>
                    <span className="text-xs text-gray-500">
                        {filteredServices.length} of {services.length} services
                    </span>
                </div>

                <ReusableTable
                    title="Department Services"
                    columns={columns}
                    data={filteredServices}
                    actions={actions}
                    loading={loading}
                    filterPlaceholder="Search by service name or category..."
                    rowsPerPageOptions={[4, 8, 12, 16, 18]}
                    defaultRowsPerPage={6}
                    defaultOrderBy="service_name"
                    defaultOrderDirection="asc"
                    emptyMessage="No services found"
                    className="shadow-sm"
                />

                <EditServiceModal
                    isOpen={isEditModalOpen}
                    onClose={closeEditModal}
                    onSuccess={getServices}
                    service={selectedService}
                    allServices={services}
                />
            </div>
        </AppLayout>
    );
}
