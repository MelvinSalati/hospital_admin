// pages/patients/Laboratory.tsx
import PatientLayout from '@/layouts/patients/PatientLayout';
import { usePage, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import Http from '@/utils/Http';
import {
    AlertCircle,
    Plus,
    X,
    CheckCircle,
    ChevronLeft,
    ChevronRight,
    Trash2,
    ShoppingCart,
    Search,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import Notiflix from 'notiflix';

// ─── Page props coming from the Laravel controller ────────────────────────────
interface LaboratoryProps {
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
    error?: string;
}

// Results Entry Dialog Component
const ResultsEntryDialog = ({
    isOpen,
    onClose,
    onSuccess,
    testOrder,
    patientName,
}: {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    testOrder: any;
    patientName: string;
}) => {
    const [formData, setFormData] = useState({
        result_value: '',
        remarks: '',
        performed_by: '',
        result_date: new Date().toISOString().split('T')[0],
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (testOrder) {
            setFormData((prev) => ({
                ...prev,
                result_value: testOrder.result_value || '',
            }));
        }
    }, [testOrder]);

    if (!isOpen || !testOrder) return null;

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: '' }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.result_value) {
            setErrors({ result_value: 'Result is required' });
            return;
        }

        setIsSubmitting(true);

        router.post(`/lab/results/${testOrder.id}`, formData, {
            onSuccess: () => {
                Notiflix.Notify.success('Results saved successfully');
                onSuccess();
                onClose();
            },
            onError: (err) => setErrors(err),
            onFinish: () => setIsSubmitting(false),
        });
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
                <div className="fixed inset-0 bg-black/50" onClick={onClose} />
                <div className="relative w-full max-w-lg rounded-xl bg-white shadow-2xl">
                    <div className="flex items-center justify-between border-b px-6 py-4">
                        <h2 className="text-xl font-semibold">
                            Enter Lab Results
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-500"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-4 p-6">
                        <div className="rounded-lg bg-gray-50 p-3">
                            <p className="text-sm">
                                Patient:{' '}
                                <span className="font-medium">
                                    {patientName}
                                </span>
                            </p>
                            <p className="text-sm">
                                Test:{' '}
                                <span className="font-medium">
                                    {testOrder.service_name}
                                </span>
                            </p>
                            <p className="text-sm">
                                Order #:{' '}
                                <span className="font-medium">
                                    {testOrder.order_number}
                                </span>
                            </p>
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium">
                                Result Value *
                            </label>
                            <textarea
                                name="result_value"
                                value={formData.result_value}
                                onChange={handleChange}
                                rows={3}
                                className="w-full rounded-md border px-3 py-2"
                                placeholder="Enter test results..."
                            />
                            {errors.result_value && (
                                <p className="mt-1 text-xs text-red-500">
                                    {errors.result_value}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium">
                                Performed By
                            </label>
                            <input
                                type="text"
                                name="performed_by"
                                value={formData.performed_by}
                                onChange={handleChange}
                                className="w-full rounded-md border px-3 py-2"
                            />
                        </div>

                        <div className="flex gap-3 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onClose}
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="flex-1 bg-blue-600"
                            >
                                {isSubmitting ? 'Saving...' : 'Save Results'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

// Order Modal Component
const OrderModal = ({
    isOpen,
    onClose,
    onSave,
    services,
    patientId,
}: {
    isOpen: boolean;
    onClose: () => void;
    onSave: (items: any[], patientId: string) => Promise<void>;
    services: LaboratoryProps['services'];
    patientId: string;
}) => {
    const [cart, setCart] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const filteredServices =
        services?.filter((s) =>
            s.service_name.toLowerCase().includes(searchTerm.toLowerCase()),
        ) || [];

    const addToCart = (service: any) => {
        const existing = cart.find((item) => item.id === service.id);
        if (existing) {
            setCart(
                cart.map((item) =>
                    item.id === service.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item,
                ),
            );
        } else {
            setCart([
                ...cart,
                {
                    ...service,
                    quantity: 1,
                    price:
                        typeof service.price === 'string'
                            ? parseFloat(service.price)
                            : service.price,
                },
            ]);
        }
    };

    const removeFromCart = (id: number) => {
        setCart(cart.filter((item) => item.id !== id));
    };

    const updateQuantity = (id: number, quantity: number) => {
        if (quantity < 1) return;
        setCart(
            cart.map((item) => (item.id === id ? { ...item, quantity } : item)),
        );
    };

    const totalAmount = cart.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
    );

    const handleSubmit = async () => {
        if (cart.length === 0) {
            Notiflix.Notify.warning('Please add at least one test to order');
            return;
        }

        setIsSubmitting(true);
        try {
            await onSave(cart, patientId);
            setCart([]);
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
                <div className="fixed inset-0 bg-black/50" onClick={onClose} />

                <div className="relative w-full max-w-5xl rounded-xl bg-white shadow-2xl">
                    <div className="flex items-center justify-between border-b px-6 py-4">
                        <h2 className="text-xl font-semibold">
                            Order Laboratory Tests
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-500"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="flex min-h-[500px]">
                        {/* Left - Available Tests */}
                        <div className="w-1/2 border-r p-4">
                            <div className="relative mb-4">
                                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search tests..."
                                    value={searchTerm}
                                    onChange={(e) =>
                                        setSearchTerm(e.target.value)
                                    }
                                    className="w-full rounded-md border py-2 pr-4 pl-9"
                                />
                            </div>

                            <div className="max-h-[400px] space-y-2 overflow-y-auto">
                                {filteredServices.map((service) => (
                                    <div
                                        key={service.id}
                                        className="flex items-center justify-between rounded-lg border p-3 hover:bg-gray-50"
                                    >
                                        <div>
                                            <div className="font-medium">
                                                {service.service_name}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                ZMW{' '}
                                                {typeof service.price ===
                                                'string'
                                                    ? parseFloat(
                                                          service.price,
                                                      ).toFixed(2)
                                                    : service.price.toFixed(2)}
                                            </div>
                                        </div>
                                        <Button
                                            size="sm"
                                            onClick={() => addToCart(service)}
                                        >
                                            <Plus className="mr-1 h-4 w-4" />{' '}
                                            Add
                                        </Button>
                                    </div>
                                ))}
                                {filteredServices.length === 0 && (
                                    <div className="py-8 text-center text-gray-400">
                                        No tests found
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right - Cart */}
                        <div className="w-1/2 bg-gray-50 p-4">
                            <h3 className="mb-3 font-semibold">
                                Cart ({cart.length} items)
                            </h3>

                            <div className="max-h-[400px] space-y-2 overflow-y-auto">
                                {cart.map((item) => (
                                    <div
                                        key={item.id}
                                        className="rounded-lg bg-white p-3 shadow-sm"
                                    >
                                        <div className="flex justify-between">
                                            <div>
                                                <div className="font-medium">
                                                    {item.service_name}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    ZMW {item.price.toFixed(2)}{' '}
                                                    each
                                                </div>
                                            </div>
                                            <button
                                                onClick={() =>
                                                    removeFromCart(item.id)
                                                }
                                                className="text-red-500"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                        <div className="mt-2 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() =>
                                                        updateQuantity(
                                                            item.id,
                                                            item.quantity - 1,
                                                        )
                                                    }
                                                    className="h-6 w-6 rounded border"
                                                >
                                                    -
                                                </button>
                                                <span className="w-8 text-center">
                                                    {item.quantity}
                                                </span>
                                                <button
                                                    onClick={() =>
                                                        updateQuantity(
                                                            item.id,
                                                            item.quantity + 1,
                                                        )
                                                    }
                                                    className="h-6 w-6 rounded border"
                                                >
                                                    +
                                                </button>
                                            </div>
                                            <div className="font-semibold">
                                                ZMW{' '}
                                                {(
                                                    item.price * item.quantity
                                                ).toFixed(2)}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {cart.length === 0 && (
                                    <div className="py-8 text-center text-gray-400">
                                        <ShoppingCart className="mx-auto mb-2 h-12 w-12 opacity-30" />
                                        Cart is empty
                                    </div>
                                )}
                            </div>

                            {cart.length > 0 && (
                                <div className="mt-4 border-t pt-3">
                                    <div className="mb-3 flex justify-between">
                                        <span className="font-semibold">
                                            Total:
                                        </span>
                                        <span className="text-xl font-bold text-blue-600">
                                            ZMW {totalAmount.toFixed(2)}
                                        </span>
                                    </div>
                                    <Button
                                        onClick={handleSubmit}
                                        disabled={isSubmitting}
                                        className="w-full bg-blue-600"
                                    >
                                        {isSubmitting
                                            ? 'Processing...'
                                            : `Place Order (ZMW ${totalAmount.toFixed(2)})`}
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default function Laboratory() {
    const { props } = usePage();
    const { patientId, services, previousOrders, error } =
        props as LaboratoryProps;
    console.log(previousOrders);
    const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
    const [isResultsDialogOpen, setIsResultsDialogOpen] = useState(false);
    const [selectedTestOrder, setSelectedTestOrder] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    const userRoles = (props as any).auth?.user?.profile?.roles || [];
    const isLabTechnician = userRoles.includes('lab_technician');

    const handleSaveOrder = async (items: any[], identifier: string) => {
        try {
            const response = await Http.post(`${identifier}/lab-orders`, {
                patient_id: identifier,
                services: items.map((item) => ({
                    id: item.id,
                    service_name: item.service_name,
                    service_category: item.service_category || 'Laboratory',
                    price: item.price,
                    quantity: item.quantity,
                    notes: null,
                    priority: 'routine',
                })),
            });

            if (response.status === 200 || response.status === 201) {
                Notiflix.Notify.success(
                    response.data.message ||
                        `${items.length} test(s) ordered successfully`,
                );

                router.reload({ only: ['previousOrders'] }); // or just router.reload()

                return response.data;
            }  else {
                Notiflix.Notify.failure(
                    'Something went wrong while saving order!',
                );
                throw new Error('Failed to save order');
            }
        } catch (error: any) {
            console.error('Error saving order:', error);
            Notiflix.Notify.failure(
                error.response?.data?.message ||
                    'Something went wrong while saving order!',
            );
            throw error;
        }
    };

    const handleEnterResults = (order: any) => {
        setSelectedTestOrder(order);
        setIsResultsDialogOpen(true);
    };

    const handleResultsSuccess = () => {
        router.reload();
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed':
                return 'bg-green-100 text-green-800';
            case 'cancelled':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-yellow-100 text-yellow-800';
        }
    };

    // Pagination
    const enhancedOrders = (previousOrders || []).map((order) => ({
        ...order,
        quantity: order.quantity ?? 1,
        unit_price: order.unit_price ?? 0,
        total_price: order.total_price ?? 0,
    }));

    const totalPages = Math.ceil(enhancedOrders.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedOrders = enhancedOrders.slice(
        startIndex,
        startIndex + itemsPerPage,
    );

    if (error) {
        return (
            <PatientLayout
                breadcrumbs={[
                    { title: 'Patient', href: '/' },
                    { title: 'Laboratory', href: '/' },
                ]}
            >
                <div className="p-6">
                    <div className="flex gap-3 rounded-lg border bg-red-50 p-4">
                        <AlertCircle className="h-5 w-5 text-red-500" />
                        <p className="text-red-700">{error}</p>
                    </div>
                </div>
            </PatientLayout>
        );
    }

    return (
        <PatientLayout
            breadcrumbs={[
                { title: 'Patient', href: '/' },
                { title: 'Laboratory', href: '/' },
            ]}
        >
            <div className="space-y-6 p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">
                            Laboratory Services
                        </h1>
                        <p className="mt-1 text-sm text-gray-500">
                            Manage laboratory tests and results
                        </p>
                    </div>
                    <Button
                        onClick={() => setIsOrderModalOpen(true)}
                        className="bg-blue-600"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Order Tests
                    </Button>
                </div>

                {/* Services Debug Info */}
                <div className="text-sm text-gray-400">
                    Available services: {services?.length || 0} tests found
                </div>

                {/* Orders Table */}
                {enhancedOrders.length > 0 ? (
                    <div className="overflow-hidden rounded-lg border">
                        <Table>
                            <TableHeader className="bg-gray-50">
                                <TableRow>
                                    <TableHead>Order #</TableHead>
                                    <TableHead>Test Name</TableHead>
                                    <TableHead>Qty</TableHead>
                                    <TableHead>Unit Price</TableHead>
                                    <TableHead>Total</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Date</TableHead>
                                    {isLabTechnician && (
                                        <TableHead>Action</TableHead>
                                    )}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedOrders.map((order) => (
                                    <TableRow key={order.id}>
                                        <TableCell className="font-mono text-sm">
                                            {order.order_number}
                                        </TableCell>
                                        <TableCell>
                                            {order.service_name || order.test_name}
                                        </TableCell>
                                        <TableCell>{order.quantity}</TableCell>
                                        <TableCell>
                                            ZMW {order.unit_price.toFixed(2)}
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            ZMW {order.total_price.toFixed(2)}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                className={getStatusColor(
                                                    order.status,
                                                )}
                                            >
                                                {order.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {new Date(
                                                order.created_at,
                                            ).toLocaleDateString()}
                                        </TableCell>
                                        {isLabTechnician && (
                                            <TableCell>
                                                {order.status === 'pending' && (
                                                    <Button
                                                        size="sm"
                                                        onClick={() =>
                                                            handleEnterResults(
                                                                order,
                                                            )
                                                        }
                                                        variant="outline"
                                                    >
                                                        Enter Results
                                                    </Button>
                                                )}
                                                {order.status ===
                                                    'completed' && (
                                                    <span className="flex items-center gap-1 text-sm text-green-600">
                                                        <CheckCircle className="h-4 w-4" />{' '}
                                                        Ready
                                                    </span>
                                                )}
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between border-t px-4 py-3">
                                <span className="text-sm text-gray-500">
                                    Showing {startIndex + 1} to{' '}
                                    {Math.min(
                                        startIndex + itemsPerPage,
                                        enhancedOrders.length,
                                    )}{' '}
                                    of {enhancedOrders.length}
                                </span>
                                <div className="flex gap-1">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            setCurrentPage((p) =>
                                                Math.max(1, p - 1),
                                            )
                                        }
                                        disabled={currentPage === 1}
                                        className="h-8 w-8 p-0"
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    {Array.from(
                                        { length: Math.min(5, totalPages) },
                                        (_, i) => {
                                            let pageNum = i + 1;
                                            if (
                                                totalPages > 5 &&
                                                currentPage > 3
                                            ) {
                                                pageNum = currentPage - 3 + i;
                                                if (pageNum > totalPages)
                                                    return null;
                                            }
                                            return (
                                                <Button
                                                    key={pageNum}
                                                    variant={
                                                        currentPage === pageNum
                                                            ? 'default'
                                                            : 'outline'
                                                    }
                                                    size="sm"
                                                    onClick={() =>
                                                        setCurrentPage(pageNum)
                                                    }
                                                    className={`h-8 w-8 p-0 ${currentPage === pageNum ? 'bg-blue-600' : ''}`}
                                                >
                                                    {pageNum}
                                                </Button>
                                            );
                                        },
                                    ).filter(Boolean)}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            setCurrentPage((p) =>
                                                Math.min(totalPages, p + 1),
                                            )
                                        }
                                        disabled={currentPage === totalPages}
                                        className="h-8 w-8 p-0"
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="rounded-lg border bg-gray-50 py-12 text-center">
                        <p className="text-gray-500">No test orders found</p>
                        <Button
                            onClick={() => setIsOrderModalOpen(true)}
                            variant="link"
                        >
                            Order your first test
                        </Button>
                    </div>
                )}

                {/* Order Modal */}
                <OrderModal
                    isOpen={isOrderModalOpen}
                    onClose={() => setIsOrderModalOpen(false)}
                    onSave={handleSaveOrder}
                    services={services || []}
                    patientId={patientId}
                />

                {/* Results Dialog */}
                <ResultsEntryDialog
                    isOpen={isResultsDialogOpen}
                    onClose={() => {
                        setIsResultsDialogOpen(false);
                        setSelectedTestOrder(null);
                    }}
                    onSuccess={handleResultsSuccess}
                    testOrder={selectedTestOrder}
                    patientName={(props as any).patient?.name || 'Patient'}
                />
            </div>
        </PatientLayout>
    );
}
