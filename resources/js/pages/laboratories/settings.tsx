// pages/laboratory/settings.tsx
import { useState, useEffect, useMemo } from 'react';
import { usePage, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Plus,
    Search,
    Settings,
    X,
    Trash2,
    Edit2,
    Eye,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Save,
    AlertTriangle,
    CheckCircle,
    Clock,
    Loader2,
    FileText,
    Microscope,
    TestTube,
    FlaskConical,
    Syringe,
    Dna,
    HeartPulse,
    Activity,
    Pill,
    Stethoscope,
    ArrowUpDown,
    Filter,
    Download,
    Printer,
    Upload,
    Calendar,
    User,
    Building,
    Phone,
    Mail,
    MapPin,
    Tag,
    Layers,
    Clipboard,
    DollarSign,
    Shield,
} from 'lucide-react';
import Notiflix from 'notiflix';
import Http from '@/utils/Http';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TestConfig {
    id: number;
    test_name: string;
    test_code: string;
    category: string;
    sample_type: string;
    unit: string;
    reference_range: string;
    cash_price: number;
    insurance_price: number;
    turnaround_time: string;
    is_active: boolean;
    parameters: TestParameter[];
    created_at: string;
    updated_at: string;
}

interface TestParameter {
    id: number;
    test_config_id: number;
    parameter_name: string;
    parameter_code: string;
    data_type:
        | 'text'
        | 'number'
        | 'select'
        | 'textarea'
        | 'date'
        | 'time'
        | 'checkbox'
        | 'file';
    unit: string;
    reference_range: string;
    options: string[];
    is_required: boolean;
    is_active: boolean;
    display_order: number;
    created_at: string;
    updated_at: string;
}

interface TestCategory {
    id: number;
    name: string;
    description: string;
    is_active: boolean;
    test_count: number;
}

// ─── Page Props ──────────────────────────────────────────────────────────────

interface SettingsPageProps {
    tests: TestConfig[];
    categories: TestCategory[];
}

// ─── Components ──────────────────────────────────────────────────────────────

