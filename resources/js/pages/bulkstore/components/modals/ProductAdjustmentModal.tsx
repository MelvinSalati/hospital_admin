// Components/CreateAdjustmentModal.tsx
import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';

// ============================================
// TYPES
// ============================================

interface Product {
    id: number;
    barcode: string;
    name: string;
    batch_number?: string;
    expiry_date?: string;
    unit: string;
    system_stock: number;
    store: string;
    category?: string;
    supplier?: string;
    is_active?: boolean;
}

interface AdjustmentItem {
    id: string;
    product_id: number;
    product_name: string;
    barcode: string;
    batch_number?: string;
    expiry_date?: string;
    unit: string;
    system_stock: number;
    physical_count: number;
    difference: number;
    adjustment_quantity: number;
    previous_quantity?: number;
    new_quantity?: number;
}

interface Adjustment {
    id?: number | string;
    adjustment_number: string;
    date: string;
    type: 'increase' | 'decrease';
    reason: string;
    reason_details?: string;
    store: string;
    module: 'bulk_store' | 'pharmacy' | 'ward' | 'clinic' | 'laboratory';
    status:
        | 'draft'
        | 'submitted'
        | 'approved'
        | 'posted'
        | 'cancelled'
        | 'rejected';
    performed_by: string;
    approved_by?: string;
    approved_date?: string;
    notes?: string;
    items: AdjustmentItem[];
    total_difference: number;
    created_at: string;
    updated_at?: string;
    attachments?: File[];
    audit_trail?: any[];
}

interface Patient {
    id: number;
    name: string;
    hospital_number: string;
    ward: string;
    bed_number?: string;
    diagnosis?: string;
}

interface CreateAdjustmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (adjustment: Partial<Adjustment>) => Promise<void>;
    products?: Product[];
    patients?: Patient[];
    currentUser?: string;
    store?: string;
    module?: Adjustment['module'];
}

// ============================================
// ADJUSTMENT REASONS
// ============================================

const ADJUSTMENT_REASONS = [
    { value: 'stock_count_variance', label: 'Stock Count Variance' },
    { value: 'damaged', label: 'Damaged' },
    { value: 'expired', label: 'Expired' },
    { value: 'lost', label: 'Lost' },
    { value: 'theft', label: 'Theft' },
    { value: 'data_entry_error', label: 'Data Entry Error' },
    { value: 'batch_correction', label: 'Batch Correction' },
    { value: 'wrong_issue', label: 'Wrong Issue' },
    { value: 'wrong_receipt', label: 'Wrong Receipt' },
    { value: 'unit_conversion_error', label: 'Unit Conversion Error' },
    {
        value: 'opening_balance_correction',
        label: 'Opening Balance Correction',
    },
    { value: 'patient_return', label: 'Patient Return' },
    { value: 'ward_adjustment', label: 'Ward Adjustment' },
    { value: 'other', label: 'Other' },
];

// ============================================
// MAIN COMPONENT
// ============================================

