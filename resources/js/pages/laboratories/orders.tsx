// pages/laboratory/orders.tsx
import { useState, useEffect, useMemo } from 'react';
import { usePage, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Plus,
    Search,
    Package,
    AlertTriangle,
    CheckCircle,
    X,
    Trash2,
    Edit2,
    Eye,
    RefreshCw,
    Filter,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Download,
    Printer,
    Clock,
    User,
    Calendar,
    Clipboard,
    FileText,
    Microscope,
    TestTube,
    Syringe,
    Activity,
    Pill,
    Stethoscope,
    HeartPulse,
    FlaskConical,
    ArrowUpDown,
    Loader2,
} from 'lucide-react';
import axios from 'axios';
import Notiflix from 'notiflix';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TestOrder {
    id: number;
    order_number: string;
    patient_id: number;
    patient_name: string;
    patient_mrn: string;
    test_name: string;
    test_category: string;
    priority: 'routine' | 'urgent' | 'emergency';
    status:
        | 'pending'
        | 'collected'
        | 'in_progress'
        | 'completed'
        | 'cancelled'
        | 'rejected';
    collected_by?: string;
    collected_at?: string;
    performed_by?: string;
    performed_at?: string;
    verified_by?: string;
    verified_at?: string;
    result_value?: string;
    result_remarks?: string;
    sample_type: string;
    sample_condition?: string;
    notes?: string;
    created_at: string;
    updated_at: string;
}

interface Test {
    id: number;
    test_name: string;
    test_code: string;
    category: string;
    sample_type: string;
    unit: string;
    reference_range: string;
    price: number;
    turnaround_time: string;
    is_active: boolean;
}

interface Patient {
    id: number;
    name: string;
    mrn: string;
    gender: string;
    age: number;
}

// ─── Components ──────────────────────────────────────────────────────────────

