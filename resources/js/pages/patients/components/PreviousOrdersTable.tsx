// pages/patients/components/PreviousOrdersTable.tsx
import { EyeIcon } from '@heroicons/react/24/outline';
import { Plus, ClipboardList, Calendar, Package } from 'lucide-react';
import Notiflix from 'notiflix';
import React, { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import type { Column } from '@/components/ReusableTable';
import ReusableTable from '@/components/ReusableTable';
import { ServiceModal } from './ServiceModal';

export interface CartItem {
    cartId: string;
    id: number;
    name: string;
    category?: string;
    price: number;
    quantity: number;
    notes?: string;
    priority?: string;
    modality?: string;
    body_part?: string;
}

interface PreviousOrdersTableProps {
    patientId: string;
    services: Array<{
        id: number;
        service_name: string;
        service_category?: string;
        price: number | string;
        description?: string;
        modality?: string;
    }>;
    previousOrders: Array<{
        id: string;
        order_number: string;
        service_name: string;
        service_category: string;
        quantity: number;
        unit_price: number;
        total_price: number;
        status:
            | 'pending'
            | 'scheduled'
            | 'in_progress'
            | 'completed'
            | 'cancelled';
        priority?: string;
        modality?: string;
        body_part?: string;
        created_at: string;
    }> | null;
    onSaveOrder: (items: CartItem[], identifier: string) => Promise<void>;
    orderLabel?: string;
    customFields?: any;
    /** Controlled modal — when provided, the internal "Order" button is hidden */
    isOrderModalOpen?: boolean;
    onOrderModalClose?: () => void;
    /** Set false to hide unit price / total columns (e.g. Dispensation contexts) */
    showPricing?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
        pending: 'bg-yellow-100 text-yellow-800',
        scheduled: 'bg-blue-100 text-blue-800',
        in_progress: 'bg-purple-100 text-purple-800',
        completed: 'bg-green-100 text-green-800',
        cancelled: 'bg-red-100 text-red-800',
        paid: 'bg-green-100 text-green-800',
        unpaid: 'bg-yellow-100 text-yellow-800',
        draft: 'bg-gray-100 text-gray-800',
    };
    return colors[status?.toLowerCase()] || 'bg-gray-100 text-gray-800';
};

const getPriorityColor = (priority: string): string => {
    const colors: Record<string, string> = {
        routine: 'bg-gray-100 text-gray-800',
        urgent: 'bg-orange-100 text-orange-800',
        emergency: 'bg-red-100 text-red-800',
        stat: 'bg-red-600 text-white',
    };
    return colors[priority?.toLowerCase()] || 'bg-gray-100 text-gray-800';
};

const formatCurrency = (amount: number | string): string => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return 'ZMW 0.00';
    return `ZMW ${num.toFixed(2)}`;
};