const ProductAdjustmentModal: React.FC<CreateAdjustmentModalProps> = ({
    isOpen,
    onClose,
    onCreate,
    products = [],
    patients = [],
    currentUser = 'System User',
    store = 'Bulk Store',
    module = 'bulk_store',
}) => {
    // ============================================
    // STATE
    // ============================================

    const [formData, setFormData] = useState({
        type: 'decrease' as 'increase' | 'decrease',
        reason: '',
        reason_details: '',
        notes: '',
        store: store,
        module: module,
        performed_by: currentUser,
        patient_id: null as number | null,
        patient_name: '',
        ward: '',
        bed_number: '',
        diagnosis: '',
    });

    const [adjustmentItems, setAdjustmentItems] = useState<AdjustmentItem[]>(
        [],
    );
    const [attachments, setAttachments] = useState<File[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [step, setStep] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Product[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(
        null,
    );
    const [physicalCount, setPhysicalCount] = useState<number>(1);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const [showPatientSearch, setShowPatientSearch] = useState(false);
    const [patientSearchQuery, setPatientSearchQuery] = useState('');
    const [patientResults, setPatientResults] = useState<Patient[]>([]);
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(
        null,
    );

    const fileInputRef = useRef<HTMLInputElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // ============================================
    // EFFECTS
    // ============================================

    useEffect(() => {
        if (isOpen) {
            // Reset form when modal opens
            setStep(1);
            setError(null);
            setSelectedProduct(null);
            setSearchQuery('');
            setSearchResults([]);
            setPhysicalCount(1);
        }
    }, [isOpen]);

    useEffect(() => {
        if (searchQuery.length >= 2) {
            const results = products.filter(
                (product) =>
                    product.name
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase()) ||
                    product.barcode
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase()),
            );
            setSearchResults(results.slice(0, 10));
            setShowSearchResults(true);
        } else {
            setSearchResults([]);
            setShowSearchResults(false);
        }
    }, [searchQuery, products]);

    useEffect(() => {
        if (patientSearchQuery.length >= 2) {
            const results = patients.filter(
                (patient) =>
                    patient.name
                        .toLowerCase()
                        .includes(patientSearchQuery.toLowerCase()) ||
                    patient.hospital_number
                        .toLowerCase()
                        .includes(patientSearchQuery.toLowerCase()),
            );
            setPatientResults(results.slice(0, 10));
            setShowPatientSearch(true);
        } else {
            setPatientResults([]);
            setShowPatientSearch(false);
        }
    }, [patientSearchQuery, patients]);

    // ============================================
    // HANDLERS
    // ============================================

    const generateAdjustmentNumber = (): string => {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const random = Math.floor(Math.random() * 1000)
            .toString()
            .padStart(3, '0');
        return `ADJ-${year}${month}${day}-${random}`;
    };

    const calculateAdjustment = (
        systemStock: number,
        physicalCount: number,
    ) => {
        const difference = physicalCount - systemStock;
        return {
            difference,
            adjustmentQuantity: Math.abs(difference),
        };
    };

    const addProductToAdjustment = () => {
        if (!selectedProduct) {
            toast.error('Please select a product first');
            return;
        }

        if (physicalCount < 0) {
            toast.error('Physical count cannot be negative');
            return;
        }

        const { difference, adjustmentQuantity } = calculateAdjustment(
            selectedProduct.system_stock,
            physicalCount,
        );

        const existingIndex = adjustmentItems.findIndex(
            (item) => item.product_id === selectedProduct.id,
        );

        if (existingIndex !== -1) {
            const updatedItems = [...adjustmentItems];
            updatedItems[existingIndex] = {
                ...updatedItems[existingIndex],
                physical_count: physicalCount,
                difference: difference,
                adjustment_quantity: adjustmentQuantity,
            };
            setAdjustmentItems(updatedItems);
            toast.success('Product updated in adjustment');
        } else {
            const newItem: AdjustmentItem = {
                id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                product_id: selectedProduct.id,
                product_name: selectedProduct.name,
                barcode: selectedProduct.barcode,
                batch_number: selectedProduct.batch_number,
                expiry_date: selectedProduct.expiry_date,
                unit: selectedProduct.unit,
                system_stock: selectedProduct.system_stock,
                physical_count: physicalCount,
                difference: difference,
                adjustment_quantity: adjustmentQuantity,
            };
            setAdjustmentItems((prev) => [...prev, newItem]);
            toast.success(`${selectedProduct.name} added to adjustment`);
        }

        setSelectedProduct(null);
        setSearchQuery('');
        setSearchResults([]);
        setShowSearchResults(false);
        setPhysicalCount(1);
        if (searchInputRef.current) {
            searchInputRef.current.focus();
        }
    };

    const removeAdjustmentItem = (itemId: string) => {
        setAdjustmentItems((prev) => prev.filter((item) => item.id !== itemId));
        toast.success('Item removed from adjustment');
    };

    const updateItemPhysicalCount = (
        itemId: string,
        newPhysicalCount: number,
    ) => {
        if (newPhysicalCount < 0) return;

        setAdjustmentItems((prev) =>
            prev.map((item) => {
                if (item.id === itemId) {
                    const { difference, adjustmentQuantity } =
                        calculateAdjustment(
                            item.system_stock,
                            newPhysicalCount,
                        );
                    return {
                        ...item,
                        physical_count: newPhysicalCount,
                        difference: difference,
                        adjustment_quantity: adjustmentQuantity,
                    };
                }
                return item;
            }),
        );
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files) {
            const validFiles = Array.from(files).filter(
                (file) => file.size <= 5 * 1024 * 1024,
            );
            if (validFiles.length !== files.length) {
                toast.warning('Some files exceed 5MB limit and were skipped');
            }
            setAttachments((prev) => [...prev, ...validFiles]);
            toast.success(`${validFiles.length} file(s) uploaded`);
        }
    };

    const removeAttachment = (index: number) => {
        setAttachments((prev) => prev.filter((_, i) => i !== index));
    };

    const selectPatient = (patient: Patient) => {
        setSelectedPatient(patient);
        setFormData((prev) => ({
            ...prev,
            patient_id: patient.id,
            patient_name: patient.name,
            ward: patient.ward,
            bed_number: patient.bed_number || '',
            diagnosis: patient.diagnosis || '',
        }));
        setPatientSearchQuery(patient.name);
        setShowPatientSearch(false);
        toast.success(`Patient ${patient.name} selected`);
    };

    const clearPatient = () => {
        setSelectedPatient(null);
        setPatientSearchQuery('');
        setFormData((prev) => ({
            ...prev,
            patient_id: null,
            patient_name: '',
            ward: '',
            bed_number: '',
            diagnosis: '',
        }));
    };

    const validateForm = (): boolean => {
        if (adjustmentItems.length === 0) {
            toast.error('Please add at least one product to adjust');
            return false;
        }

        if (!formData.reason) {
            toast.error('Please select a reason for adjustment');
            return false;
        }

        if (formData.type === 'decrease') {
            const itemsExceedingStock = adjustmentItems.filter(
                (item) => item.adjustment_quantity > item.system_stock,
            );
            if (itemsExceedingStock.length > 0) {
                const names = itemsExceedingStock
                    .map((i) => i.product_name)
                    .join(', ');
                toast.error(
                    `Adjustment quantity exceeds available stock for: ${names}`,
                );
                return false;
            }
        }

        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);

        try {
            const totalDifference = adjustmentItems.reduce(
                (sum, item) => sum + item.difference,
                0,
            );

            const adjustmentData: Partial<Adjustment> = {
                adjustment_number: generateAdjustmentNumber(),
                date: new Date().toISOString(),
                type: formData.type,
                reason: formData.reason,
                reason_details: formData.reason_details,
                store: formData.store,
                module: formData.module,
                status: 'draft',
                performed_by: formData.performed_by,
                notes: formData.notes,
                items: adjustmentItems,
                total_difference: totalDifference,
                created_at: new Date().toISOString(),
                attachments: attachments,
                patient_id: formData.patient_id,
                patient_name: formData.patient_name,
                ward: formData.ward,
                bed_number: formData.bed_number,
                diagnosis: formData.diagnosis,
            };

            await onCreate(adjustmentData);

            toast.success(
                `Adjustment ${adjustmentData.adjustment_number} created successfully`,
            );
            onClose();
        } catch (err) {
            const errorMessage =
                err instanceof Error
                    ? err.message
                    : 'Failed to create adjustment';
            setError(errorMessage);
            toast.error('Failed to create adjustment');
            console.error('Create error:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    // ============================================
    // RENDER FUNCTIONS
    // ============================================

    const renderProductSearch = () => {
        return (
            <div className="rounded-lg border border-gray-200 bg-white p-4">
                <h4 className="mb-3 font-medium text-gray-700">
                    Add Product to Adjustment
                </h4>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="relative">
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                            Search Product
                        </label>
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder="Search by name or barcode..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
                            onFocus={() =>
                                searchQuery.length >= 2 &&
                                setShowSearchResults(true)
                            }
                            onBlur={() =>
                                setTimeout(
                                    () => setShowSearchResults(false),
                                    200,
                                )
                            }
                        />
                        {showSearchResults && searchResults.length > 0 && (
                            <div className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
                                {searchResults.map((product) => (
                                    <div
                                        key={product.id}
                                        className="cursor-pointer px-4 py-2 hover:bg-blue-50"
                                        onMouseDown={() => {
                                            setSelectedProduct(product);
                                            setSearchQuery(product.name);
                                            setShowSearchResults(false);
                                        }}
                                    >
                                        <div className="font-medium">
                                            {product.name}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            {product.barcode} | {product.unit} |
                                            Stock: {product.system_stock}
                                            {product.batch_number &&
                                                ` | Batch: ${product.batch_number}`}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {selectedProduct && (
                        <>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                    Physical Count
                                </label>
                                <input
                                    type="number"
                                    value={physicalCount}
                                    onChange={(e) =>
                                        setPhysicalCount(
                                            parseInt(e.target.value) || 0,
                                        )
                                    }
                                    min="0"
                                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div className="flex items-end gap-2">
                                <div className="flex-1">
                                    <label className="mb-1 block text-sm font-medium text-gray-700">
                                        System Stock
                                    </label>
                                    <input
                                        type="number"
                                        value={selectedProduct.system_stock}
                                        disabled
                                        className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={addProductToAdjustment}
                                    className="rounded-md bg-blue-600 px-4 py-2 whitespace-nowrap text-white hover:bg-blue-700"
                                >
                                    Add Product
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        );
    };

    const renderItemsTable = () => {
        if (adjustmentItems.length === 0) {
            return (
                <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 py-8 text-center">
                    <p className="text-gray-500">No products added yet</p>
                    <p className="text-sm text-gray-400">
                        Search and add products using the form above
                    </p>
                </div>
            );
        }

        return (
            <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-200 bg-white">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                                Product
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                                Batch
                            </th>
                            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                                System Qty
                            </th>
                            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                                Physical Qty
                            </th>
                            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                                Difference
                            </th>
                            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                                Adjustment
                            </th>
                            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                                Action
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {adjustmentItems.map((item) => (
                            <tr
                                key={item.id}
                                className="border-t border-gray-200 hover:bg-gray-50"
                            >
                                <td className="px-4 py-3 text-sm">
                                    <div className="font-medium">
                                        {item.product_name}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {item.barcode}
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-sm">
                                    {item.batch_number || 'N/A'}
                                    {item.expiry_date && (
                                        <div className="text-xs text-gray-500">
                                            Exp:{' '}
                                            {new Date(
                                                item.expiry_date,
                                            ).toLocaleDateString()}
                                        </div>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-center text-sm">
                                    {item.system_stock}
                                </td>
                                <td className="px-4 py-3 text-center text-sm">
                                    <input
                                        type="number"
                                        value={item.physical_count}
                                        onChange={(e) =>
                                            updateItemPhysicalCount(
                                                item.id,
                                                parseInt(e.target.value) || 0,
                                            )
                                        }
                                        min="0"
                                        className="w-20 rounded border border-gray-300 px-2 py-1 text-center focus:ring-2 focus:ring-blue-500"
                                    />
                                </td>
                                <td
                                    className={`px-4 py-3 text-center text-sm font-medium ${
                                        item.difference > 0
                                            ? 'text-green-600'
                                            : item.difference < 0
                                              ? 'text-red-600'
                                              : 'text-gray-600'
                                    }`}
                                >
                                    {item.difference > 0 ? '+' : ''}
                                    {item.difference}
                                </td>
                                <td className="px-4 py-3 text-center text-sm font-bold">
                                    {item.adjustment_quantity}
                                </td>
                                <td className="px-4 py-3 text-center text-sm">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            removeAdjustmentItem(item.id)
                                        }
                                        className="font-medium text-red-600 hover:text-red-800"
                                    >
                                        Remove
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                        <tr>
                            <td
                                colSpan={4}
                                className="px-4 py-3 text-right font-semibold"
                            >
                                Total Difference:
                            </td>
                            <td className="px-4 py-3 text-center font-bold">
                                {adjustmentItems.reduce(
                                    (sum, item) => sum + item.difference,
                                    0,
                                )}
                            </td>
                            <td colSpan={2}></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        );
    };

    const renderPatientInfo = () => {
        return (
            <div className="rounded-lg border border-gray-200 bg-white p-4">
                <h4 className="mb-3 font-medium text-gray-700">
                    Patient Information
                </h4>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="relative">
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                            Search Patient
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Search by name or hospital number..."
                                value={patientSearchQuery}
                                onChange={(e) =>
                                    setPatientSearchQuery(e.target.value)
                                }
                                className="flex-1 rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
                                onFocus={() =>
                                    patientSearchQuery.length >= 2 &&
                                    setShowPatientSearch(true)
                                }
                                onBlur={() =>
                                    setTimeout(
                                        () => setShowPatientSearch(false),
                                        200,
                                    )
                                }
                            />
                            {selectedPatient && (
                                <button
                                    type="button"
                                    onClick={clearPatient}
                                    className="px-3 py-2 text-red-600 hover:text-red-800"
                                >
                                    Clear
                                </button>
                            )}
                        </div>
                        {showPatientSearch && patientResults.length > 0 && (
                            <div className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
                                {patientResults.map((patient) => (
                                    <div
                                        key={patient.id}
                                        className="cursor-pointer px-4 py-2 hover:bg-blue-50"
                                        onMouseDown={() =>
                                            selectPatient(patient)
                                        }
                                    >
                                        <div className="font-medium">
                                            {patient.name}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            {patient.hospital_number} | Ward:{' '}
                                            {patient.ward}
                                            {patient.bed_number &&
                                                ` | Bed: ${patient.bed_number}`}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {selectedPatient && (
                        <>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                    Hospital Number
                                </label>
                                <input
                                    type="text"
                                    value={selectedPatient.hospital_number}
                                    disabled
                                    className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                    Ward
                                </label>
                                <input
                                    type="text"
                                    value={formData.ward}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            ward: e.target.value,
                                        }))
                                    }
                                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                    Bed Number
                                </label>
                                <input
                                    type="text"
                                    value={formData.bed_number}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            bed_number: e.target.value,
                                        }))
                                    }
                                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                    Diagnosis
                                </label>
                                <textarea
                                    value={formData.diagnosis}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            diagnosis: e.target.value,
                                        }))
                                    }
                                    rows={2}
                                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </>
                    )}
                </div>
            </div>
        );
    };

    const renderAttachments = () => {
        return (
            <div className="rounded-lg border border-gray-200 bg-white p-4">
                <h4 className="mb-3 font-medium text-gray-700">
                    Supporting Documents
                </h4>
                <div className="space-y-3">
                    <div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            multiple
                            onChange={handleFileUpload}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                            Max 5MB per file. Supported: PDF, JPG, PNG, DOC, XLS
                        </p>
                    </div>

                    {attachments.length > 0 && (
                        <div className="space-y-1">
                            {attachments.map((file, index) => (
                                <div
                                    key={index}
                                    className="flex items-center justify-between rounded border border-gray-200 bg-gray-50 px-3 py-2"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg">📄</span>
                                        <span className="text-sm">
                                            {file.name}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            ({(file.size / 1024).toFixed(1)} KB)
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeAttachment(index)}
                                        className="text-sm font-medium text-red-600 hover:text-red-800"
                                    >
                                        Remove
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // ============================================
    // MAIN RENDER
    // ============================================

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center px-4 py-8">
                {/* Slate Overlay Background */}
                <div
                    className="fixed inset-0 bg-slate-900/75 backdrop-blur-sm transition-opacity"
                    onClick={onClose}
                />

                {/* Modal Content */}
                <div className="relative max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-xl bg-white shadow-2xl transition-all">
                    {/* Header */}
                    <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
                                    <span>📦</span> Create New Adjustment
                                </h3>
                                <p className="mt-1 text-sm text-gray-500">
                                    Fill in the details below to create a new
                                    stock adjustment
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                                aria-label="Close"
                            >
                                <svg
                                    className="h-6 w-6"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        </div>

                        {/* Progress Steps */}
                        <div className="mt-4 flex items-center gap-2">
                            {[1, 2, 3, 4].map((s) => (
                                <React.Fragment key={s}>
                                    <button
                                        onClick={() => setStep(s)}
                                        className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                                            step === s
                                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                                                : step > s
                                                  ? 'bg-green-100 text-green-700'
                                                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                        }`}
                                    >
                                        <span
                                            className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                                                step === s
                                                    ? 'bg-white/20'
                                                    : step > s
                                                      ? 'bg-green-500 text-white'
                                                      : 'bg-gray-300'
                                            }`}
                                        >
                                            {step > s ? '✓' : s}
                                        </span>
                                        {s === 1 && 'Details'}
                                        {s === 2 && 'Products'}
                                        {s === 3 && 'Patient'}
                                        {s === 4 && 'Review'}
                                    </button>
                                    {s < 4 && (
                                        <div
                                            className={`h-0.5 flex-1 ${step > s ? 'bg-green-500' : 'bg-gray-200'}`}
                                        />
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>

                    {/* Form Body */}
                    <form onSubmit={handleSubmit} className="space-y-6 p-6">
                        {error && (
                            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
                                <span className="text-xl">⚠️</span>
                                <div>
                                    <strong>Error:</strong> {error}
                                </div>
                            </div>
                        )}

                        {/* Step 1: Adjustment Details */}
                        {step === 1 && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-700">
                                            Adjustment Type *
                                        </label>
                                        <div className="flex gap-4">
                                            <label className="flex cursor-pointer items-center rounded-lg border-2 p-3 transition-all hover:border-blue-400">
                                                <input
                                                    type="radio"
                                                    value="decrease"
                                                    checked={
                                                        formData.type ===
                                                        'decrease'
                                                    }
                                                    onChange={(e) =>
                                                        setFormData((prev) => ({
                                                            ...prev,
                                                            type: e.target
                                                                .value as 'decrease',
                                                        }))
                                                    }
                                                    className="mr-2"
                                                />
                                                <span className="font-medium text-red-600">
                                                    ⬇ Decrease
                                                </span>
                                            </label>
                                            <label className="flex cursor-pointer items-center rounded-lg border-2 p-3 transition-all hover:border-blue-400">
                                                <input
                                                    type="radio"
                                                    value="increase"
                                                    checked={
                                                        formData.type ===
                                                        'increase'
                                                    }
                                                    onChange={(e) =>
                                                        setFormData((prev) => ({
                                                            ...prev,
                                                            type: e.target
                                                                .value as 'increase',
                                                        }))
                                                    }
                                                    className="mr-2"
                                                />
                                                <span className="font-medium text-green-600">
                                                    ⬆ Increase
                                                </span>
                                            </label>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-700">
                                            Adjustment Number
                                        </label>
                                        <input
                                            type="text"
                                            value={generateAdjustmentNumber()}
                                            disabled
                                            className="w-full rounded-md border border-gray-300 bg-gray-100 px-3 py-2 font-mono"
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-700">
                                            Reason *
                                        </label>
                                        <select
                                            value={formData.reason}
                                            onChange={(e) =>
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    reason: e.target.value,
                                                }))
                                            }
                                            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
                                            required
                                        >
                                            <option value="">
                                                Select Reason
                                            </option>
                                            {ADJUSTMENT_REASONS.map(
                                                (reason) => (
                                                    <option
                                                        key={reason.value}
                                                        value={reason.value}
                                                    >
                                                        {reason.label}
                                                    </option>
                                                ),
                                            )}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-700">
                                            Store
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.store}
                                            onChange={(e) =>
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    store: e.target.value,
                                                }))
                                            }
                                            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="mb-1 block text-sm font-medium text-gray-700">
                                            Reason Details
                                        </label>
                                        <textarea
                                            value={formData.reason_details}
                                            onChange={(e) =>
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    reason_details:
                                                        e.target.value,
                                                }))
                                            }
                                            placeholder="Provide additional details about the reason for adjustment..."
                                            rows={3}
                                            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="mb-1 block text-sm font-medium text-gray-700">
                                            Notes
                                        </label>
                                        <textarea
                                            value={formData.notes}
                                            onChange={(e) =>
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    notes: e.target.value,
                                                }))
                                            }
                                            placeholder="Additional notes about this adjustment..."
                                            rows={2}
                                            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (!formData.reason) {
                                                toast.error(
                                                    'Please select a reason',
                                                );
                                                return;
                                            }
                                            setStep(2);
                                        }}
                                        className="rounded-md bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
                                    >
                                        Next: Add Products →
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step 2: Products */}
                        {step === 2 && (
                            <div className="space-y-4">
                                {renderProductSearch()}
                                {renderItemsTable()}

                                <div className="flex justify-between">
                                    <button
                                        type="button"
                                        onClick={() => setStep(1)}
                                        className="rounded-md border border-gray-300 px-6 py-2 text-gray-700 hover:bg-gray-50"
                                    >
                                        ← Back
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (adjustmentItems.length === 0) {
                                                toast.error(
                                                    'Please add at least one product',
                                                );
                                                return;
                                            }
                                            setStep(3);
                                        }}
                                        className="rounded-md bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
                                    >
                                        Next: Patient Info →
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Patient Information */}
                        {step === 3 && (
                            <div className="space-y-4">
                                {renderPatientInfo()}
                                {renderAttachments()}

                                <div className="flex justify-between">
                                    <button
                                        type="button"
                                        onClick={() => setStep(2)}
                                        className="rounded-md border border-gray-300 px-6 py-2 text-gray-700 hover:bg-gray-50"
                                    >
                                        ← Back
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setStep(4)}
                                        className="rounded-md bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
                                    >
                                        Review & Create →
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step 4: Review & Submit */}
                        {step === 4 && (
                            <div className="space-y-4">
                                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                                    <h4 className="mb-2 font-semibold text-blue-800">
                                        Review Adjustment
                                    </h4>
                                    <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
                                        <div>
                                            <span className="text-gray-500">
                                                Type:
                                            </span>
                                            <span className="ml-2 font-medium">
                                                {formData.type === 'increase'
                                                    ? '⬆ Increase'
                                                    : '⬇ Decrease'}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">
                                                Reason:
                                            </span>
                                            <span className="ml-2 font-medium">
                                                {ADJUSTMENT_REASONS.find(
                                                    (r) =>
                                                        r.value ===
                                                        formData.reason,
                                                )?.label || formData.reason}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">
                                                Products:
                                            </span>
                                            <span className="ml-2 font-medium">
                                                {adjustmentItems.length}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">
                                                Total Difference:
                                            </span>
                                            <span className="ml-2 font-bold">
                                                {adjustmentItems.reduce(
                                                    (sum, item) =>
                                                        sum + item.difference,
                                                    0,
                                                )}
                                            </span>
                                        </div>
                                        {selectedPatient && (
                                            <>
                                                <div>
                                                    <span className="text-gray-500">
                                                        Patient:
                                                    </span>
                                                    <span className="ml-2 font-medium">
                                                        {selectedPatient.name}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-gray-500">
                                                        Ward:
                                                    </span>
                                                    <span className="ml-2 font-medium">
                                                        {formData.ward}
                                                    </span>
                                                </div>
                                            </>
                                        )}
                                        <div className="md:col-span-2">
                                            <span className="text-gray-500">
                                                Items:
                                            </span>
                                            <div className="mt-1 space-y-1">
                                                {adjustmentItems.map((item) => (
                                                    <div
                                                        key={item.id}
                                                        className="flex justify-between rounded border border-gray-200 bg-white p-2"
                                                    >
                                                        <span>
                                                            {item.product_name}
                                                        </span>
                                                        <span
                                                            className={
                                                                item.difference >
                                                                0
                                                                    ? 'text-green-600'
                                                                    : 'text-red-600'
                                                            }
                                                        >
                                                            {item.difference > 0
                                                                ? '+'
                                                                : ''}
                                                            {item.difference}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-between">
                                    <button
                                        type="button"
                                        onClick={() => setStep(3)}
                                        className="rounded-md border border-gray-300 px-6 py-2 text-gray-700 hover:bg-gray-50"
                                    >
                                        ← Back
                                    </button>
                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            className="rounded-md border border-gray-300 px-6 py-2 text-gray-700 hover:bg-gray-50"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="flex items-center gap-2 rounded-md bg-green-600 px-6 py-2 text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            {isSubmitting ? (
                                                <>
                                                    <span className="animate-spin">
                                                        ⏳
                                                    </span>
                                                    Creating...
                                                </>
                                            ) : (
                                                <>
                                                    <span>✅</span>
                                                    Create Adjustment
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </form>

                    {/* Footer */}
                    <div className="sticky bottom-0 flex justify-between border-t border-gray-200 bg-gray-50 px-6 py-3 text-xs text-gray-500">
                        <span>Step {step} of 4</span>
                        <span>Hospital Bulk Store System v2.0</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductAdjustmentModal;
