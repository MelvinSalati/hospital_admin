// components/departments/ServicesModal.tsx
import { useState, useEffect } from 'react';
import { X, Plus, Search, Edit, Trash2, Loader2, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Notiflix from 'notiflix';
import { serviceAPI } from '@/services/api';

interface Service {
    id: number;
    service_uuid: number | null;
    provider_id: number | null;
    service_name: string;
    department_id: number;
    service_category: number | null; // Add this field
    cash_price: number | null;
    nhima_price: number | null;
    insurance_price: number | null;
    charity_price: number | null;
    created_at: string;
    updated_at: string;
}

interface ServiceFormData {
    service_name: string;
    cash_price: string;
    nhima_price: string;
    insurance_price: string;
    charity_price: string;
    service_uuid: string;
    provider_id: string;
    service_category: string; // Add this field
}

interface ServicesModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    department: any;
    services: Service[];
}

const PRICE_CATEGORIES = [
    { id: 'cash', name: 'Cash', field: 'cash_price', icon: '💰', color: 'gray' },
    { id: 'nhima', name: 'NHIMA', field: 'nhima_price', icon: '🏥', color: 'green' },
    { id: 'insurance', name: 'Insurance', field: 'insurance_price', icon: '📋', color: 'purple' },
    { id: 'charity', name: 'Charity', field: 'charity_price', icon: '🤝', color: 'orange' },
];