const formatDate = (dateStr?: string): string => {
    if (!dateStr) return 'N/A';
    try {
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    } catch {
        return 'N/A';
    }
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function PreviousOrdersTable({
    patientId,
    services,
    previousOrders,
    onSaveOrder,
    orderLabel = 'Service',
    customFields,
    isOrderModalOpen,
    onOrderModalClose,
    showPricing = true,
}: PreviousOrdersTableProps) {
    // Controlled / uncontrolled modal
    const [internalOpen, setInternalOpen] = useState(false);
    const isControlled = isOrderModalOpen !== undefined;
    const serviceModalOpen = isControlled ? isOrderModalOpen : internalOpen;

    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);

    // Transform services to match CartItem structure
    const mappedServices = useMemo(
        () =>
            (services || []).map((service) => ({
                id: service.id,
                service_name: service.service_name,
                service_category: service.service_category,
                price:
                    typeof service.price === 'string'
                        ? parseFloat(service.price)
                        : service.price,
                description: service.description,
                modality: service.modality,
            })),
        [services],
    );

    // Normalize previous orders
    const safePreviousOrders = useMemo(
        () =>
            (previousOrders || []).map((order) => ({
                ...order,
                quantity: order.quantity ?? 1,
                unit_price: order.unit_price ?? 0,
                total_price: order.total_price ?? 0,
                priority: order.priority || 'routine',
                status: order.status || 'pending',
            })),
        [previousOrders],
    );

    // Determine which optional columns to show
    const hasModality = safePreviousOrders.some((o) => o.modality);
    const hasBodyPart = safePreviousOrders.some((o) => o.body_part);

    const handleOpenModal = () => {
        if (isControlled) return; // parent controls it
        setInternalOpen(true);
    };

    const handleCloseModal = () => {
        if (isControlled) {
            onOrderModalClose?.();
        } else {
            setInternalOpen(false);
        }
    };

    const handleViewDetails = (order: any) => {
        setSelectedOrder(order);
        setIsViewModalOpen(true);
    };

    const handleSave = async (items: CartItem[], identifier: string) => {
        try {
            await onSaveOrder(items, identifier);
            Notiflix.Notify.success(
                `${items.length} ${orderLabel}(s) ordered successfully`,
            );
            handleCloseModal();
        } catch (error) {
            Notiflix.Notify.failure(
                error instanceof Error ? error.message : 'Failed to save order',
            );
        }
    };

    // ─── Table columns ───────────────────────────────────────────────────────

    const columns: Column<any>[] = useMemo(() => {
        const base: Column<any>[] = [
            {
                id: 'order_number',
                label: 'Order #',
                sortable: true,
                format: (value) => (
                    <span className="font-mono text-[11px] font-medium text-slate-700 dark:text-slate-300">
                        {value || 'N/A'}
                    </span>
                ),
            },
            {
                id: 'service_name',
                label: 'Service',
                sortable: true,
                format: (value, row) => (
                    <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-50 dark:bg-blue-950/40">
                            <ClipboardList
                                size={12}
                                className="text-blue-500 dark:text-blue-400"
                            />
                        </div>
                        <span className="text-[11px] font-medium text-slate-800 dark:text-slate-200">
                            {value || 'N/A'}
                        </span>
                        {row.priority && row.priority !== 'routine' && (
                            <Badge
                                className={`${getPriorityColor(row.priority)} px-1.5 py-0 text-[9px]`}
                            >
                                {row.priority}
                            </Badge>
                        )}
                    </div>
                ),
            },
            {
                id: 'service_category',
                label: 'Category',
                sortable: true,
                format: (value) => (
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-400">
                        {value || '—'}
                    </span>
                ),
            },
            {
                id: 'quantity',
                label: 'Qty',
                sortable: true,
                format: (value) => (
                    <span className="text-[11px] text-slate-700 tabular-nums dark:text-slate-300">
                        {value ?? 1}
                    </span>
                ),
            },
        ];

        if (showPricing) {
            base.push(
                {
                    id: 'unit_price',
                    label: 'Unit Price',
                    sortable: true,
                    format: (value) => (
                        <span className="text-[11px] text-slate-600 tabular-nums dark:text-slate-400">
                            {formatCurrency(value)}
                        </span>
                    ),
                },
                {
                    id: 'total_price',
                    label: 'Total',
                    sortable: true,
                    format: (value) => (
                        <span className="text-[11px] font-semibold text-slate-800 tabular-nums dark:text-slate-200">
                            {formatCurrency(value)}
                        </span>
                    ),
                },
            );
        }

        if (hasModality) {
            base.push({
                id: 'modality',
                label: 'Modality',
                sortable: true,
                format: (value) => (
                    <span className="text-[11px] text-slate-600 dark:text-slate-400">
                        {value || '—'}
                    </span>
                ),
            });
        }

        if (hasBodyPart) {
            base.push({
                id: 'body_part',
                label: 'Body Part',
                sortable: true,
                format: (value) => (
                    <span className="text-[11px] text-slate-600 dark:text-slate-400">
                        {value || '—'}
                    </span>
                ),
            });
        }

        base.push(
            {
                id: 'status',
                label: 'Status',
                sortable: true,
                filterable: true,
                filterType: 'status',
                format: (value) => (
                    <Badge className={`${getStatusColor(value)} capitalize`}>
                        {value || 'pending'}
                    </Badge>
                ),
            },
            {
                id: 'created_at',
                label: 'Date',
                sortable: true,
                format: (value) => (
                    <div className="flex items-center gap-1.5">
                        <Calendar size={12} className="text-slate-400" />
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            {formatDate(value)}
                        </span>
                    </div>
                ),
            },
        );

        return base;
    }, [showPricing, hasModality, hasBodyPart]);

    // ─── Render ──────────────────────────────────────────────────────────────

    return (
        <div className="space-y-4">
            {/* Internal order button — only shown when NOT controlled */}
            {!isControlled && (
                <div className="flex justify-end">
                    <Button
                        onClick={handleOpenModal}
                        disabled={mappedServices.length === 0}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        <Plus className="mr-1.5 h-4 w-4" />
                        Order {orderLabel}
                    </Button>
                </div>
            )}

            {/* No services warning */}
            {mappedServices.length === 0 && (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
                    <div className="flex">
                        <div className="shrink-0">
                            <svg
                                className="h-5 w-5 text-amber-400"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-amber-800 dark:text-amber-400">
                                No services available
                            </h3>
                            <div className="mt-2 text-sm text-amber-700 dark:text-amber-300">
                                <p>
                                    Please add {orderLabel.toLowerCase()}{' '}
                                    services to the system first.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Previous Orders Table */}
            {safePreviousOrders.length > 0 && (
                <ReusableTable
                    title={`Previous ${orderLabel} Orders`}
                    columns={columns}
                    data={safePreviousOrders}
                    actions={[]}
                    loading={false}
                    filterPlaceholder={`Search ${orderLabel.toLowerCase()} orders...`}
                    statusFilterKey="status"
                    statusOptions={[
                        { value: 'pending', label: 'Pending' },
                        { value: 'scheduled', label: 'Scheduled' },
                        { value: 'in_progress', label: 'In Progress' },
                        { value: 'completed', label: 'Completed' },
                        { value: 'cancelled', label: 'Cancelled' },
                    ]}
                    rowsPerPageOptions={[5, 10, 25]}
                    defaultRowsPerPage={5}
                    defaultOrderBy="created_at"
                    emptyMessage={`No previous ${orderLabel.toLowerCase()} orders found`}
                    onRowClick={handleViewDetails}
                    className="border-0 shadow-none"
                />
            )}

            {/* No orders message */}
            {safePreviousOrders.length === 0 && mappedServices.length > 0 && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 py-12 text-center dark:border-slate-700 dark:bg-slate-800/50">
                    <Package className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                        No previous {orderLabel.toLowerCase()} orders found.
                    </p>
                    <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                        {isControlled
                            ? `Use the "Order ${orderLabel}" button at the top of the page to create one.`
                            : `Click the "Order ${orderLabel}" button above to create one.`}
                    </p>
                </div>
            )}

            {/* Service Modal */}
            {serviceModalOpen && mappedServices.length > 0 && (
                <ServiceModal
                    isOpen={serviceModalOpen}
                    onClose={handleCloseModal}
                    onSave={handleSave}
                    identifier={patientId}
                    services={mappedServices}
                    title={`Order ${orderLabel}`}
                    emptyMessage={`No ${orderLabel.toLowerCase()} services found`}
                    customFields={customFields}
                />
            )}

            {/* View Order Details Modal */}
            <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>
                            Order Details - {selectedOrder?.order_number}
                        </DialogTitle>
                    </DialogHeader>
                    {selectedOrder && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="text-sm text-gray-500">
                                        Status
                                    </span>
                                    <Badge
                                        className={`ml-2 ${getStatusColor(selectedOrder.status)}`}
                                    >
                                        {selectedOrder.status}
                                    </Badge>
                                </div>
                                <div>
                                    <span className="text-sm text-gray-500">
                                        Priority
                                    </span>
                                    <Badge
                                        className={`ml-2 ${getPriorityColor(selectedOrder.priority)}`}
                                    >
                                        {selectedOrder.priority || 'routine'}
                                    </Badge>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="text-sm text-gray-500">
                                        Service
                                    </span>
                                    <p className="font-medium">
                                        {selectedOrder.service_name}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-sm text-gray-500">
                                        Category
                                    </span>
                                    <p className="font-medium">
                                        {selectedOrder.service_category}
                                    </p>
                                </div>
                            </div>

                            {selectedOrder.modality && (
                                <div>
                                    <span className="text-sm text-gray-500">
                                        Modality
                                    </span>
                                    <p className="font-medium">
                                        {selectedOrder.modality}
                                    </p>
                                </div>
                            )}

                            {selectedOrder.body_part && (
                                <div>
                                    <span className="text-sm text-gray-500">
                                        Body Part
                                    </span>
                                    <p className="font-medium">
                                        {selectedOrder.body_part}
                                    </p>
                                </div>
                            )}

                            <div className="border-t pt-4">
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-500">
                                        Quantity
                                    </span>
                                    <span className="font-medium">
                                        {selectedOrder.quantity}
                                    </span>
                                </div>
                                {showPricing && (
                                    <>
                                        <div className="mt-2 flex justify-between">
                                            <span className="text-sm text-gray-500">
                                                Unit Price
                                            </span>
                                            <span className="font-medium">
                                                {formatCurrency(
                                                    selectedOrder.unit_price,
                                                )}
                                            </span>
                                        </div>
                                        <div className="mt-2 flex justify-between">
                                            <span className="text-sm text-gray-500">
                                                Total Amount
                                            </span>
                                            <span className="text-lg font-bold">
                                                {formatCurrency(
                                                    selectedOrder.total_price,
                                                )}
                                            </span>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="pt-2 text-xs text-gray-400">
                                Ordered:{' '}
                                {selectedOrder.created_at
                                    ? new Date(
                                          selectedOrder.created_at,
                                      ).toLocaleString()
                                    : 'N/A'}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
