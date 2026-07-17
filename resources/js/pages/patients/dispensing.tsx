import { useState } from 'react';
import PatientLayout from '@/layouts/patients/PatientLayout';
import { usePage, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Notiflix from 'notiflix';
import { dispensationAPI } from '@/services/api';

// Import components
import DispensationFilters from './components/DispensationFilters';
import DispensationTable from './components/DispensationTable';
import ViewItemsModal from './components/ViewItemsModal';
import DispenseModal from './components/DispenseModal';
import ConfirmModal from './components/ConfirmModal';

// DEV MODE - Set to true to force all items as paid
const DEV_MODE = true;

export default function Dispensation() {
    const { dispensations } = usePage().props;
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

    const pathname = window.location.pathname;
    const patientId = pathname.split('/')[3];

    // Filter prescriptions
    const filteredPrescriptions = dispensations?.filter((prescription) => {
        if (filterStatus !== 'all' && prescription.status !== filterStatus)
            return false;
        if (
            searchTerm &&
            !prescription.prescription_number
                ?.toString()
                .toLowerCase()
                .includes(searchTerm.toLowerCase())
        )
            return false;
        return true;
    });

    const totalItems = filteredPrescriptions?.length || 0;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentItems = filteredPrescriptions?.slice(
        startIndex,
        startIndex + itemsPerPage,
    );

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

    // DEV MODE: Always return true for isItemPaid
    const isItemPaid = (item) => {
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

    const areAllItemsPaid = (items) => {
        if (!items || items.length === 0) return false;
        if (DEV_MODE) return true;
        return items.every((item) => isItemPaid(item));
    };

    const getPaidItemsCount = (items) => {
        if (DEV_MODE) return items?.length || 0;
        return items?.filter((item) => isItemPaid(item)).length || 0;
    };

    const getTotalItems = (items) => items?.length || 0;

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

    const handleViewItems = (prescription) => {
        setSelectedPrescription(prescription);
        setViewItemsModalOpen(true);
    };

    const handleDispenseClick = (prescription) => {
        // DEV MODE: Skip payment check
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
                return {
                    ...item,
                    original_quantity: item.quantity || item.dosage_amount || 1,
                    quantity_dispensed: isPaid
                        ? item.quantity || item.dosage_amount || 1
                        : 0,
                    quantity_prescribed:
                        item.quantity || item.dosage_amount || 1,
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

    const handleRemoveItem = (itemIndex) => {
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

    const handleUpdateQuantity = (itemIndex, newQuantity) => {
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

    return (
        <PatientLayout
            breadcrumbs={[
                { title: 'Patient', href: '#' },
                { title: 'Dispensation', href: '#' },
            ]}
        >
            <div className="space-y-4 p-2">
                {/* DEV MODE Banner */}
                {DEV_MODE && (
                    <div className="rounded border border-yellow-300 bg-yellow-50 px-4 py-2 text-sm text-yellow-800">
                        <span className="font-medium">⚠️ DEV MODE:</span> All
                        items are marked as paid for testing purposes.
                    </div>
                )}

                {/* Filters */}
                <DispensationFilters
                    searchTerm={searchTerm}
                    onSearchChange={handleSearchChange}
                    filterStatus={filterStatus}
                    onFilterChange={handleFilterChange}
                />

                {/* Table */}
                <DispensationTable
                    currentItems={currentItems}
                    totalItems={totalItems}
                    startIndex={startIndex}
                    itemsPerPage={itemsPerPage}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    onItemsPerPageChange={handleItemsPerPageChange}
                    itemsPerPageOptions={itemsPerPageOptions}
                    onViewItems={handleViewItems}
                    onDispense={handleDispenseClick}
                    getPaidItemsCount={getPaidItemsCount}
                    getTotalItems={getTotalItems}
                    getTotalQuantity={getTotalQuantity}
                    isItemPaid={isItemPaid}
                    areAllItemsPaid={areAllItemsPaid}
                    devMode={DEV_MODE}
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
                    message={`Are you sure you want to remove "${showRemoveConfirm?.item?.name || showRemoveConfirm?.item?.drug_name}" from this prescription?`}
                    confirmText="Remove Item"
                    confirmVariant="destructive"
                />
            </div>
        </PatientLayout>
    );
}