export const ServicesModal = ({
    isOpen,
    onClose,
    onSuccess,
    department,
    services = [],
}: ServicesModalProps) => {
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingService, setEditingService] = useState<Service | null>(null);
    const [formData, setFormData] = useState<ServiceFormData>({
        service_name: '',
        cash_price: '',
        nhima_price: '',
        insurance_price: '',
        charity_price: '',
        service_uuid: '',
        provider_id: '',
        service_category: '' // Initialize with empty string
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (editingService) {
            setFormData({
                service_name: editingService.service_name || '',
                cash_price: editingService.cash_price?.toString() || '',
                nhima_price: editingService.nhima_price?.toString() || '',
                insurance_price: editingService.insurance_price?.toString() || '',
                charity_price: editingService.charity_price?.toString() || '',
                service_uuid: editingService.service_uuid?.toString() || '',
                provider_id: editingService.provider_id?.toString() || '',
                service_category: editingService.service_category?.toString() || '', // Fix this line
            });
        }
    }, [editingService]);

    const filteredServices = Array.isArray(services)
        ? services.filter((service: Service) =>
              service?.service_name
                  ?.toLowerCase()
                  .includes(searchTerm?.toLowerCase() || ''),
          )
        : [];

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: '' }));
        }
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.service_name?.trim()) {
            newErrors.service_name = 'Service name is required';
        }

        const hasPrice = PRICE_CATEGORIES.some(
            (category) =>
                formData[category.field as keyof ServiceFormData] &&
                parseFloat(formData[category.field as keyof ServiceFormData] as string) > 0
        );

        if (!hasPrice) {
            newErrors.prices = 'At least one price category is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmitService = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;

        setIsSubmitting(true);

        const serviceData = {
            service_name: formData.service_name,
            department_id: department?.id,
            cash_price: formData.cash_price ? parseFloat(formData.cash_price) : null,
            nhima_price: formData.nhima_price ? parseFloat(formData.nhima_price) : null,
            insurance_price: formData.insurance_price ? parseFloat(formData.insurance_price) : null,
            charity_price: formData.charity_price ? parseFloat(formData.charity_price) : null,
            service_uuid: formData.service_uuid ? parseInt(formData.service_uuid) : null,
            provider_id: formData.provider_id ? parseInt(formData.provider_id) : null,
            service_category: formData.service_category ? parseInt(formData.service_category) : null, // Ensure this is included
        };

        try {
            if (editingService) {
                await serviceAPI.update(editingService.id, serviceData);
                Notiflix.Notify.success('Service updated successfully!');
            } else {
                await serviceAPI.create(serviceData);
                Notiflix.Notify.success('Service added successfully!');
            }
            onSuccess();
            resetForm();
        } catch (error: any) {
            console.error('Error saving service:', error);
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
            }
            Notiflix.Notify.failure(error.response?.data?.message || 'Failed to save service');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteService = async (serviceId: number) => {
        Notiflix.Confirm.show(
            'Delete Service',
            'Are you sure you want to delete this service?',
            'Yes',
            'No',
            async () => {
                try {
                    await serviceAPI.delete(serviceId);
                    Notiflix.Notify.success('Service deleted successfully!');
                    onSuccess();
                } catch (error: any) {
                    Notiflix.Notify.failure(error.response?.data?.message || 'Failed to delete service');
                }
            }
        );
    };

    const handleEditService = (service: Service) => {
        setEditingService(service);
        setShowAddForm(true);
    };

    const resetForm = () => {
        setShowAddForm(false);
        setEditingService(null);
        setFormData({
            service_name: '',
            cash_price: '',
            nhima_price: '',
            insurance_price: '',
            charity_price: '',
            service_uuid: '',
            provider_id: '',
            service_category: '', // Reset this field
        });
        setErrors({});
    };

    if (!isOpen || !department) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
                <div className="fixed inset-0 bg-black/50" onClick={onClose} />

                <div className="relative flex max-h-[90vh] w-full max-w-6xl flex-col rounded-xl bg-white shadow-2xl">
                    {/* Header - Sticky */}
                    <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900">
                                Services - {department.name}
                            </h2>
                            <p className="mt-1 text-sm text-gray-500">
                                {department.code}
                            </p>
                        </div>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Scrollable Body */}
                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="mb-6 flex items-center justify-between">
                            <div className="relative max-w-md flex-1">
                                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search services..."
                                    className="w-full rounded-md border border-gray-300 py-2 pr-4 pl-10 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            {!showAddForm && (
                                <Button onClick={() => setShowAddForm(true)} className="gap-2">
                                    <Plus className="h-4 w-4" />
                                    Add Service
                                </Button>
                            )}
                        </div>

                        {/* Add/Edit Form */}
                        {showAddForm && (
                            <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
                                <div className="mb-4 flex items-center justify-between">
                                    <h3 className="font-semibold text-gray-900">
                                        {editingService ? 'Edit Service' : 'Add New Service'}
                                    </h3>
                                    <button onClick={resetForm} className="text-gray-400 hover:text-gray-500">
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                                <form onSubmit={handleSubmitService} className="space-y-4">
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-700">
                                            Service Name *
                                        </label>
                                        <input
                                            type="text"
                                            name="service_name"
                                            value={formData.service_name}
                                            onChange={handleChange}
                                            className={`w-full rounded-md border ${errors.service_name ? 'border-red-500' : 'border-gray-300'} px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none`}
                                            placeholder="Enter service name"
                                        />
                                        {errors.service_name && (
                                            <p className="mt-1 text-xs text-red-500">{errors.service_name}</p>
                                        )}
                                    </div>

                                    {/* Price Categories Grid */}
                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-gray-700">
                                            Prices by Category *
                                        </label>
                                        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                                            {PRICE_CATEGORIES.map((category) => (
                                                <div key={category.id}>
                                                    <label className="mb-1 flex items-center gap-1 text-xs font-medium text-gray-600">
                                                        <span>{category.icon}</span>
                                                        {category.name}
                                                    </label>
                                                    <input
                                                        type="number"
                                                        name={category.field}
                                                        value={formData[category.field as keyof ServiceFormData] as string}
                                                        onChange={handleChange}
                                                        step="0.01"
                                                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                                        placeholder="0.00"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                        {errors.prices && (
                                            <p className="mt-1 text-xs text-red-500">{errors.prices}</p>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                                Service Category
                                            </label>
                                            <select 
                                                name="service_category" 
                                                value={formData.service_category}
                                                onChange={handleChange}
                                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                            >
                                                <option value="">Select Category</option>
                                                <option value="1">Laboratory</option>
                                                <option value="2">Procedure</option>
                                                <option value="3">Drugs</option>
                                                <option value="4">Imaging</option>
                                                <option value="5">Others</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                                Provider ID (Optional)
                                            </label>
                                            <input
                                                type="number"
                                                name="provider_id"
                                                value={formData.provider_id}
                                                onChange={handleChange}
                                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                                placeholder="Enter provider ID"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-3">
                                        <Button type="button" variant="outline" onClick={resetForm}>
                                            Cancel
                                        </Button>
                                        <Button type="submit" disabled={isSubmitting} className="bg-blue-600 text-white hover:bg-blue-700">
                                            {isSubmitting ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Saving...
                                                </>
                                            ) : editingService ? (
                                                'Update Service'
                                            ) : (
                                                'Add Service'
                                            )}
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {/* Services Table */}
                        <div className="overflow-hidden rounded-lg border">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                            Service Name
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                            Category
                                        </th>
                                        {PRICE_CATEGORIES.map((category) => (
                                            <th key={category.id} className="px-6 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase">
                                                {category.name} (ZMW)
                                            </th>
                                        ))}
                                        <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                    {filteredServices.length === 0 ? (
                                        <tr>
                                            <td colSpan={PRICE_CATEGORIES.length + 3} className="px-6 py-12 text-center text-gray-500">
                                                <Package className="mx-auto mb-3 h-12 w-12 text-gray-400" />
                                                <p>No services found in this department</p>
                                                <Button
                                                    variant="link"
                                                    onClick={() => setShowAddForm(true)}
                                                    className="mt-2 text-blue-600"
                                                >
                                                    Add your first service
                                                </Button>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredServices.map((service: Service) => (
                                            <tr key={service.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {service.service_name}
                                                    </div>
                                                    {service.service_uuid && (
                                                        <div className="text-xs text-gray-500">
                                                            UUID: {service.service_uuid}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-600">
                                                        {service.service_category === 1 && 'Laboratory'}
                                                        {service.service_category === 2 && 'Procedure'}
                                                        {service.service_category === 3 && 'Drugs'}
                                                        {service.service_category === 4 && 'Others'}
                                                        {!service.service_category && '—'}
                                                    </div>
                                                </td>
                                                {PRICE_CATEGORIES.map((category) => (
                                                    <td key={category.id} className="px-6 py-4 text-right whitespace-nowrap">
                                                        <div className={`text-sm font-semibold text-${category.color}-600`}>
                                                            {service[category.field as keyof Service]
                                                                ? `ZMW ${(service[category.field as keyof Service] as number).toLocaleString()}`
                                                                : '—'}
                                                        </div>
                                                    </td>
                                                ))}
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleEditService(service)}
                                                            className="text-blue-600 hover:text-blue-800"
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleDeleteService(service.id)}
                                                            className="text-red-600 hover:text-red-800"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};