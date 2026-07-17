// components/departments/DepartmentModal.tsx
import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Notiflix from 'notiflix';
import { departmentAPI } from '@/services/api';

interface DepartmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    department?: any;
    isEditing?: boolean;
}

export const DepartmentModal = ({
    isOpen,
    onClose,
    onSuccess,
    department,
    isEditing = false,
}: DepartmentModalProps) => {
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        description: '',
        status: 'active',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (department) {
            setFormData({
                name: department.name || '',
                code: department.code || '',
                description: department.description || '',
                status: department.status || 'active',
            });
        } else {
            setFormData({
                name: '',
                code: '',
                description: '',
                status: 'active',
            });
        }
    }, [department]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.name?.trim()) {
            newErrors.name = 'Department name is required';
        }
        if (!formData.code?.trim()) {
            newErrors.code = 'Department code is required';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;

        setIsSubmitting(true);

        try {
            if (isEditing && department?.id) {
                await departmentAPI.update(department.id, formData);
                Notiflix.Notify.success('Department updated successfully!');
            } else {
                await departmentAPI.create(formData);
                Notiflix.Notify.success('Department created successfully!');
            }
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error saving department:', error);
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
            }
            Notiflix.Notify.failure(error.response?.data?.message || 'Failed to save department');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
                <div className="fixed inset-0 bg-black/50" onClick={onClose} />

                <div className="relative w-full max-w-md rounded-xl bg-white shadow-2xl">
                    <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                        <h2 className="text-xl font-semibold text-gray-900">
                            {isEditing ? 'Edit Department' : 'Add New Department'}
                        </h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="max-h-[70vh] overflow-y-auto p-6">
                        <div className="space-y-4">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                    Department Name *
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    className={`w-full rounded-md border ${errors.name ? 'border-red-500' : 'border-gray-300'} px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none`}
                                    placeholder="e.g., Cardiology, Radiology"
                                />
                                {errors.name && (
                                    <p className="mt-1 text-xs text-red-500">{errors.name}</p>
                                )}
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                    Department Code *
                                </label>
                                <input
                                    type="text"
                                    name="code"
                                    value={formData.code}
                                    onChange={handleChange}
                                    className={`w-full rounded-md border ${errors.code ? 'border-red-500' : 'border-gray-300'} px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none`}
                                    placeholder="e.g., CARD, RAD, LAB"
                                />
                                {errors.code && (
                                    <p className="mt-1 text-xs text-red-500">{errors.code}</p>
                                )}
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                    Description
                                </label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    rows={3}
                                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                    placeholder="Brief description of the department..."
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                    Status
                                </label>
                                <select
                                    name="status"
                                    value={formData.status}
                                    onChange={handleChange}
                                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-6">
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
                                className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        {isEditing ? 'Saving...' : 'Creating...'}
                                    </>
                                ) : isEditing ? (
                                    'Save Changes'
                                ) : (
                                    'Create Department'
                                )}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