const StatusBadge = ({ status }: { status: string }) => {
    const config: Record<string, { color: string; icon: any; label: string }> =
        {
            active: { color: 'green', icon: CheckCircle, label: 'Active' },
            inactive: { color: 'gray', icon: X, label: 'Inactive' },
            pending: { color: 'yellow', icon: Clock, label: 'Pending' },
            entered: { color: 'blue', icon: FileText, label: 'Entered' },
            verified: { color: 'green', icon: CheckCircle, label: 'Verified' },
            rejected: { color: 'red', icon: AlertTriangle, label: 'Rejected' },
        };

    const { color, icon: Icon, label } = config[status] || config.pending;

    return (
        <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-${color}-100 text-${color}-700`}
        >
            <Icon className="h-3 w-3" />
            {label}
        </span>
    );
};

// ─── Edit Price Modal ─────────────────────────────────────────────────────

const EditPriceModal = ({
    isOpen,
    onClose,
    onSuccess,
    test,
}: {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    test: TestConfig | null;
}) => {
    const [formData, setFormData] = useState({
        cash_price: '',
        insurance_price: '',
        test_name: '',
        test_code: '',
        category: '',
        sample_type: '',
        unit: '',
        reference_range: '',
        turnaround_time: '',
        is_active: true,
    });
    const [errors, setErrors] = useState<any>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (test) {
            setFormData({
                cash_price: test.cash_price?.toString() || '0',
                insurance_price: test.insurance_price?.toString() || '0',
                test_name: test.test_name || '',
                test_code: test.test_code || '',
                category: test.category || '',
                sample_type: test.sample_type || '',
                unit: test.unit || '',
                reference_range: test.reference_range || '',
                turnaround_time: test.turnaround_time || '',
                is_active: test.is_active !== undefined ? test.is_active : true,
            });
        }
    }, [test]);

    if (!isOpen || !test) return null;

    const handleChange = (
        e: React.ChangeEvent<
            HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
        >,
    ) => {
        const { name, value, type } = e.target;
        const val =
            type === 'checkbox'
                ? (e.target as HTMLInputElement).checked
                : value;
        setFormData((prev) => ({ ...prev, [name]: val }));
        if (errors[name]) {
            setErrors((prev: any) => ({ ...prev, [name]: '' }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        const data = {
            cash_price: parseFloat(formData.cash_price) || 0,
            insurance_price: parseFloat(formData.insurance_price) || 0,
            test_name: formData.test_name,
            test_code: formData.test_code,
            category: formData.category,
            sample_type: formData.sample_type,
            unit: formData.unit,
            reference_range: formData.reference_range,
            turnaround_time: formData.turnaround_time,
            is_active: formData.is_active,
        };

        try {
            const response = await Http.put(
                `/laboratory/tests/${test.id}`,
                data,
            );
            if (response.data.success) {
                Notiflix.Notify.success('Test updated successfully');
                onSuccess();
                onClose();
            }
        } catch (error: any) {
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
            }
            Notiflix.Notify.failure(
                error.response?.data?.message || 'Failed to update test',
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
            <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
                {/* Header - Fixed */}
                <div className="flex items-center justify-between rounded-t-lg border-b bg-white px-5 py-3">
                    <div>
                        <h2 className="text-base font-semibold">Edit Test</h2>
                        <p className="text-xs text-gray-500">
                            {test.test_name} ({test.test_code})
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Scrollable Body */}
                <div className="flex-1 overflow-y-auto p-5">
                    <form
                        id="edit-price-form"
                        onSubmit={handleSubmit}
                        className="space-y-4"
                    >
                        {/* Pricing Section */}
                        <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-blue-800">
                                <DollarSign className="h-4 w-4" />
                                Pricing
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-gray-700">
                                        Cash Price (ZMW) *
                                    </label>
                                    <div className="relative">
                                        <span className="absolute top-1/2 left-3 -translate-y-1/2 text-xs text-gray-500">
                                            ZMW
                                        </span>
                                        <input
                                            type="number"
                                            name="cash_price"
                                            value={formData.cash_price}
                                            onChange={handleChange}
                                            step="0.01"
                                            min="0"
                                            className={`w-full rounded border ${errors.cash_price ? 'border-red-500' : 'border-gray-300'} py-1.5 pr-3 pl-12 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none`}
                                            placeholder="0.00"
                                            required
                                        />
                                    </div>
                                    {errors.cash_price && (
                                        <p className="mt-1 text-xs text-red-500">
                                            {errors.cash_price}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-gray-700">
                                        Insurance Price (ZMW) *
                                    </label>
                                    <div className="relative">
                                        <span className="absolute top-1/2 left-3 -translate-y-1/2 text-xs text-gray-500">
                                            ZMW
                                        </span>
                                        <input
                                            type="number"
                                            name="insurance_price"
                                            value={formData.insurance_price}
                                            onChange={handleChange}
                                            step="0.01"
                                            min="0"
                                            className={`w-full rounded border ${errors.insurance_price ? 'border-red-500' : 'border-gray-300'} py-1.5 pr-3 pl-12 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none`}
                                            placeholder="0.00"
                                            required
                                        />
                                    </div>
                                    {errors.insurance_price && (
                                        <p className="mt-1 text-xs text-red-500">
                                            {errors.insurance_price}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Basic Info */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="mb-1 block text-xs font-medium text-gray-700">
                                    Test Name *
                                </label>
                                <input
                                    type="text"
                                    name="test_name"
                                    value={formData.test_name}
                                    onChange={handleChange}
                                    className={`w-full rounded border ${errors.test_name ? 'border-red-500' : 'border-gray-300'} px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none`}
                                    required
                                />
                                {errors.test_name && (
                                    <p className="mt-1 text-xs text-red-500">
                                        {errors.test_name}
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-medium text-gray-700">
                                    Test Code *
                                </label>
                                <input
                                    type="text"
                                    name="test_code"
                                    value={formData.test_code}
                                    onChange={handleChange}
                                    className={`w-full rounded border ${errors.test_code ? 'border-red-500' : 'border-gray-300'} px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none`}
                                    required
                                />
                                {errors.test_code && (
                                    <p className="mt-1 text-xs text-red-500">
                                        {errors.test_code}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="mb-1 block text-xs font-medium text-gray-700">
                                    Category *
                                </label>
                                <input
                                    type="text"
                                    name="category"
                                    value={formData.category}
                                    onChange={handleChange}
                                    className={`w-full rounded border ${errors.category ? 'border-red-500' : 'border-gray-300'} px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none`}
                                    required
                                />
                                {errors.category && (
                                    <p className="mt-1 text-xs text-red-500">
                                        {errors.category}
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-medium text-gray-700">
                                    Sample Type *
                                </label>
                                <input
                                    type="text"
                                    name="sample_type"
                                    value={formData.sample_type}
                                    onChange={handleChange}
                                    className={`w-full rounded border ${errors.sample_type ? 'border-red-500' : 'border-gray-300'} px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none`}
                                    required
                                />
                                {errors.sample_type && (
                                    <p className="mt-1 text-xs text-red-500">
                                        {errors.sample_type}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="mb-1 block text-xs font-medium text-gray-700">
                                    Unit
                                </label>
                                <input
                                    type="text"
                                    name="unit"
                                    value={formData.unit}
                                    onChange={handleChange}
                                    className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    placeholder="e.g., g/dL"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-medium text-gray-700">
                                    Reference Range
                                </label>
                                <input
                                    type="text"
                                    name="reference_range"
                                    value={formData.reference_range}
                                    onChange={handleChange}
                                    className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    placeholder="e.g., 4.5-11.0"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-medium text-gray-700">
                                    Turnaround Time
                                </label>
                                <input
                                    type="text"
                                    name="turnaround_time"
                                    value={formData.turnaround_time}
                                    onChange={handleChange}
                                    className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    placeholder="e.g., 2 hours"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                name="is_active"
                                id="is_active"
                                checked={formData.is_active}
                                onChange={handleChange}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <label
                                htmlFor="is_active"
                                className="text-sm text-gray-700"
                            >
                                Active
                            </label>
                        </div>

                        {errors.submit && (
                            <p className="text-xs text-red-500">
                                {errors.submit}
                            </p>
                        )}
                    </form>
                </div>

                {/* Footer - Fixed */}
                <div className="flex justify-end gap-2 rounded-b-lg border-t bg-gray-50 px-5 py-3">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        className="text-sm"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        form="edit-price-form"
                        disabled={isSubmitting}
                        className="bg-blue-600 text-sm hover:bg-blue-700"
                    >
                        {isSubmitting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            'Update Test'
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
};

// ─── Test Configuration Modal ──────────────────────────────────────────────

const TestConfigModal = ({
    isOpen,
    onClose,
    onSuccess,
    config,
    categories,
}: {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    config?: TestConfig | null;
    categories: TestCategory[];
}) => {
    const [formData, setFormData] = useState({
        test_name: '',
        test_code: '',
        category: '',
        sample_type: '',
        unit: '',
        reference_range: '',
        cash_price: '',
        insurance_price: '',
        turnaround_time: '',
        is_active: true,
    });
    const [parameters, setParameters] = useState<Partial<TestParameter>[]>([
        {
            parameter_name: '',
            data_type: 'text',
            is_required: true,
            is_active: true,
            display_order: 0,
        },
    ]);
    const [errors, setErrors] = useState<any>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (config) {
            setFormData({
                test_name: config.test_name,
                test_code: config.test_code,
                category: config.category,
                sample_type: config.sample_type,
                unit: config.unit || '',
                reference_range: config.reference_range || '',
                cash_price: config.cash_price?.toString() || '0',
                insurance_price: config.insurance_price?.toString() || '0',
                turnaround_time: config.turnaround_time || '',
                is_active: config.is_active,
            });
            setParameters(
                config.parameters || [
                    {
                        parameter_name: '',
                        data_type: 'text',
                        is_required: true,
                        is_active: true,
                        display_order: 0,
                    },
                ],
            );
        } else {
            setFormData({
                test_name: '',
                test_code: '',
                category: '',
                sample_type: '',
                unit: '',
                reference_range: '',
                cash_price: '',
                insurance_price: '',
                turnaround_time: '',
                is_active: true,
            });
            setParameters([
                {
                    parameter_name: '',
                    data_type: 'text',
                    is_required: true,
                    is_active: true,
                    display_order: 0,
                },
            ]);
        }
    }, [config]);

    if (!isOpen) return null;

    const handleChange = (
        e: React.ChangeEvent<
            HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
        >,
    ) => {
        const { name, value, type } = e.target;
        const val =
            type === 'checkbox'
                ? (e.target as HTMLInputElement).checked
                : value;
        setFormData((prev) => ({ ...prev, [name]: val }));
        if (errors[name]) {
            setErrors((prev: any) => ({ ...prev, [name]: '' }));
        }
    };

    const handleParameterChange = (
        index: number,
        field: string,
        value: any,
    ) => {
        const updated = [...parameters];
        updated[index] = { ...updated[index], [field]: value };
        setParameters(updated);
    };

    const addParameter = () => {
        setParameters([
            ...parameters,
            {
                parameter_name: '',
                data_type: 'text',
                is_required: true,
                is_active: true,
                display_order: parameters.length,
            },
        ]);
    };

    const removeParameter = (index: number) => {
        if (parameters.length > 1) {
            setParameters(parameters.filter((_, i) => i !== index));
        } else {
            Notiflix.Notify.warning('Test must have at least one parameter');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        const data = {
            ...formData,
            cash_price: parseFloat(formData.cash_price) || 0,
            insurance_price: parseFloat(formData.insurance_price) || 0,
            parameters: parameters.filter((p) => p.parameter_name),
        };

        try {
            const url = config
                ? `/laboratory/tests/${config.id}`
                : '/laboratory/tests';
            const response = config
                ? await Http.put(url, data)
                : await Http.post(url, data);

            if (response.data.success) {
                Notiflix.Notify.success(
                    config
                        ? 'Test updated successfully'
                        : 'Test created successfully',
                );
                onSuccess();
                onClose();
            }
        } catch (error: any) {
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
            }
            Notiflix.Notify.failure(
                error.response?.data?.message ||
                    'Failed to save test configuration',
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const dataTypes = [
        'text',
        'number',
        'select',
        'textarea',
        'date',
        'time',
        'checkbox',
        'file',
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
                {/* Header - Fixed */}
                <div className="flex items-center justify-between rounded-t-lg border-b bg-white px-5 py-3">
                    <div>
                        <h2 className="text-base font-semibold">
                            {config ? 'Edit' : 'New'} Test Configuration
                        </h2>
                        <p className="text-xs text-gray-500">
                            Configure test parameters and pricing
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Scrollable Body */}
                <div className="flex-1 overflow-y-auto p-5">
                    <form
                        id="test-config-form"
                        onSubmit={handleSubmit}
                        className="space-y-4"
                    >
                        {/* Basic Info */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="mb-1 block text-xs font-medium text-gray-700">
                                    Test Name *
                                </label>
                                <input
                                    type="text"
                                    name="test_name"
                                    value={formData.test_name}
                                    onChange={handleChange}
                                    className={`w-full rounded border ${errors.test_name ? 'border-red-500' : 'border-gray-300'} px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none`}
                                    placeholder="e.g., Complete Blood Count"
                                    required
                                />
                                {errors.test_name && (
                                    <p className="mt-1 text-xs text-red-500">
                                        {errors.test_name}
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-medium text-gray-700">
                                    Test Code *
                                </label>
                                <input
                                    type="text"
                                    name="test_code"
                                    value={formData.test_code}
                                    onChange={handleChange}
                                    className={`w-full rounded border ${errors.test_code ? 'border-red-500' : 'border-gray-300'} px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none`}
                                    placeholder="e.g., CBC-001"
                                    required
                                />
                                {errors.test_code && (
                                    <p className="mt-1 text-xs text-red-500">
                                        {errors.test_code}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="mb-1 block text-xs font-medium text-gray-700">
                                    Category *
                                </label>
                                <select
                                    name="category"
                                    value={formData.category}
                                    onChange={handleChange}
                                    className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    required
                                >
                                    <option value="">Select Category</option>
                                    {categories.map((cat) => (
                                        <option key={cat.id} value={cat.name}>
                                            {cat.name}
                                        </option>
                                    ))}
                                </select>
                                {errors.category && (
                                    <p className="mt-1 text-xs text-red-500">
                                        {errors.category}
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-medium text-gray-700">
                                    Sample Type *
                                </label>
                                <input
                                    type="text"
                                    name="sample_type"
                                    value={formData.sample_type}
                                    onChange={handleChange}
                                    className={`w-full rounded border ${errors.sample_type ? 'border-red-500' : 'border-gray-300'} px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none`}
                                    placeholder="e.g., Blood, Urine, Swab"
                                    required
                                />
                                {errors.sample_type && (
                                    <p className="mt-1 text-xs text-red-500">
                                        {errors.sample_type}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Pricing Section */}
                        <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-blue-800">
                                <DollarSign className="h-4 w-4" />
                                Pricing
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-gray-700">
                                        Cash Price (ZMW) *
                                    </label>
                                    <div className="relative">
                                        <span className="absolute top-1/2 left-3 -translate-y-1/2 text-xs text-gray-500">
                                            ZMW
                                        </span>
                                        <input
                                            type="number"
                                            name="cash_price"
                                            value={formData.cash_price}
                                            onChange={handleChange}
                                            step="0.01"
                                            min="0"
                                            className={`w-full rounded border ${errors.cash_price ? 'border-red-500' : 'border-gray-300'} py-1.5 pr-3 pl-12 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none`}
                                            placeholder="0.00"
                                            required
                                        />
                                    </div>
                                    {errors.cash_price && (
                                        <p className="mt-1 text-xs text-red-500">
                                            {errors.cash_price}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-gray-700">
                                        Insurance Price (ZMW) *
                                    </label>
                                    <div className="relative">
                                        <span className="absolute top-1/2 left-3 -translate-y-1/2 text-xs text-gray-500">
                                            ZMW
                                        </span>
                                        <input
                                            type="number"
                                            name="insurance_price"
                                            value={formData.insurance_price}
                                            onChange={handleChange}
                                            step="0.01"
                                            min="0"
                                            className={`w-full rounded border ${errors.insurance_price ? 'border-red-500' : 'border-gray-300'} py-1.5 pr-3 pl-12 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none`}
                                            placeholder="0.00"
                                            required
                                        />
                                    </div>
                                    {errors.insurance_price && (
                                        <p className="mt-1 text-xs text-red-500">
                                            {errors.insurance_price}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="mb-1 block text-xs font-medium text-gray-700">
                                    Unit
                                </label>
                                <input
                                    type="text"
                                    name="unit"
                                    value={formData.unit}
                                    onChange={handleChange}
                                    className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    placeholder="e.g., g/dL, mg/dL"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-medium text-gray-700">
                                    Reference Range
                                </label>
                                <input
                                    type="text"
                                    name="reference_range"
                                    value={formData.reference_range}
                                    onChange={handleChange}
                                    className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    placeholder="e.g., 4.5-11.0"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-medium text-gray-700">
                                    Turnaround Time
                                </label>
                                <input
                                    type="text"
                                    name="turnaround_time"
                                    value={formData.turnaround_time}
                                    onChange={handleChange}
                                    className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    placeholder="e.g., 2 hours, 1 day"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                name="is_active"
                                id="is_active"
                                checked={formData.is_active}
                                onChange={handleChange}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <label
                                htmlFor="is_active"
                                className="text-sm text-gray-700"
                            >
                                Active
                            </label>
                        </div>

                        {/* Parameters Section */}
                        <div className="border-t pt-4">
                            <div className="mb-3 flex items-center justify-between">
                                <h3 className="flex items-center gap-2 text-sm font-semibold">
                                    <Clipboard className="h-4 w-4" />
                                    Test Parameters
                                </h3>
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={addParameter}
                                    className="h-7 gap-1 text-xs"
                                >
                                    <Plus className="h-3 w-3" /> Add Parameter
                                </Button>
                            </div>

                            <div className="space-y-2">
                                {parameters.map((param, index) => (
                                    <div
                                        key={index}
                                        className="rounded-lg border bg-gray-50 p-3"
                                    >
                                        <div className="grid grid-cols-12 gap-2">
                                            <div className="col-span-3">
                                                <label className="mb-0.5 block text-xs font-medium text-gray-700">
                                                    Parameter *
                                                </label>
                                                <input
                                                    type="text"
                                                    value={
                                                        param.parameter_name ||
                                                        ''
                                                    }
                                                    onChange={(e) =>
                                                        handleParameterChange(
                                                            index,
                                                            'parameter_name',
                                                            e.target.value,
                                                        )
                                                    }
                                                    className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                                    placeholder="e.g., Hemoglobin"
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <label className="mb-0.5 block text-xs font-medium text-gray-700">
                                                    Type *
                                                </label>
                                                <select
                                                    value={
                                                        param.data_type ||
                                                        'text'
                                                    }
                                                    onChange={(e) =>
                                                        handleParameterChange(
                                                            index,
                                                            'data_type',
                                                            e.target.value,
                                                        )
                                                    }
                                                    className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                                >
                                                    {dataTypes.map((type) => (
                                                        <option
                                                            key={type}
                                                            value={type}
                                                        >
                                                            {type}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="col-span-2">
                                                <label className="mb-0.5 block text-xs font-medium text-gray-700">
                                                    Unit
                                                </label>
                                                <input
                                                    type="text"
                                                    value={param.unit || ''}
                                                    onChange={(e) =>
                                                        handleParameterChange(
                                                            index,
                                                            'unit',
                                                            e.target.value,
                                                        )
                                                    }
                                                    className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                                    placeholder="g/dL"
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <label className="mb-0.5 block text-xs font-medium text-gray-700">
                                                    Reference
                                                </label>
                                                <input
                                                    type="text"
                                                    value={
                                                        param.reference_range ||
                                                        ''
                                                    }
                                                    onChange={(e) =>
                                                        handleParameterChange(
                                                            index,
                                                            'reference_range',
                                                            e.target.value,
                                                        )
                                                    }
                                                    className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                                    placeholder="13-17"
                                                />
                                            </div>
                                            <div className="col-span-2 flex items-center gap-3">
                                                <div className="flex items-center gap-1">
                                                    <input
                                                        type="checkbox"
                                                        checked={
                                                            param.is_required ||
                                                            false
                                                        }
                                                        onChange={(e) =>
                                                            handleParameterChange(
                                                                index,
                                                                'is_required',
                                                                e.target
                                                                    .checked,
                                                            )
                                                        }
                                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                    />
                                                    <label className="text-[10px] text-gray-500">
                                                        Required
                                                    </label>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() =>
                                                        removeParameter(index)
                                                    }
                                                    className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </div>

                                        {param.data_type === 'select' && (
                                            <div className="mt-2">
                                                <label className="mb-0.5 block text-xs font-medium text-gray-700">
                                                    Options (comma separated)
                                                </label>
                                                <input
                                                    type="text"
                                                    value={
                                                        param.options?.join(
                                                            ', ',
                                                        ) || ''
                                                    }
                                                    onChange={(e) =>
                                                        handleParameterChange(
                                                            index,
                                                            'options',
                                                            e.target.value
                                                                .split(',')
                                                                .map((s) =>
                                                                    s.trim(),
                                                                ),
                                                        )
                                                    }
                                                    className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                                    placeholder="Option 1, Option 2, Option 3"
                                                />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </form>
                </div>

                {/* Footer - Fixed */}
                <div className="flex justify-end gap-2 rounded-b-lg border-t bg-gray-50 px-5 py-3">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        className="text-sm"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        form="test-config-form"
                        disabled={isSubmitting}
                        className="bg-blue-600 text-sm hover:bg-blue-700"
                    >
                        {isSubmitting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            'Save Configuration'
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
};

// ─── Category Modal ─────────────────────────────────────────────────────────

const CategoryModal = ({
    isOpen,
    onClose,
    onSuccess,
    category,
}: {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    category?: TestCategory | null;
}) => {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        is_active: true,
    });
    const [errors, setErrors] = useState<any>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (category) {
            setFormData({
                name: category.name,
                description: category.description || '',
                is_active: category.is_active,
            });
        } else {
            setFormData({
                name: '',
                description: '',
                is_active: true,
            });
        }
    }, [category]);

    if (!isOpen) return null;

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => {
        const { name, value, type } = e.target;
        const val =
            type === 'checkbox'
                ? (e.target as HTMLInputElement).checked
                : value;
        setFormData((prev) => ({ ...prev, [name]: val }));
        if (errors[name]) {
            setErrors((prev: any) => ({ ...prev, [name]: '' }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const url = category
                ? `/laboratory/categories/${category.id}`
                : '/laboratory/categories';
            const response = category
                ? await Http.put(url, formData)
                : await Http.post(url, formData);

            if (response.data.success) {
                Notiflix.Notify.success(
                    category ? 'Category updated' : 'Category created',
                );
                onSuccess();
                onClose();
            }
        } catch (error: any) {
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
            }
            Notiflix.Notify.failure(
                error.response?.data?.message || 'Failed to save category',
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
            <div className="relative flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
                {/* Header - Fixed */}
                <div className="flex items-center justify-between rounded-t-lg border-b bg-white px-5 py-3">
                    <h2 className="text-base font-semibold">
                        {category ? 'Edit' : 'New'} Category
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Scrollable Body */}
                <div className="flex-1 overflow-y-auto p-5">
                    <form
                        id="category-form"
                        onSubmit={handleSubmit}
                        className="space-y-4"
                    >
                        <div>
                            <label className="mb-1 block text-xs font-medium text-gray-700">
                                Category Name *
                            </label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                className={`w-full rounded border ${errors.name ? 'border-red-500' : 'border-gray-300'} px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none`}
                                placeholder="e.g., Hematology"
                                required
                            />
                            {errors.name && (
                                <p className="mt-1 text-xs text-red-500">
                                    {errors.name}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="mb-1 block text-xs font-medium text-gray-700">
                                Description
                            </label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                rows={2}
                                className="w-full resize-none rounded border border-gray-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                placeholder="Category description..."
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                name="is_active"
                                id="is_active"
                                checked={formData.is_active}
                                onChange={handleChange}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <label
                                htmlFor="is_active"
                                className="text-sm text-gray-700"
                            >
                                Active
                            </label>
                        </div>
                    </form>
                </div>

                {/* Footer - Fixed */}
                <div className="flex justify-end gap-2 rounded-b-lg border-t bg-gray-50 px-5 py-3">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        className="text-sm"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        form="category-form"
                        disabled={isSubmitting}
                        className="bg-blue-600 text-sm hover:bg-blue-700"
                    >
                        {isSubmitting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            'Save Category'
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
};

// ─── Main Component ──────────────────────────────────────────────────────────

export default function SettingsPage() {
    const { props } = usePage<SettingsPageProps>();
    console.log(props);
    const initialTests = props.tests || [];
    const initialCategories = props.categories || [];

    const [loading, setLoading] = useState(false);
    const [testConfigs, setTestConfigs] = useState<TestConfig[]>(initialTests);
    const [categories, setCategories] =
        useState<TestCategory[]>(initialCategories);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [selectedConfig, setSelectedConfig] = useState<TestConfig | null>(
        null,
    );
    const [selectedCategory, setSelectedCategory] =
        useState<TestCategory | null>(null);
    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [isEditPriceModalOpen, setIsEditPriceModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'configurations' | 'categories'>(
        'configurations',
    );

    const itemsPerPageOptions = [10, 20, 50];

    const refreshData = () => {
        setLoading(true);
        router.reload({
            only: ['tests', 'categories'],
            onFinish: () => {
                setLoading(false);
            },
        });
    };

    useEffect(() => {
        setTestConfigs(initialTests);
        setCategories(initialCategories);
    }, [initialTests, initialCategories]);

    const filteredConfigs = testConfigs.filter((config) => {
        const matchSearch =
            config.test_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            config.test_code.toLowerCase().includes(searchTerm.toLowerCase());
        const matchCategory =
            filterCategory === 'all' || config.category === filterCategory;
        const matchStatus =
            filterStatus === 'all' ||
            (filterStatus === 'active' ? config.is_active : !config.is_active);
        return matchSearch && matchCategory && matchStatus;
    });

    const uniqueCategories = [
        'all',
        ...new Set(testConfigs.map((t) => t.category)),
    ];

    const totalItems = filteredConfigs.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedConfigs = filteredConfigs.slice(
        startIndex,
        startIndex + itemsPerPage,
    );

    if (loading) {
        return (
            <AppLayout
                breadcrumbs={[
                    { title: 'Laboratory', href: 'laboratory/dashboard' },
                    { title: 'Settings', href: 'laboratory/settings' },
                ]}
            >
                <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                        <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                        <p className="text-sm text-gray-500">
                            Loading settings...
                        </p>
                    </div>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Laboratory', href: 'laboratory/dashboard' },
                { title: 'Settings', href: 'laboratory/settings' },
            ]}
        >
            <div className="px-4 py-2">
                {/* Header */}
                <div className="mb-4 flex items-center justify-between">
                    <div>
                        <h1 className="text-lg font-semibold text-gray-900">
                            Laboratory Settings
                        </h1>
                        <p className="text-sm text-gray-500">
                            Configure tests, parameters, and pricing
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            onClick={() => {
                                setSelectedConfig(null);
                                setIsConfigModalOpen(true);
                            }}
                            className="h-8 gap-1.5 bg-blue-600 text-sm hover:bg-blue-700"
                        >
                            <Plus className="h-3.5 w-3.5" /> New Test
                        </Button>
                        <Button
                            onClick={refreshData}
                            variant="outline"
                            className="h-8 gap-1.5 text-sm"
                        >
                            <RefreshCw className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="mb-4 border-b border-gray-200">
                    <div className="flex gap-1">
                        <button
                            onClick={() => setActiveTab('configurations')}
                            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors ${
                                activeTab === 'configurations'
                                    ? 'border-b-2 border-blue-600 text-blue-600'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <Settings className="h-4 w-4" />
                            Test Configurations
                            <Badge variant="secondary" className="ml-1 text-xs">
                                {testConfigs.length}
                            </Badge>
                        </button>
                        <button
                            onClick={() => setActiveTab('categories')}
                            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors ${
                                activeTab === 'categories'
                                    ? 'border-b-2 border-blue-600 text-blue-600'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <Tag className="h-4 w-4" />
                            Categories
                            <Badge variant="secondary" className="ml-1 text-xs">
                                {categories.length}
                            </Badge>
                        </button>
                    </div>
                </div>

                {activeTab === 'configurations' && (
                    <>
                        {/* Filters */}
                        <div className="mb-4 flex flex-wrap gap-3">
                            <div className="min-w-[180px] flex-1">
                                <div className="relative">
                                    <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search tests..."
                                        className="w-full rounded border border-gray-200 py-1.5 pr-3 pl-8 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        value={searchTerm}
                                        onChange={(e) => {
                                            setSearchTerm(e.target.value);
                                            setCurrentPage(1);
                                        }}
                                    />
                                </div>
                            </div>
                            <select
                                value={filterCategory}
                                onChange={(e) => {
                                    setFilterCategory(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="rounded border border-gray-200 px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            >
                                {uniqueCategories.map((cat) => (
                                    <option key={cat} value={cat}>
                                        {cat === 'all' ? 'All Categories' : cat}
                                    </option>
                                ))}
                            </select>
                            <select
                                value={filterStatus}
                                onChange={(e) => {
                                    setFilterStatus(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="rounded border border-gray-200 px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            >
                                <option value="all">All Status</option>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>

                        {/* Table */}
                        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="border-b bg-gray-50">
                                        <tr>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                                                Test
                                            </th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                                                Code
                                            </th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                                                Category
                                            </th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                                                Sample
                                            </th>
                                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">
                                                Params
                                            </th>
                                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">
                                                Prices (ZMW)
                                            </th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                                                Status
                                            </th>
                                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {paginatedConfigs.map((config) => (
                                            <tr
                                                key={config.id}
                                                className="transition-colors hover:bg-gray-50/60"
                                            >
                                                <td className="px-3 py-2">
                                                    <div className="font-medium text-gray-900">
                                                        {config.test_name}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2 font-mono text-xs text-gray-500">
                                                    {config.test_code}
                                                </td>
                                                <td className="px-3 py-2">
                                                    <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600">
                                                        {config.category}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2 text-sm">
                                                    {config.sample_type}
                                                </td>
                                                <td className="px-3 py-2 text-center">
                                                    <Badge
                                                        variant="secondary"
                                                        className="text-xs"
                                                    >
                                                        {config.parameters
                                                            ?.length || 0}
                                                    </Badge>
                                                </td>
                                                <td className="px-3 py-2 text-right">
                                                    <div className="space-y-0.5">
                                                        <div className="flex items-center justify-end gap-1 text-xs">
                                                            <span className="text-gray-500">
                                                                Cash:
                                                            </span>
                                                            <span className="font-medium text-green-600">
                                                                ZMW{' '}
                                                                {config.cash_price?.toFixed(
                                                                    2,
                                                                ) || '0.00'}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center justify-end gap-1 text-xs">
                                                            <span className="text-gray-500">
                                                                Insurance:
                                                            </span>
                                                            <span className="font-medium text-blue-600">
                                                                ZMW{' '}
                                                                {config.insurance_price?.toFixed(
                                                                    2,
                                                                ) || '0.00'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2">
                                                    <StatusBadge
                                                        status={
                                                            config.is_active
                                                                ? 'active'
                                                                : 'inactive'
                                                        }
                                                    />
                                                </td>
                                                <td className="px-3 py-2 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => {
                                                                setSelectedConfig(
                                                                    config,
                                                                );
                                                                setIsEditPriceModalOpen(
                                                                    true,
                                                                );
                                                            }}
                                                            className="h-7 w-7 p-0 text-gray-400 hover:text-blue-600"
                                                            title="Edit Test"
                                                        >
                                                            <Edit2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {paginatedConfigs.length === 0 && (
                                <div className="py-10 text-center">
                                    <Microscope className="mx-auto h-10 w-10 text-gray-300" />
                                    <p className="mt-2 text-sm text-gray-500">
                                        No test configurations found
                                    </p>
                                </div>
                            )}

                            {/* Pagination */}
                            {totalItems > 0 && (
                                <div className="flex flex-col items-center justify-between gap-3 border-t bg-gray-50/50 px-3 py-2 sm:flex-row">
                                    <div className="text-xs text-gray-500">
                                        Showing {startIndex + 1}–
                                        {Math.min(
                                            startIndex + itemsPerPage,
                                            totalItems,
                                        )}{' '}
                                        of {totalItems}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-xs text-gray-500">
                                                Show:
                                            </span>
                                            <select
                                                value={itemsPerPage}
                                                onChange={(e) => {
                                                    setItemsPerPage(
                                                        Number(e.target.value),
                                                    );
                                                    setCurrentPage(1);
                                                }}
                                                className="rounded border border-gray-200 px-1.5 py-0.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                            >
                                                {itemsPerPageOptions.map(
                                                    (option) => (
                                                        <option
                                                            key={option}
                                                            value={option}
                                                        >
                                                            {option}
                                                        </option>
                                                    ),
                                                )}
                                            </select>
                                        </div>
                                        <div className="flex items-center gap-0.5">
                                            <button
                                                onClick={() =>
                                                    setCurrentPage(1)
                                                }
                                                disabled={currentPage === 1}
                                                className="rounded border p-1 disabled:opacity-50"
                                            >
                                                <ChevronsLeft className="h-3.5 w-3.5" />
                                            </button>
                                            <button
                                                onClick={() =>
                                                    setCurrentPage((p) =>
                                                        Math.max(1, p - 1),
                                                    )
                                                }
                                                disabled={currentPage === 1}
                                                className="rounded border p-1 disabled:opacity-50"
                                            >
                                                <ChevronLeft className="h-3.5 w-3.5" />
                                            </button>
                                            <span className="px-2 text-sm">
                                                {currentPage} / {totalPages}
                                            </span>
                                            <button
                                                onClick={() =>
                                                    setCurrentPage((p) =>
                                                        Math.min(
                                                            totalPages,
                                                            p + 1,
                                                        ),
                                                    )
                                                }
                                                disabled={
                                                    currentPage === totalPages
                                                }
                                                className="rounded border p-1 disabled:opacity-50"
                                            >
                                                <ChevronRight className="h-3.5 w-3.5" />
                                            </button>
                                            <button
                                                onClick={() =>
                                                    setCurrentPage(totalPages)
                                                }
                                                disabled={
                                                    currentPage === totalPages
                                                }
                                                className="rounded border p-1 disabled:opacity-50"
                                            >
                                                <ChevronsRight className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {activeTab === 'categories' && (
                    <div>
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-gray-700">
                                Test Categories
                            </h3>
                            <Button
                                size="sm"
                                onClick={() => {
                                    setSelectedCategory(null);
                                    setIsCategoryModalOpen(true);
                                }}
                                className="h-7 gap-1 text-xs"
                            >
                                <Plus className="h-3 w-3" /> Add Category
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                            {categories.map((category) => (
                                <div
                                    key={category.id}
                                    className="rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <Tag className="h-4 w-4 text-blue-500" />
                                                <h4 className="font-medium text-gray-900">
                                                    {category.name}
                                                </h4>
                                            </div>
                                            {category.description && (
                                                <p className="mt-1 text-xs text-gray-500">
                                                    {category.description}
                                                </p>
                                            )}
                                            <div className="mt-2 flex items-center gap-3">
                                                <StatusBadge
                                                    status={
                                                        category.is_active
                                                            ? 'active'
                                                            : 'inactive'
                                                    }
                                                />
                                                <Badge
                                                    variant="secondary"
                                                    className="text-xs"
                                                >
                                                    {category.test_count || 0}{' '}
                                                    tests
                                                </Badge>
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setSelectedCategory(category);
                                                setIsCategoryModalOpen(true);
                                            }}
                                            className="h-7 w-7 p-0 text-gray-400 hover:text-blue-600"
                                        >
                                            <Edit2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {categories.length === 0 && (
                            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 py-10 text-center">
                                <Tag className="mx-auto h-10 w-10 text-gray-300" />
                                <p className="mt-2 text-sm text-gray-500">
                                    No categories created yet
                                </p>
                                <Button
                                    onClick={() => setIsCategoryModalOpen(true)}
                                    variant="link"
                                    className="mt-1 text-sm"
                                >
                                    Create your first category
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modals */}
            <TestConfigModal
                isOpen={isConfigModalOpen}
                onClose={() => {
                    setIsConfigModalOpen(false);
                    setSelectedConfig(null);
                }}
                onSuccess={refreshData}
                config={selectedConfig}
                categories={categories}
            />

            <CategoryModal
                isOpen={isCategoryModalOpen}
                onClose={() => {
                    setIsCategoryModalOpen(false);
                    setSelectedCategory(null);
                }}
                onSuccess={refreshData}
                category={selectedCategory}
            />

            <EditPriceModal
                isOpen={isEditPriceModalOpen}
                onClose={() => {
                    setIsEditPriceModalOpen(false);
                    setSelectedConfig(null);
                }}
                onSuccess={refreshData}
                test={selectedConfig}
            />
        </AppLayout>
    );
}