const StatusBadge = ({ status }: { status: string }) => {
    const config: Record<string, { color: string; icon: any; label: string }> =
        {
            pending: { color: 'yellow', icon: Clock, label: 'Pending' },
            collected: { color: 'blue', icon: TestTube, label: 'Collected' },
            in_progress: {
                color: 'purple',
                icon: Microscope,
                label: 'In Progress',
            },
            completed: {
                color: 'green',
                icon: CheckCircle,
                label: 'Completed',
            },
            cancelled: { color: 'gray', icon: X, label: 'Cancelled' },
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

const PriorityBadge = ({ priority }: { priority: string }) => {
    const config: Record<string, { color: string; label: string }> = {
        routine: { color: 'gray', label: 'Routine' },
        urgent: { color: 'orange', label: 'Urgent' },
        emergency: { color: 'red', label: 'Emergency' },
    };

    const { color, label } = config[priority] || config.routine;

    return (
        <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-${color}-100 text-${color}-700`}
        >
            {label}
        </span>
    );
};

// ─── Modals ──────────────────────────────────────────────────────────────────

const CreateOrderModal = ({
    isOpen,
    onClose,
    onSuccess,
    patients,
    tests,
}: {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    patients: Patient[];
    tests: Test[];
}) => {
    const [formData, setFormData] = useState({
        patient_id: '',
        test_id: '',
        priority: 'routine',
        sample_type: '',
        notes: '',
    });
    const [errors, setErrors] = useState<any>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedTest, setSelectedTest] = useState<Test | null>(null);

    if (!isOpen) return null;

    const handleChange = (
        e: React.ChangeEvent<
            HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
        >,
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors((prev: any) => ({ ...prev, [name]: '' }));
        }

        if (name === 'test_id') {
            const test = tests.find((t) => t.id === parseInt(value));
            setSelectedTest(test || null);
            if (test) {
                setFormData((prev) => ({
                    ...prev,
                    sample_type: test.sample_type,
                }));
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        router.post('/laboratory/orders', formData, {
            onSuccess: () => {
                Notiflix.Notify.success('Test order created successfully');
                onSuccess();
                onClose();
                setFormData({
                    patient_id: '',
                    test_id: '',
                    priority: 'routine',
                    sample_type: '',
                    notes: '',
                });
                setSelectedTest(null);
            },
            onError: (err) => {
                setErrors(err);
                Notiflix.Notify.failure('Failed to create order');
            },
            onFinish: () => setIsSubmitting(false),
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white shadow-2xl">
                <div className="sticky top-0 flex items-center justify-between border-b bg-white px-5 py-3">
                    <h2 className="text-base font-semibold">New Lab Order</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 p-5">
                    <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">
                            Patient *
                        </label>
                        <select
                            name="patient_id"
                            value={formData.patient_id}
                            onChange={handleChange}
                            className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            required
                        >
                            <option value="">Select Patient</option>
                            {patients.map((patient) => (
                                <option key={patient.id} value={patient.id}>
                                    {patient.name} ({patient.mrn})
                                </option>
                            ))}
                        </select>
                        {errors.patient_id && (
                            <p className="mt-1 text-xs text-red-500">
                                {errors.patient_id}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">
                            Test *
                        </label>
                        <select
                            name="test_id"
                            value={formData.test_id}
                            onChange={handleChange}
                            className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            required
                        >
                            <option value="">Select Test</option>
                            {tests.map((test) => (
                                <option key={test.id} value={test.id}>
                                    {test.test_name} ({test.category})
                                </option>
                            ))}
                        </select>
                        {errors.test_id && (
                            <p className="mt-1 text-xs text-red-500">
                                {errors.test_id}
                            </p>
                        )}
                    </div>

                    {selectedTest && (
                        <div className="space-y-1 rounded-lg bg-gray-50 p-3 text-sm">
                            <p>
                                <span className="text-gray-500">Category:</span>{' '}
                                {selectedTest.category}
                            </p>
                            <p>
                                <span className="text-gray-500">
                                    Sample Type:
                                </span>{' '}
                                {selectedTest.sample_type}
                            </p>
                            <p>
                                <span className="text-gray-500">
                                    Turnaround:
                                </span>{' '}
                                {selectedTest.turnaround_time}
                            </p>
                            <p>
                                <span className="text-gray-500">Price:</span>{' '}
                                ZMW {selectedTest.price}
                            </p>
                        </div>
                    )}

                    <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">
                            Priority
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {['routine', 'urgent', 'emergency'].map(
                                (priority) => (
                                    <label
                                        key={priority}
                                        className={`flex cursor-pointer items-center justify-center rounded-lg border p-2 text-xs transition-all ${
                                            formData.priority === priority
                                                ? 'border-blue-500 bg-blue-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name="priority"
                                            value={priority}
                                            checked={
                                                formData.priority === priority
                                            }
                                            onChange={handleChange}
                                            className="hidden"
                                        />
                                        {priority.charAt(0).toUpperCase() +
                                            priority.slice(1)}
                                    </label>
                                ),
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">
                            Sample Type
                        </label>
                        <input
                            type="text"
                            name="sample_type"
                            value={formData.sample_type}
                            onChange={handleChange}
                            className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            placeholder="e.g., Blood, Urine, Swab"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">
                            Clinical Notes
                        </label>
                        <textarea
                            name="notes"
                            value={formData.notes}
                            onChange={handleChange}
                            rows={2}
                            className="w-full resize-none rounded border border-gray-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            placeholder="Additional clinical notes..."
                        />
                    </div>

                    <div className="flex gap-2 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            className="flex-1 text-sm"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 bg-blue-600 text-sm hover:bg-blue-700"
                        >
                            {isSubmitting ? (
                                <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                            ) : (
                                'Create Order'
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const CollectSampleModal = ({
    isOpen,
    onClose,
    onSuccess,
    order,
}: {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    order: TestOrder | null;
}) => {
    const [formData, setFormData] = useState({
        sample_condition: 'good',
        notes: '',
    });
    const [errors, setErrors] = useState<any>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen || !order) return null;

    const handleChange = (
        e: React.ChangeEvent<
            HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
        >,
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors((prev: any) => ({ ...prev, [name]: '' }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        router.post(`/laboratory/orders/${order.id}/collect`, formData, {
            onSuccess: () => {
                Notiflix.Notify.success('Sample collected successfully');
                onSuccess();
                onClose();
            },
            onError: (err) => {
                setErrors(err);
                Notiflix.Notify.failure('Failed to collect sample');
            },
            onFinish: () => setIsSubmitting(false),
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className="relative w-full max-w-md rounded-lg bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b px-5 py-3">
                    <div>
                        <h2 className="text-base font-semibold">
                            Collect Sample
                        </h2>
                        <p className="text-xs text-gray-500">
                            Order #{order.order_number}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 p-5">
                    <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">
                            Patient
                        </label>
                        <p className="text-sm font-medium">
                            {order.patient_name}
                        </p>
                    </div>

                    <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">
                            Test
                        </label>
                        <p className="text-sm">{order.test_name}</p>
                    </div>

                    <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">
                            Sample Condition
                        </label>
                        <select
                            name="sample_condition"
                            value={formData.sample_condition}
                            onChange={handleChange}
                            className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        >
                            <option value="good">Good</option>
                            <option value="hemolyzed">Hemolyzed</option>
                            <option value="lipemic">Lipemic</option>
                            <option value="icteric">Icteric</option>
                            <option value="contaminated">Contaminated</option>
                            <option value="insufficient">Insufficient</option>
                        </select>
                    </div>

                    <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">
                            Collection Notes
                        </label>
                        <textarea
                            name="notes"
                            value={formData.notes}
                            onChange={handleChange}
                            rows={2}
                            className="w-full resize-none rounded border border-gray-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            placeholder="Additional notes..."
                        />
                    </div>

                    <div className="flex gap-2 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            className="flex-1 text-sm"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 bg-blue-600 text-sm hover:bg-blue-700"
                        >
                            {isSubmitting ? (
                                <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                            ) : (
                                'Confirm Collection'
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const EnterResultsModal = ({
    isOpen,
    onClose,
    onSuccess,
    order,
}: {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    order: TestOrder | null;
}) => {
    const [formData, setFormData] = useState({
        result_value: '',
        result_remarks: '',
    });
    const [errors, setErrors] = useState<any>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen || !order) return null;

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors((prev: any) => ({ ...prev, [name]: '' }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        router.post(`/laboratory/orders/${order.id}/results`, formData, {
            onSuccess: () => {
                Notiflix.Notify.success('Results entered successfully');
                onSuccess();
                onClose();
            },
            onError: (err) => {
                setErrors(err);
                Notiflix.Notify.failure('Failed to enter results');
            },
            onFinish: () => setIsSubmitting(false),
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className="relative w-full max-w-md rounded-lg bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b px-5 py-3">
                    <div>
                        <h2 className="text-base font-semibold">
                            Enter Results
                        </h2>
                        <p className="text-xs text-gray-500">
                            Order #{order.order_number}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 p-5">
                    <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">
                            Patient
                        </label>
                        <p className="text-sm font-medium">
                            {order.patient_name}
                        </p>
                    </div>

                    <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">
                            Test
                        </label>
                        <p className="text-sm">{order.test_name}</p>
                    </div>

                    <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">
                            Result Value *
                        </label>
                        <input
                            type="text"
                            name="result_value"
                            value={formData.result_value}
                            onChange={handleChange}
                            className={`w-full rounded border ${errors.result_value ? 'border-red-500' : 'border-gray-300'} px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none`}
                            placeholder="Enter result"
                            required
                        />
                        {errors.result_value && (
                            <p className="mt-1 text-xs text-red-500">
                                {errors.result_value}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">
                            Remarks
                        </label>
                        <textarea
                            name="result_remarks"
                            value={formData.result_remarks}
                            onChange={handleChange}
                            rows={2}
                            className="w-full resize-none rounded border border-gray-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            placeholder="Additional remarks..."
                        />
                    </div>

                    <div className="flex gap-2 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            className="flex-1 text-sm"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 bg-green-600 text-sm hover:bg-green-700"
                        >
                            {isSubmitting ? (
                                <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                            ) : (
                                'Save Results'
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const OrderDetailsModal = ({
    isOpen,
    onClose,
    order,
}: {
    isOpen: boolean;
    onClose: () => void;
    order: TestOrder | null;
}) => {
    if (!isOpen || !order) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-2xl">
                <div className="sticky top-0 flex items-center justify-between border-b bg-white px-5 py-3">
                    <div>
                        <h2 className="text-base font-semibold">
                            Order Details
                        </h2>
                        <p className="text-xs text-gray-500">
                            #{order.order_number}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="space-y-4 p-5">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-xs text-gray-500">Patient</p>
                            <p className="font-medium">{order.patient_name}</p>
                            <p className="text-xs text-gray-400">
                                MRN: {order.patient_mrn}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Test</p>
                            <p className="font-medium">{order.test_name}</p>
                            <p className="text-xs text-gray-400">
                                {order.test_category}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Priority</p>
                            <PriorityBadge priority={order.priority} />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Status</p>
                            <StatusBadge status={order.status} />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Sample Type</p>
                            <p className="font-medium">{order.sample_type}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Created</p>
                            <p className="font-medium">
                                {new Date(order.created_at).toLocaleString()}
                            </p>
                        </div>
                        {order.collected_at && (
                            <div>
                                <p className="text-xs text-gray-500">
                                    Collected
                                </p>
                                <p className="font-medium">
                                    {new Date(
                                        order.collected_at,
                                    ).toLocaleString()}
                                </p>
                                <p className="text-xs text-gray-400">
                                    By: {order.collected_by}
                                </p>
                            </div>
                        )}
                        {order.performed_at && (
                            <div>
                                <p className="text-xs text-gray-500">
                                    Performed
                                </p>
                                <p className="font-medium">
                                    {new Date(
                                        order.performed_at,
                                    ).toLocaleString()}
                                </p>
                                <p className="text-xs text-gray-400">
                                    By: {order.performed_by}
                                </p>
                            </div>
                        )}
                        {order.result_value && (
                            <div className="col-span-2">
                                <p className="text-xs text-gray-500">Result</p>
                                <p className="font-medium">
                                    {order.result_value}
                                </p>
                                {order.result_remarks && (
                                    <p className="text-xs text-gray-400">
                                        Remarks: {order.result_remarks}
                                    </p>
                                )}
                            </div>
                        )}
                        {order.notes && (
                            <div className="col-span-2">
                                <p className="text-xs text-gray-500">Notes</p>
                                <p className="text-sm">{order.notes}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── Main Component ──────────────────────────────────────────────────────────

export default function Orders() {
    const { props } = usePage();
    const [loading, setLoading] = useState(false);
    const [orders, setOrders] = useState<TestOrder[]>([]);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [tests, setTests] = useState<Test[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterPriority, setFilterPriority] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [selectedOrder, setSelectedOrder] = useState<TestOrder | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isCollectModalOpen, setIsCollectModalOpen] = useState(false);
    const [isResultsModalOpen, setIsResultsModalOpen] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

    const itemsPerPageOptions = [10, 20, 50];

    const fetchData = async () => {
        setLoading(true);
        try {
            const [ordersRes, patientsRes, testsRes] = await Promise.all([
                axios.get('/api/laboratory/orders'),
                axios.get('/api/patients/list'),
                axios.get('/api/laboratory/tests'),
            ]);
            setOrders(ordersRes.data || []);
            setPatients(patientsRes.data || []);
            setTests(testsRes.data || []);
        } catch (error) {
            console.error('Error fetching data:', error);
            Notiflix.Notify.failure('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCollectSample = (order: TestOrder) => {
        setSelectedOrder(order);
        setIsCollectModalOpen(true);
    };

    const handleEnterResults = (order: TestOrder) => {
        setSelectedOrder(order);
        setIsResultsModalOpen(true);
    };

    const handleViewDetails = (order: TestOrder) => {
        setSelectedOrder(order);
        setIsDetailsModalOpen(true);
    };

    const handleCancelOrder = async (orderId: number) => {
        if (!confirm('Are you sure you want to cancel this order?')) return;

        try {
            await axios.put(`/laboratory/orders/${orderId}/cancel`);
            Notiflix.Notify.success('Order cancelled');
            fetchData();
        } catch (error) {
            Notiflix.Notify.failure('Failed to cancel order');
        }
    };

    // Filter and paginate
    const filteredOrders = orders.filter((order) => {
        const matchSearch =
            order.order_number
                .toLowerCase()
                .includes(searchTerm.toLowerCase()) ||
            order.patient_name
                .toLowerCase()
                .includes(searchTerm.toLowerCase()) ||
            order.test_name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchStatus =
            filterStatus === 'all' || order.status === filterStatus;
        const matchPriority =
            filterPriority === 'all' || order.priority === filterPriority;
        return matchSearch && matchStatus && matchPriority;
    });

    const statuses = [
        'all',
        'pending',
        'collected',
        'in_progress',
        'completed',
        'cancelled',
        'rejected',
    ];
    const priorities = ['all', 'routine', 'urgent', 'emergency'];

    const totalItems = filteredOrders.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedOrders = filteredOrders.slice(
        startIndex,
        startIndex + itemsPerPage,
    );

    const getStatusCount = (status: string) => {
        return orders.filter((o) => o.status === status).length;
    };

    if (loading) {
        return (
            <AppLayout
                breadcrumbs={[
                    { title: 'Laboratory', href: 'laboratory/dashboard' },
                    { title: 'Orders', href: 'laboratory/orders' },
                ]}
            >
                <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                        <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                        <p className="text-sm text-gray-500">
                            Loading lab orders...
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
                { title: 'Orders', href: 'laboratory/orders' },
            ]}
        >
            <div className="px-4 py-2">
                {/* Header */}
                <div className="mb-4 flex items-center justify-between">
                    <div>
                        <h1 className="text-lg font-semibold text-gray-900">
                            Lab Orders
                        </h1>
                        <p className="text-sm text-gray-500">
                            Manage laboratory test orders
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="h-8 gap-1.5 bg-blue-600 text-sm hover:bg-blue-700"
                        >
                            <Plus className="h-3.5 w-3.5" /> New Order
                        </Button>
                        <Button
                            onClick={fetchData}
                            variant="outline"
                            className="h-8 gap-1.5 text-sm"
                        >
                            <RefreshCw className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
                    <div className="rounded-lg border border-gray-200 bg-white p-3">
                        <p className="text-xs text-gray-500">Total Orders</p>
                        <p className="text-xl font-bold">{orders.length}</p>
                    </div>
                    <div className="rounded-lg border border-yellow-200 bg-white p-3">
                        <p className="text-xs text-yellow-600">Pending</p>
                        <p className="text-xl font-bold text-yellow-600">
                            {getStatusCount('pending')}
                        </p>
                    </div>
                    <div className="rounded-lg border border-blue-200 bg-white p-3">
                        <p className="text-xs text-blue-600">Collected</p>
                        <p className="text-xl font-bold text-blue-600">
                            {getStatusCount('collected')}
                        </p>
                    </div>
                    <div className="rounded-lg border border-purple-200 bg-white p-3">
                        <p className="text-xs text-purple-600">In Progress</p>
                        <p className="text-xl font-bold text-purple-600">
                            {getStatusCount('in_progress')}
                        </p>
                    </div>
                    <div className="rounded-lg border border-green-200 bg-white p-3">
                        <p className="text-xs text-green-600">Completed</p>
                        <p className="text-xl font-bold text-green-600">
                            {getStatusCount('completed')}
                        </p>
                    </div>
                </div>

                {/* Filters */}
                <div className="mb-4 flex flex-wrap gap-3">
                    <div className="min-w-[180px] flex-1">
                        <div className="relative">
                            <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search orders..."
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
                        value={filterStatus}
                        onChange={(e) => {
                            setFilterStatus(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="rounded border border-gray-200 px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                        {statuses.map((status) => (
                            <option key={status} value={status}>
                                {status === 'all'
                                    ? 'All Status'
                                    : status.replace('_', ' ').toUpperCase()}
                            </option>
                        ))}
                    </select>
                    <select
                        value={filterPriority}
                        onChange={(e) => {
                            setFilterPriority(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="rounded border border-gray-200 px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                        {priorities.map((priority) => (
                            <option key={priority} value={priority}>
                                {priority === 'all'
                                    ? 'All Priority'
                                    : priority.charAt(0).toUpperCase() +
                                      priority.slice(1)}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Table */}
                <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="border-b bg-gray-50">
                                <tr>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                                        Order #
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                                        Patient
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                                        Test
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                                        Priority
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                                        Status
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                                        Created
                                    </th>
                                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {paginatedOrders.map((order) => (
                                    <tr
                                        key={order.id}
                                        className="transition-colors hover:bg-gray-50/60"
                                    >
                                        <td className="px-3 py-2 font-mono text-xs font-medium text-gray-900">
                                            #{order.order_number}
                                        </td>
                                        <td className="px-3 py-2">
                                            <div className="font-medium text-gray-900">
                                                {order.patient_name}
                                            </div>
                                            <div className="text-xs text-gray-400">
                                                {order.patient_mrn}
                                            </div>
                                        </td>
                                        <td className="px-3 py-2">
                                            <div className="text-gray-900">
                                                {order.test_name}
                                            </div>
                                            <div className="text-xs text-gray-400">
                                                {order.test_category}
                                            </div>
                                        </td>
                                        <td className="px-3 py-2">
                                            <PriorityBadge
                                                priority={order.priority}
                                            />
                                        </td>
                                        <td className="px-3 py-2">
                                            <StatusBadge
                                                status={order.status}
                                            />
                                        </td>
                                        <td className="px-3 py-2 text-xs text-gray-500">
                                            {new Date(
                                                order.created_at,
                                            ).toLocaleDateString()}
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() =>
                                                        handleViewDetails(order)
                                                    }
                                                    className="h-7 w-7 p-0 text-gray-400 hover:text-blue-600"
                                                >
                                                    <Eye className="h-3.5 w-3.5" />
                                                </Button>
                                                {order.status === 'pending' && (
                                                    <>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() =>
                                                                handleCollectSample(
                                                                    order,
                                                                )
                                                            }
                                                            className="h-7 w-7 p-0 text-gray-400 hover:text-blue-600"
                                                        >
                                                            <TestTube className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() =>
                                                                handleCancelOrder(
                                                                    order.id,
                                                                )
                                                            }
                                                            className="h-7 w-7 p-0 text-gray-400 hover:text-red-600"
                                                        >
                                                            <X className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </>
                                                )}
                                                {(order.status ===
                                                    'collected' ||
                                                    order.status ===
                                                        'in_progress') && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() =>
                                                            handleEnterResults(
                                                                order,
                                                            )
                                                        }
                                                        className="h-7 w-7 p-0 text-gray-400 hover:text-green-600"
                                                    >
                                                        <Clipboard className="h-3.5 w-3.5" />
                                                    </Button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {paginatedOrders.length === 0 && (
                        <div className="py-10 text-center">
                            <Microscope className="mx-auto h-10 w-10 text-gray-300" />
                            <p className="mt-2 text-sm text-gray-500">
                                No orders found
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
                                        {itemsPerPageOptions.map((option) => (
                                            <option key={option} value={option}>
                                                {option}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex items-center gap-0.5">
                                    <button
                                        onClick={() => setCurrentPage(1)}
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
                                                Math.min(totalPages, p + 1),
                                            )
                                        }
                                        disabled={currentPage === totalPages}
                                        className="rounded border p-1 disabled:opacity-50"
                                    >
                                        <ChevronRight className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                        onClick={() =>
                                            setCurrentPage(totalPages)
                                        }
                                        disabled={currentPage === totalPages}
                                        className="rounded border p-1 disabled:opacity-50"
                                    >
                                        <ChevronsRight className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            <CreateOrderModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={fetchData}
                patients={patients}
                tests={tests}
            />

            <CollectSampleModal
                isOpen={isCollectModalOpen}
                onClose={() => {
                    setIsCollectModalOpen(false);
                    setSelectedOrder(null);
                }}
                onSuccess={fetchData}
                order={selectedOrder}
            />

            <EnterResultsModal
                isOpen={isResultsModalOpen}
                onClose={() => {
                    setIsResultsModalOpen(false);
                    setSelectedOrder(null);
                }}
                onSuccess={fetchData}
                order={selectedOrder}
            />

            <OrderDetailsModal
                isOpen={isDetailsModalOpen}
                onClose={() => {
                    setIsDetailsModalOpen(false);
                    setSelectedOrder(null);
                }}
                order={selectedOrder}
            />
        </AppLayout>
    );
}
