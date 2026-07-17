// pages/patients/components/PreviousOrdersTable.tsx
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { ServiceModal } from './ServiceModal';
import { EyeIcon } from '@heroicons/react/24/outline';
import Notiflix from 'notiflix';

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
}

// Helper function to get status color
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

// Helper function to get priority color
const getPriorityColor = (priority: string): string => {
    const colors: Record<string, string> = {
        routine: 'bg-gray-100 text-gray-800',
        urgent: 'bg-orange-100 text-orange-800',
        emergency: 'bg-red-100 text-red-800',
        stat: 'bg-red-600 text-white',
    };
    return colors[priority?.toLowerCase()] || 'bg-gray-100 text-gray-800';
};

// Order Row Component
const OrderRow = ({
    order,
    index,
    onViewDetails,
}: {
    order: any;
    index: number;
    onViewDetails?: (order: any) => void;
}) => {
    // Safe value extraction with defaults
    const safeOrder = {
        order_number: order?.order_number || 'N/A',
        service_name: order?.service_name || 'N/A',
        service_category: order?.service_category || 'N/A',
        quantity: order?.quantity ?? 1,
        unit_price: order?.unit_price ?? 0,
        total_price: order?.total_price ?? 0,
        status: order?.status || 'pending',
        priority: order?.priority || 'routine',
        created_at: order?.created_at,
        modality: order?.modality,
        body_part: order?.body_part,
    };
    console.log(safeOrder);

    return (
        <TableRow className="hover:bg-gray-50">
            <TableCell className="text-sm text-gray-900">{index + 1}</TableCell>
            <TableCell className="text-sm font-medium text-gray-900">
                {safeOrder.order_number}
            </TableCell>
            <TableCell className="text-sm text-gray-900">
                {safeOrder.service_name}
            </TableCell>
            <TableCell className="text-sm text-gray-900">
                {safeOrder.service_category}
            </TableCell>
            <TableCell className="text-center text-sm text-gray-900">
                {safeOrder.quantity}
            </TableCell>
            <TableCell className="text-right text-sm text-gray-900">
                ZMW {Number(safeOrder.unit_price).toFixed(2)}
            </TableCell>
            <TableCell className="text-right text-sm text-gray-900">
                ZMW {Number(safeOrder.total_price).toFixed(2)}
            </TableCell>
            <TableCell>
                <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(safeOrder.status)}>
                        {safeOrder.status}
                    </Badge>
                    {safeOrder.priority && safeOrder.priority !== 'routine' && (
                        <Badge className={getPriorityColor(safeOrder.priority)}>
                            {safeOrder.priority}
                        </Badge>
                    )}
                </div>
            </TableCell>
            <TableCell className="text-sm text-gray-900">
                {safeOrder.created_at
                    ? new Date(safeOrder.created_at).toLocaleDateString()
                    : 'N/A'}
            </TableCell>
            {safeOrder.modality && (
                <TableCell className="text-sm text-gray-900">
                    {safeOrder.modality}
                </TableCell>
            )}
            {safeOrder.body_part && (
                <TableCell className="text-sm text-gray-900">
                    {safeOrder.body_part}
                </TableCell>
            )}
            {onViewDetails && (
                <TableCell>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewDetails(order)}
                    >
                        <EyeIcon className="h-4 w-4" />
                    </Button>
                </TableCell>
            )}
        </TableRow>
    );
};

export default function PreviousOrdersTable({
    patientId,
    services,
    previousOrders,
    onSaveOrder,
    orderLabel = 'Service',
    customFields,
}: PreviousOrdersTableProps) {
    const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    console.log(services);
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
            setIsServiceModalOpen(false);
        } catch (error) {
            Notiflix.Notify.failure(
                error instanceof Error ? error.message : 'Failed to save order',
            );
        }
    };

    // Transform services to match CartItem structure
    const mappedServices = services.map((service) => ({
        id: service.id,
        service_name: service.service_name,
        service_category: service.service_category,
        price:
            typeof service.price === 'string'
                ? parseFloat(service.price)
                : service.price,
        description: service.description,
        modality: service.modality,
    }));
    console.log('services in previous orders', mappedServices);

    // Ensure previousOrders has safe values
    const safePreviousOrders =
        previousOrders?.map((order) => ({
            ...order,
            quantity: order.quantity ?? 1,
            unit_price: order.unit_price ?? 0,
            total_price: order.total_price ?? 0,
        })) || [];

    return (
        <div className="space-y-6">
            {/* Order Button */}
            <div className="flex justify-end">
                <Button
                    onClick={() => setIsServiceModalOpen(true)}
                    disabled={mappedServices.length === 0}
                    className="bg-blue-600 hover:bg-blue-700"
                >
                    + Order {orderLabel}
                </Button>
            </div>

            {/* No services warning */}
            {mappedServices.length === 0 && (
                <div className="rounded-md bg-yellow-50 p-4">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg
                                className="h-5 w-5 text-yellow-400"
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
                            <h3 className="text-sm font-medium text-yellow-800">
                                No services available
                            </h3>
                            <div className="mt-2 text-sm text-yellow-700">
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
                <div className="rounded-lg border border-gray-200">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-gray-50">
                                    <TableHead className="w-12">#</TableHead>
                                    <TableHead>Order #</TableHead>
                                    <TableHead>Service</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead className="text-center">
                                        Qty
                                    </TableHead>
                                    <TableHead className="text-right">
                                        Unit Price
                                    </TableHead>
                                    <TableHead className="text-right">
                                        Total
                                    </TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Date</TableHead>
                                    {safePreviousOrders[0]?.modality && (
                                        <TableHead>Modality</TableHead>
                                    )}
                                    {safePreviousOrders[0]?.body_part && (
                                        <TableHead>Body Part</TableHead>
                                    )}
                                    <TableHead></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {safePreviousOrders.map((order, index) => (
                                    <OrderRow
                                        key={order.id || index}
                                        order={order}
                                        index={index}
                                        onViewDetails={handleViewDetails}
                                    />
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            )}

            {/* No orders message */}
            {safePreviousOrders.length === 0 && mappedServices.length > 0 && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 py-12 text-center">
                    <p className="text-gray-500">
                        No previous {orderLabel.toLowerCase()} orders found.
                    </p>
                    <p className="mt-1 text-sm text-gray-400">
                        Click the "Order {orderLabel}" button to create one.
                    </p>
                </div>
            )}

            {/* Service Modal */}
            {isServiceModalOpen && mappedServices.length > 0 && (
                <ServiceModal
                    isOpen={isServiceModalOpen}
                    onClose={() => setIsServiceModalOpen(false)}
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
                                <div className="mt-2 flex justify-between">
                                    <span className="text-sm text-gray-500">
                                        Unit Price
                                    </span>
                                    <span className="font-medium">
                                        ZMW{' '}
                                        {Number(
                                            selectedOrder.unit_price,
                                        ).toFixed(2)}
                                    </span>
                                </div>
                                <div className="mt-2 flex justify-between">
                                    <span className="text-sm text-gray-500">
                                        Total Amount
                                    </span>
                                    <span className="text-lg font-bold">
                                        ZMW{' '}
                                        {Number(
                                            selectedOrder.total_price,
                                        ).toFixed(2)}
                                    </span>
                                </div>
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
