import PageHeader from '@/components/PageHeader';
import ReusableTable from '@/components/ReusableTable';
import AppLayout from '@/layouts/app/app-header-layout';
import { BarcodeIcon } from 'lucide-react';
import { usePage } from '@inertiajs/react';
import { useState } from 'react';
import OrderItemsModal from '@/components/OrderItemsModal';

export default function BulkStore() {
    const { services, bulkOrders } = usePage().props;
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [orderItems, setOrderItems] = useState([]);

    // Define table columns
    const columns = [
        { key: 'order_number', label: 'Order Number', sortable: true },
        { key: 'order_date', label: 'Order Date', sortable: true },
        { key: 'supplier', label: 'Supplier', sortable: true },
        { key: 'total_items', label: 'Total Items', sortable: true },
        { key: 'total_amount', label: 'Total Amount', sortable: true },
        { key: 'status', label: 'Status', sortable: true },
    ];

    // Transform bulkOrders data for the table
    const tableData =
        bulkOrders?.map((order) => ({
            id: order.id,
            order_number: order.order_number || `ORD-${order.id}`,
            order_date: new Date(order.created_at).toLocaleDateString(),
            supplier: order.supplier_name || order.supplier?.name || 'N/A',
            total_items: order.items_count || order.items?.length || 0,
            total_amount: `$${order.total_amount?.toFixed(2) || '0.00'}`,
            status: (
                <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                        order.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : order.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : order.status === 'cancelled'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                    }`}
                >
                    {order.status || 'Pending'}
                </span>
            ),
        })) || [];

    const handleOrderFromBulkStore = () => {
        setIsModalOpen(true);
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
    };

    const handleOrderSubmit = (items) => {
        setOrderItems(items);
        // Here you would typically make an API call to submit the order
        console.log('Order items submitted:', items);
        setIsModalOpen(false);
        // Refresh the page or show success message
    };

    return (
        <AppLayout
            breadcrumbs={[
                {
                    title: 'Nurses',
                    href: '/bulk-store',
                },
                {
                    title: 'Bulk Store',
                    href: '',
                },
            ]}
        >
            <div className="h-full bg-blue-50 p-6">
                <PageHeader
                    icon={<BarcodeIcon />}
                    title="Bulk Store"
                    subtitle="Order from bulk store"
                    actions={[
                        {
                            label: 'Order from Bulk Store',
                            onClick: handleOrderFromBulkStore,
                        },
                    ]}
                />

                <ReusableTable
                    title="Recent Orders"
                    data={tableData}
                    columns={columns}
                    emptyMessage="No orders found. Start by ordering from the bulk store."
                />

                {/* Order from bulk store modal */}
                <OrderItemsModal
                    isOpen={isModalOpen}
                    onClose={handleModalClose}
                    onSubmit={handleOrderSubmit}
                    LedgerStockItem={services}
                />
            </div>
        </AppLayout>
    );
}
