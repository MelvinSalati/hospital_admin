import { useState } from 'react';
import PatientLayout from '@/layouts/patients/PatientLayout';
import { usePage, Link, router } from '@inertiajs/react';
import {
    X,
    Search,
    Package,
    Clock,
    Calendar,
    User,
    Trash2,
    Minus,
    Plus,
    AlertTriangle,
    ChevronLeftIcon,
    ChevronRightIcon,
    ChevronsLeft,
    ChevronsRight,
    CreditCard,
    DollarSign,
    CheckCircle,
    Eye,
    ShoppingCart,
    FileText,
    Printer,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { dispensationAPI } from '@/services/api';
import Notiflix from 'notiflix';

export default function Dispensation() {
    const { dispensations } = usePage().props;
    console.log(dispensations);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPrescription, setSelectedPrescription] = useState(null);
    const [filterStatus, setFilterStatus] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [isDispensing, setIsDispensing] = useState(false);
    const [editedItems, setEditedItems] = useState([]);
    const [showRemoveConfirm, setShowRemoveConfirm] = useState(null);
    const [viewItemsModalOpen, setViewItemsModalOpen] = useState(false);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(4);
    const itemsPerPageOptions = [4, 5];

    // Extract patient ID from URL
    const pathname = window.location.pathname;
    const patientId = pathname.split('/')[3];

    // Filter prescriptions based on status and search term
    const filteredPrescriptions = dispensations?.filter((prescription) => {
        if (filterStatus !== 'all' && prescription.status !== filterStatus) {
            return false;
        }
        if (
            searchTerm &&
            !prescription.prescription_number
                ?.toString()
                .toLowerCase()
                .includes(searchTerm.toLowerCase())
        ) {
            return false;
        }
        return true;
    });

    // Pagination calculations
    const totalItems = filteredPrescriptions?.length || 0;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentItems = filteredPrescriptions?.slice(startIndex, endIndex);

    // Reset to first page when filters change
    const handleFilterChange = (newFilter) => {
        setFilterStatus(newFilter);
        setCurrentPage(1);
    };

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1);
    };

    const handleItemsPerPageChange = (newItemsPerPage) => {
        setItemsPerPage(newItemsPerPage);
        setCurrentPage(1);
    };

    // Pagination navigation
    const goToFirstPage = () => setCurrentPage(1);
    const goToPreviousPage = () =>
        setCurrentPage((prev) => Math.max(1, prev - 1));
    const goToNextPage = () =>
        setCurrentPage((prev) => Math.min(totalPages, prev + 1));
    const goToLastPage = () => setCurrentPage(totalPages);

    // Check if an item is paid for
    const isItemPaid = (item) => {
        // Check if the item has payment status from invoice
        return true;
        if (item.payment_status) {
            return (
                item.payment_status === 'paid' ||
                item.payment_status === 'completed'
            );
        }
        // Check if the prescription has an invoice and it's paid
        if (selectedPrescription?.invoice_status) {
            return (
                selectedPrescription.invoice_status === 'paid' ||
                selectedPrescription.invoice_status === 'completed'
            );
        }
        // Default to false - only allow dispensing if explicitly paid
        return false;
    };

    // Get payment status color
    const getPaymentStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'paid':
            case 'completed':
                return 'text-green-600 bg-green-50';
            case 'partial':
                return 'text-yellow-600 bg-yellow-50';
            case 'pending':
            case 'unpaid':
                return 'text-red-600 bg-red-50';
            default:
                return 'text-gray-600 bg-gray-50';
        }
    };

    // Check if all items are paid
    const areAllItemsPaid = (items) => {
        if (!items || items.length === 0) return false;
        return items.every((item) => isItemPaid(item));
    };

    const handleViewItems = (prescription) => {
        setSelectedPrescription(prescription);
        setViewItemsModalOpen(true);
    };

    const handleDispenseClick = (prescription) => {
        // Check if prescription has paid items
        const hasPaidItems = prescription.items?.some((item) =>
            isItemPaid(item),
        );

        if (!hasPaidItems) {
            Notiflix.Notify.warning(
                'Cannot dispense: No items have been paid for. Please complete payment first.',
            );
            return;
        }

        const initialItems =
            prescription.items?.map((item) => ({
                ...item,
                original_quantity: item.quantity || item.dosage_amount || 1,
                quantity_dispensed: isItemPaid(item)
                    ? item.quantity || item.dosage_amount || 1
                    : 0,
                quantity_prescribed: item.quantity || item.dosage_amount || 1,
                status: isItemPaid(item) ? 'pending' : 'not_dispensed',
                reason_not_dispensed: isItemPaid(item)
                    ? null
                    : 'payment_pending',
                is_removed: !isItemPaid(item),
                is_paid: isItemPaid(item),
            })) || [];

        setSelectedPrescription(prescription);
        setEditedItems(initialItems);
        setIsModalOpen(true);
    };

    const handleRemoveItem = (itemIndex) => {
        const item = editedItems[itemIndex];
        if (!item.is_paid) {
            Notiflix.Notify.warning(
                'Cannot remove unpaid item. Payment is required first.',
            );
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

    const handleUpdateQuantity = (itemIndex, newQuantity) => {
        const updatedItems = [...editedItems];
        const item = updatedItems[itemIndex];

        // Only allow quantity changes for paid items
        if (!item.is_paid) {
            Notiflix.Notify.warning(
                'Cannot dispense unpaid item. Please complete payment first.',
            );
            return;
        }

        const maxQuantity = item.original_quantity;
        let quantity = Math.max(0, Math.min(maxQuantity, newQuantity));

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
                    Notiflix.Notify.warning(
                        'No items to dispense. Please ensure items are paid for.',
                    );
                    setIsDispensing(false);
                    return;
                }

                const dispensationData = {
                    items: itemsToDispense.map((item) => ({
                        drug_id: item.id || item.drug_id,
                        drug_name:
                            item.name || item.medicine_name || item.drug_name,
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
            } catch (error) {
                console.error('Dispensation failed:', error);
                setIsDispensing(false);
                Notiflix.Notify.failure(
                    error.response?.data?.message ||
                        'Dispensation failed. Please try again.',
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

    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'pending':
                return 'bg-yellow-100 text-yellow-800';
            case 'dispensed':
                return 'bg-green-100 text-green-800';
            case 'partially_dispensed':
                return 'bg-blue-100 text-blue-800';
            case 'not_dispensed':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-600';
        }
    };

    const getTotalItems = (items) => {
        return items?.length || 0;
    };

    const getTotalQuantity = (items) => {
        return (
            items?.reduce(
                (sum, item) => sum + (item.quantity || item.dosage_amount || 1),
                0,
            ) || 0
        );
    };

    const getTotalDispensedQuantity = (items) => {
        return (
            items?.reduce(
                (sum, item) => sum + (item.quantity_dispensed || 0),
                0,
            ) || 0
        );
    };

    const getPaidItemsCount = (items) => {
        return items?.filter((item) => isItemPaid(item)).length || 0;
    };

    const getTotalPaidAmount = (items) => {
        return (
            items?.reduce(
                (sum, item) =>
                    sum +
                    (item.is_paid
                        ? (item.price || 0) * (item.quantity_dispensed || 0)
                        : 0),
                0,
            ) || 0
        );
    };

    return (
        <PatientLayout
            breadcrumbs={[
                { title: 'Patient', href: '#' },
                { title: 'Dispensation', href: '#' },
            ]}
        >
            <div className="space-y-6 p-2">
                {/* Filters Section */}
                <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                    <div className="max-w-md flex-1">
                        <div className="relative">
                            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by prescription number..."
                                value={searchTerm}
                                onChange={handleSearchChange}
                                className="w-full rounded-lg border border-gray-200 py-2 pr-4 pl-9 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => handleFilterChange('all')}
                            className={`rounded-lg px-4 py-2 text-sm transition-colors ${
                                filterStatus === 'all'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => handleFilterChange('pending')}
                            className={`rounded-lg px-4 py-2 text-sm transition-colors ${
                                filterStatus === 'pending'
                                    ? 'bg-yellow-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            Pending
                        </button>
                        <button
                            onClick={() => handleFilterChange('dispensed')}
                            className={`rounded-lg px-4 py-2 text-sm transition-colors ${
                                filterStatus === 'dispensed'
                                    ? 'bg-green-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            Dispensed
                        </button>
                    </div>
                </div>

                {/* Main Table */}
                <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="border-b border-gray-100 bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-[11px] font-medium tracking-wide text-gray-400 uppercase">
                                        Prescription #
                                    </th>
                                    <th className="px-4 py-3 text-left text-[11px] font-medium tracking-wide text-gray-400 uppercase">
                                        Date
                                    </th>
                                    <th className="px-4 py-3 text-left text-[11px] font-medium tracking-wide text-gray-400 uppercase">
                                        Items
                                    </th>
                                    <th className="px-4 py-3 text-left text-[11px] font-medium tracking-wide text-gray-400 uppercase">
                                        Total Quantity
                                    </th>
                                    <th className="px-4 py-3 text-left text-[11px] font-medium tracking-wide text-gray-400 uppercase">
                                        Payment Status
                                    </th>
                                    <th className="px-4 py-3 text-left text-[11px] font-medium tracking-wide text-gray-400 uppercase">
                                        Dispensation Status
                                    </th>
                                    <th className="px-4 py-3 text-left text-[11px] font-medium tracking-wide text-gray-400 uppercase">
                                        Action
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {currentItems?.map((prescription) => {
                                    const paidItemsCount = getPaidItemsCount(
                                        prescription.items,
                                    );
                                    const totalItemsCount = getTotalItems(
                                        prescription.items,
                                    );
                                    const allItemsPaid =
                                        paidItemsCount === totalItemsCount &&
                                        totalItemsCount > 0;

                                    return (
                                        <tr
                                            key={
                                                prescription.id ||
                                                prescription.prescription_number
                                            }
                                            className="transition-colors hover:bg-gray-50/60"
                                        >
                                            <td className="px-4 py-3">
                                                <div className="font-mono text-xs font-medium text-gray-900">
                                                    {
                                                        prescription.prescription_number
                                                    }
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="text-sm text-gray-600">
                                                    {new Date(
                                                        prescription.date ||
                                                            prescription.created_at,
                                                    ).toLocaleDateString()}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="text-sm text-gray-900">
                                                    {totalItemsCount} item(s)
                                                </div>
                                                <div className="mt-1 text-xs text-gray-400">
                                                    {paidItemsCount}/
                                                    {totalItemsCount} paid
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-sm font-medium text-gray-700">
                                                    {getTotalQuantity(
                                                        prescription.items,
                                                    )}{' '}
                                                    units
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span
                                                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${getPaymentStatusColor(allItemsPaid ? 'paid' : 'pending')}`}
                                                >
                                                    {allItemsPaid
                                                        ? 'Paid'
                                                        : `${paidItemsCount}/${totalItemsCount} Paid`}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span
                                                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(prescription.status)}`}
                                                >
                                                    {prescription.status ||
                                                        'pending'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() =>
                                                            handleViewItems(
                                                                prescription,
                                                            )
                                                        }
                                                        className="h-8 text-xs"
                                                    >
                                                        <Eye className="mr-1 h-3 w-3" />
                                                        View Items
                                                    </Button>
                                                    {prescription.status !==
                                                        'dispensed' && (
                                                        <Button
                                                            size="sm"
                                                            onClick={() =>
                                                                handleDispenseClick(
                                                                    prescription,
                                                                )
                                                            }
                                                            className={`h-8 text-xs ${!allItemsPaid ? 'cursor-not-allowed bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}
                                                        >
                                                            <ShoppingCart className="mr-1 h-3 w-3" />
                                                            Dispense
                                                        </Button>
                                                    )}
                                                    {prescription.status ===
                                                        'dispensed' && (
                                                        <span className="flex items-center gap-1 text-xs font-medium text-green-600">
                                                            <CheckCircle className="h-3 w-3" />{' '}
                                                            Dispensed
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {filteredPrescriptions?.length === 0 && (
                        <div className="py-12 text-center">
                            <Package className="mx-auto h-12 w-12 text-gray-400 opacity-30" />
                            <p className="text-sm text-gray-500">
                                No prescriptions found
                            </p>
                            {(searchTerm || filterStatus !== 'all') && (
                                <p className="mt-1 text-xs text-gray-400">
                                    Try adjusting your search or filter criteria
                                </p>
                            )}
                        </div>
                    )}

                    {/* Pagination Controls */}
                    {filteredPrescriptions?.length > 0 && (
                        <div className="flex flex-col items-center justify-between gap-4 border-t border-gray-100 bg-gray-50 px-4 py-3 sm:flex-row">
                            <div className="text-xs text-gray-500">
                                Showing {startIndex + 1} to{' '}
                                {Math.min(endIndex, totalItems)} of {totalItems}{' '}
                                prescription(s)
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-500">
                                        Show:
                                    </span>
                                    <select
                                        value={itemsPerPage}
                                        onChange={(e) =>
                                            handleItemsPerPageChange(
                                                Number(e.target.value),
                                            )
                                        }
                                        className="rounded-md border border-gray-300 px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    >
                                        {itemsPerPageOptions.map((option) => (
                                            <option key={option} value={option}>
                                                {option}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={goToFirstPage}
                                        disabled={currentPage === 1}
                                        className="rounded-md border border-gray-300 p-2 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <ChevronsLeft className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={goToPreviousPage}
                                        disabled={currentPage === 1}
                                        className="rounded-md border border-gray-300 p-2 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <ChevronLeftIcon className="h-4 w-4" />
                                    </button>

                                    <div className="flex items-center gap-1">
                                        {Array.from(
                                            { length: Math.min(5, totalPages) },
                                            (_, i) => {
                                                let pageNum;
                                                if (totalPages <= 5) {
                                                    pageNum = i + 1;
                                                } else if (currentPage <= 3) {
                                                    pageNum = i + 1;
                                                } else if (
                                                    currentPage >=
                                                    totalPages - 2
                                                ) {
                                                    pageNum =
                                                        totalPages - 4 + i;
                                                } else {
                                                    pageNum =
                                                        currentPage - 2 + i;
                                                }
                                                return (
                                                    <button
                                                        key={pageNum}
                                                        onClick={() =>
                                                            setCurrentPage(
                                                                pageNum,
                                                            )
                                                        }
                                                        className={`h-8 min-w-[32px] rounded-md px-2 text-sm transition-colors ${
                                                            currentPage ===
                                                            pageNum
                                                                ? 'bg-blue-600 text-white'
                                                                : 'border border-gray-300 hover:bg-gray-100'
                                                        }`}
                                                    >
                                                        {pageNum}
                                                    </button>
                                                );
                                            },
                                        )}
                                    </div>

                                    <button
                                        onClick={goToNextPage}
                                        disabled={currentPage === totalPages}
                                        className="rounded-md border border-gray-300 p-2 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <ChevronRightIcon className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={goToLastPage}
                                        disabled={currentPage === totalPages}
                                        className="rounded-md border border-gray-300 p-2 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <ChevronsRight className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* View Items Modal - Large Two Column Modal */}
            {viewItemsModalOpen && selectedPrescription && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                    <div
                        className="bg-opacity-50 absolute inset-0 bg-black"
                        onClick={closeViewModal}
                    ></div>
                    <div className="relative flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-white">
                        {/* Header */}
                        <div className="sticky top-0 flex items-center justify-between border-b bg-white px-6 py-4">
                            <div>
                                <h2 className="text-xl font-semibold">
                                    Prescription Details
                                </h2>
                                <p className="text-sm text-gray-500">
                                    Prescription #
                                    {selectedPrescription.prescription_number} |
                                    Date:{' '}
                                    {new Date(
                                        selectedPrescription.date ||
                                            selectedPrescription.created_at,
                                    ).toLocaleDateString()}
                                </p>
                            </div>
                            <button
                                onClick={closeViewModal}
                                className="rounded-lg p-2 transition-colors hover:bg-gray-100"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                                {/* Left Column - Items List */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-semibold text-gray-800">
                                            Prescribed Items
                                        </h3>
                                        <span className="text-sm text-gray-500">
                                            {selectedPrescription.items?.length}{' '}
                                            item(s)
                                        </span>
                                    </div>

                                    <div className="space-y-3">
                                        {selectedPrescription.items?.map(
                                            (item, idx) => {
                                                const isPaid = isItemPaid(item);
                                                return (
                                                    <div
                                                        key={idx}
                                                        className={`rounded-lg border p-4 ${isPaid ? 'bg-white' : 'border-gray-200 bg-gray-50'}`}
                                                    >
                                                        <div className="mb-3 flex items-start justify-between">
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2">
                                                                    <h4 className="font-medium text-gray-900">
                                                                        {item.name ||
                                                                            item.drug_name ||
                                                                            item.medicine_name}
                                                                    </h4>
                                                                    {isPaid ? (
                                                                        <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                                                                            <CheckCircle className="h-3 w-3" />{' '}
                                                                            Paid
                                                                        </span>
                                                                    ) : (
                                                                        <span className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">
                                                                            <AlertTriangle className="h-3 w-3" />{' '}
                                                                            Unpaid
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="mt-1 text-sm text-gray-500">
                                                                    {item.dosage ||
                                                                        item.strength}{' '}
                                                                    |{' '}
                                                                    {
                                                                        item.frequency
                                                                    }{' '}
                                                                    |{' '}
                                                                    {item.route ||
                                                                        'N/A'}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                                            <div>
                                                                <span className="text-gray-500">
                                                                    Prescribed
                                                                    Quantity:
                                                                </span>
                                                                <p className="font-medium">
                                                                    {item.quantity ||
                                                                        item.dosage_amount ||
                                                                        1}{' '}
                                                                    units
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <span className="text-gray-500">
                                                                    Unit Price:
                                                                </span>
                                                                <p className="font-medium">
                                                                    ZMW{' '}
                                                                    {item.price ||
                                                                        0}
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <span className="text-gray-500">
                                                                    Total
                                                                    Amount:
                                                                </span>
                                                                <p className="font-medium text-blue-600">
                                                                    ZMW{' '}
                                                                    {(item.price ||
                                                                        0) *
                                                                        (item.quantity ||
                                                                            1)}
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <span className="text-gray-500">
                                                                    Payment
                                                                    Status:
                                                                </span>
                                                                <p
                                                                    className={`font-medium ${isPaid ? 'text-green-600' : 'text-red-600'}`}
                                                                >
                                                                    {isPaid
                                                                        ? 'Paid'
                                                                        : 'Pending Payment'}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {!isPaid && (
                                                            <div className="mt-3 border-t border-red-100 pt-3">
                                                                <p className="flex items-center gap-1 text-xs text-red-600">
                                                                    <AlertTriangle className="h-3 w-3" />
                                                                    This item
                                                                    cannot be
                                                                    dispensed
                                                                    until
                                                                    payment is
                                                                    completed.
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            },
                                        )}
                                    </div>
                                </div>

                                {/* Right Column - Payment Summary & Dispense */}
                                <div className="space-y-4">
                                    {/* Payment Summary Card */}
                                    <div className="rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-5">
                                        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-800">
                                            <CreditCard className="h-5 w-5 text-blue-600" />
                                            Payment Summary
                                        </h3>

                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between border-b border-blue-100 pb-2">
                                                <span className="text-gray-600">
                                                    Total Items:
                                                </span>
                                                <span className="font-semibold">
                                                    {getTotalItems(
                                                        selectedPrescription.items,
                                                    )}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between border-b border-blue-100 pb-2">
                                                <span className="text-gray-600">
                                                    Paid Items:
                                                </span>
                                                <span className="font-semibold text-green-600">
                                                    {getPaidItemsCount(
                                                        selectedPrescription.items,
                                                    )}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between border-b border-blue-100 pb-2">
                                                <span className="text-gray-600">
                                                    Unpaid Items:
                                                </span>
                                                <span className="font-semibold text-red-600">
                                                    {getTotalItems(
                                                        selectedPrescription.items,
                                                    ) -
                                                        getPaidItemsCount(
                                                            selectedPrescription.items,
                                                        )}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between pt-2">
                                                <span className="font-medium text-gray-700">
                                                    Total Amount:
                                                </span>
                                                <span className="text-xl font-bold text-blue-600">
                                                    ZMW{' '}
                                                    {selectedPrescription.total_amount ||
                                                        0}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="mt-4 rounded-lg bg-white p-3">
                                            <div className="flex items-start gap-2">
                                                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-green-100">
                                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-800">
                                                        Dispensing Eligibility
                                                    </p>
                                                    <p className="mt-1 text-xs text-gray-500">
                                                        {getPaidItemsCount(
                                                            selectedPrescription.items,
                                                        ) ===
                                                            getTotalItems(
                                                                selectedPrescription.items,
                                                            ) &&
                                                        getTotalItems(
                                                            selectedPrescription.items,
                                                        ) > 0
                                                            ? '✓ All items are paid for. You can proceed with dispensing.'
                                                            : '⚠ Some items are unpaid. Only paid items can be dispensed.'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Dispense Action Card */}
                                    <div className="rounded-xl border border-gray-200 bg-white p-5">
                                        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-800">
                                            <ShoppingCart className="h-5 w-5 text-green-600" />
                                            Dispense Action
                                        </h3>

                                        <div className="space-y-4">
                                            <div className="rounded-lg border border-yellow-100 bg-yellow-50 p-3">
                                                <p className="text-sm text-yellow-800">
                                                    <span className="font-medium">
                                                        Note:
                                                    </span>{' '}
                                                    Only items marked as "Paid"
                                                    can be dispensed. Unpaid
                                                    items require payment
                                                    processing before
                                                    dispensing.
                                                </p>
                                            </div>

                                            <div className="flex gap-3">
                                                <Button
                                                    onClick={closeViewModal}
                                                    variant="outline"
                                                    className="flex-1"
                                                >
                                                    Close
                                                </Button>
                                                <Button
                                                    onClick={() => {
                                                        closeViewModal();
                                                        handleDispenseClick(
                                                            selectedPrescription,
                                                        );
                                                    }}
                                                    disabled={
                                                        getPaidItemsCount(
                                                            selectedPrescription.items,
                                                        ) === 0
                                                    }
                                                    className={`flex-1 ${getPaidItemsCount(selectedPrescription.items) === 0 ? 'cursor-not-allowed bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}
                                                >
                                                    <ShoppingCart className="mr-2 h-4 w-4" />
                                                    Dispense Paid Items
                                                </Button>
                                            </div>

                                            {getPaidItemsCount(
                                                selectedPrescription.items,
                                            ) > 0 &&
                                                getPaidItemsCount(
                                                    selectedPrescription.items,
                                                ) <
                                                    getTotalItems(
                                                        selectedPrescription.items,
                                                    ) && (
                                                    <p className="text-center text-xs text-amber-600">
                                                        Only{' '}
                                                        {getPaidItemsCount(
                                                            selectedPrescription.items,
                                                        )}{' '}
                                                        out of{' '}
                                                        {getTotalItems(
                                                            selectedPrescription.items,
                                                        )}{' '}
                                                        items will be dispensed.
                                                    </p>
                                                )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Dispense Modal - Large Two Column Layout */}
            {isModalOpen && selectedPrescription && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                    <div
                        className="bg-opacity-50 absolute inset-0 bg-black"
                        onClick={closeModal}
                    ></div>
                    <div className="relative flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-white">
                        {/* Header */}
                        <div className="sticky top-0 flex items-center justify-between border-b bg-white px-6 py-4">
                            <div>
                                <h2 className="text-xl font-semibold">
                                    Dispense Prescription
                                </h2>
                                <p className="text-sm text-gray-500">
                                    Prescription #
                                    {selectedPrescription.prescription_number}
                                </p>
                            </div>
                            <button
                                onClick={closeModal}
                                className="rounded-lg p-2 transition-colors hover:bg-gray-100"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                                {/* Left Column - Items List (2/3 width) */}
                                <div className="space-y-4 lg:col-span-2">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-semibold text-gray-800">
                                            Items to Dispense
                                        </h3>
                                        <span className="text-sm text-gray-500">
                                            {
                                                editedItems.filter(
                                                    (i) => i.is_paid,
                                                ).length
                                            }{' '}
                                            paid item(s)
                                        </span>
                                    </div>

                                    <div className="space-y-3">
                                        {editedItems.map((item, idx) => (
                                            <div
                                                key={idx}
                                                className={`rounded-lg border p-4 ${item.is_removed ? 'border-gray-200 bg-gray-50' : item.is_paid ? 'border-green-200 bg-white' : 'border-red-200 bg-red-50'}`}
                                            >
                                                <div className="mb-3 flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="font-medium text-gray-900">
                                                                {item.name ||
                                                                    item.medicine_name ||
                                                                    item.drug_name}
                                                            </h4>
                                                            {item.is_paid ? (
                                                                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                                                                    Paid
                                                                </span>
                                                            ) : (
                                                                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">
                                                                    Unpaid -
                                                                    Cannot
                                                                    Dispense
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="mt-1 text-sm text-gray-500">
                                                            {item.dosage ||
                                                                item.strength}{' '}
                                                            | {item.frequency} |{' '}
                                                            {item.route}
                                                        </div>
                                                    </div>
                                                    {item.is_paid &&
                                                        !item.is_removed && (
                                                            <button
                                                                onClick={() =>
                                                                    handleRemoveItem(
                                                                        idx,
                                                                    )
                                                                }
                                                                className="p-1 text-red-600 hover:text-red-700"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        )}
                                                </div>

                                                <div className="flex items-center justify-between">
                                                    <div className="text-sm">
                                                        <span className="text-gray-600">
                                                            Prescribed:{' '}
                                                        </span>
                                                        <span className="font-medium">
                                                            {
                                                                item.original_quantity
                                                            }{' '}
                                                            {item.unit ||
                                                                'units'}
                                                        </span>
                                                    </div>

                                                    {item.is_paid &&
                                                    !item.is_removed ? (
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-sm text-gray-600">
                                                                Dispense:
                                                            </span>
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    onClick={() =>
                                                                        handleUpdateQuantity(
                                                                            idx,
                                                                            item.quantity_dispensed -
                                                                                1,
                                                                        )
                                                                    }
                                                                    className="rounded border p-1 hover:bg-gray-50"
                                                                    disabled={
                                                                        !item.is_paid
                                                                    }
                                                                >
                                                                    <Minus className="h-4 w-4" />
                                                                </button>
                                                                <input
                                                                    type="number"
                                                                    value={
                                                                        item.quantity_dispensed
                                                                    }
                                                                    onChange={(
                                                                        e,
                                                                    ) =>
                                                                        handleUpdateQuantity(
                                                                            idx,
                                                                            parseInt(
                                                                                e
                                                                                    .target
                                                                                    .value,
                                                                            ) ||
                                                                                0,
                                                                        )
                                                                    }
                                                                    className="w-20 rounded border px-2 py-1 text-center"
                                                                    min="0"
                                                                    max={
                                                                        item.original_quantity
                                                                    }
                                                                    disabled={
                                                                        !item.is_paid
                                                                    }
                                                                />
                                                                <button
                                                                    onClick={() =>
                                                                        handleUpdateQuantity(
                                                                            idx,
                                                                            item.quantity_dispensed +
                                                                                1,
                                                                        )
                                                                    }
                                                                    className="rounded border p-1 hover:bg-gray-50"
                                                                    disabled={
                                                                        !item.is_paid
                                                                    }
                                                                >
                                                                    <Plus className="h-4 w-4" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : item.is_removed ? (
                                                        <div className="text-sm text-red-600">
                                                            <span className="font-medium">
                                                                Not Dispensed
                                                            </span>
                                                            <span className="ml-2 text-gray-500">
                                                                (Out of Stock)
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <div className="text-sm text-red-600">
                                                            <span className="font-medium">
                                                                Payment Required
                                                            </span>
                                                            <span className="ml-2 text-gray-500">
                                                                (Cannot
                                                                dispense)
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>

                                                {item.quantity_dispensed <
                                                    item.original_quantity &&
                                                    !item.is_removed &&
                                                    item.is_paid && (
                                                        <div className="mt-2 text-xs text-amber-600">
                                                            Warning: Dispensing
                                                            less than prescribed
                                                            quantity
                                                        </div>
                                                    )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Right Column - Summary (1/3 width) */}
                                <div className="space-y-4">
                                    {/* Dispensing Summary */}
                                    <div className="rounded-xl border border-green-100 bg-gradient-to-r from-green-50 to-emerald-50 p-5">
                                        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-800">
                                            <Package className="h-5 w-5 text-green-600" />
                                            Dispensing Summary
                                        </h3>

                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between border-b border-green-100 pb-2">
                                                <span className="text-gray-600">
                                                    Paid Items:
                                                </span>
                                                <span className="font-semibold text-green-600">
                                                    {
                                                        editedItems.filter(
                                                            (i) => i.is_paid,
                                                        ).length
                                                    }
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between border-b border-green-100 pb-2">
                                                <span className="text-gray-600">
                                                    Unpaid Items:
                                                </span>
                                                <span className="font-semibold text-red-600">
                                                    {
                                                        editedItems.filter(
                                                            (i) => !i.is_paid,
                                                        ).length
                                                    }
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between border-b border-green-100 pb-2">
                                                <span className="text-gray-600">
                                                    Items to Dispense:
                                                </span>
                                                <span className="font-semibold">
                                                    {
                                                        editedItems.filter(
                                                            (i) =>
                                                                i.quantity_dispensed >
                                                                    0 &&
                                                                i.is_paid,
                                                        ).length
                                                    }
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between border-b border-green-100 pb-2">
                                                <span className="text-gray-600">
                                                    Total Quantity:
                                                </span>
                                                <span className="font-semibold">
                                                    {getTotalDispensedQuantity(
                                                        editedItems,
                                                    )}{' '}
                                                    /{' '}
                                                    {getTotalQuantity(
                                                        selectedPrescription.items,
                                                    )}{' '}
                                                    units
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between pt-2">
                                                <span className="font-medium text-gray-700">
                                                    Total Value:
                                                </span>
                                                <span className="text-xl font-bold text-green-600">
                                                    ZMW{' '}
                                                    {getTotalPaidAmount(
                                                        editedItems,
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Important Notes */}
                                    <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                                        <div className="flex items-start gap-2">
                                            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
                                            <div className="text-sm text-blue-800">
                                                <p className="mb-1 font-medium">
                                                    Dispensing Instructions:
                                                </p>
                                                <ul className="list-inside list-disc space-y-1 text-xs">
                                                    <li>
                                                        Review each medication
                                                        before dispensing
                                                    </li>
                                                    <li>
                                                        Only paid items can be
                                                        dispensed
                                                    </li>
                                                    <li>
                                                        Adjust quantities as
                                                        needed for partial
                                                        dispensing
                                                    </li>
                                                    <li>
                                                        Provide counseling to
                                                        the patient on proper
                                                        medication use
                                                    </li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex gap-3 pt-2">
                                        <Button
                                            onClick={closeModal}
                                            variant="outline"
                                            className="flex-1"
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            onClick={handleDispenseAll}
                                            disabled={
                                                isDispensing ||
                                                editedItems.filter(
                                                    (i) =>
                                                        i.quantity_dispensed >
                                                            0 && i.is_paid,
                                                ).length === 0
                                            }
                                            className="flex-1 bg-green-600 hover:bg-green-700"
                                        >
                                            {isDispensing ? (
                                                <>
                                                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                                                    Processing...
                                                </>
                                            ) : (
                                                <>
                                                    <CheckCircle className="mr-2 h-4 w-4" />
                                                    Complete Dispensation
                                                </>
                                            )}
                                        </Button>
                                    </div>

                                    {editedItems.filter(
                                        (i) =>
                                            i.quantity_dispensed > 0 &&
                                            i.is_paid,
                                    ).length === 0 && (
                                        <p className="text-center text-xs text-red-600">
                                            No items selected for dispensing.
                                            Please ensure items are paid for and
                                            quantity is greater than 0.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Remove Item Confirmation Modal */}
            {showRemoveConfirm && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
                    <div
                        className="bg-opacity-50 absolute inset-0 bg-black"
                        onClick={() => setShowRemoveConfirm(null)}
                    ></div>
                    <div className="relative w-full max-w-md rounded-lg bg-white">
                        <div className="p-6">
                            <div className="mb-4 flex items-center gap-3">
                                <div className="rounded-full bg-red-100 p-2">
                                    <AlertTriangle className="h-6 w-6 text-red-600" />
                                </div>
                                <h3 className="text-lg font-semibold">
                                    Confirm Removal
                                </h3>
                            </div>
                            <p className="mb-6 text-gray-600">
                                Are you sure you want to remove "
                                {showRemoveConfirm.item?.name ||
                                    showRemoveConfirm.item?.drug_name}
                                " from this prescription? This item will be
                                marked as not dispensed.
                            </p>
                            <div className="flex justify-end gap-3">
                                <Button
                                    onClick={() => setShowRemoveConfirm(null)}
                                    variant="outline"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={confirmRemoveItem}
                                    className="bg-red-600 hover:bg-red-700"
                                >
                                    Remove Item
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </PatientLayout>
    );
}
