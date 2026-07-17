// pages/departments.tsx
import { useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import {
    Plus,
    Search,
    Edit,
    Trash2,
    ChevronDown,
    ChevronUp,
    FolderTree,
    Package,
    Building2,
} from 'lucide-react';
import Notiflix from 'notiflix';
import { departmentAPI } from '@/services/api'
import { DepartmentModal } from './components/DepartmentModal';
import { ServicesModal } from './components/ServiceModal';

interface Department {
    id: number;
    name: string;
    code: string;
    description: string;
    status: 'active' | 'inactive';
    service_count: number;
    created_at: string;
    updated_at: string;
}

interface Service {
    id: number;
    service_uuid: number | null;
    provider_id: number | null;
    service_name: string;
    department_id: number;
    cash_price: number | null;
    nhima_price: number | null;
    insurance_price: number | null;
    charity_price: number | null;
    created_at: string;
    updated_at: string;
}

interface Props {
    departments: Department[];
    services?: Service[];
}

const StatusBadge = ({ status }: { status: string }) => {
    const config: Record<string, { color: string; label: string }> = {
        active: { color: 'green', label: 'Active' },
        inactive: { color: 'gray', label: 'Inactive' },
    };
    const { color, label } = config[status] || config.inactive;
    return (
        <span className={`inline-flex items-center rounded-full bg-${color}-100 px-2 py-1 text-xs font-medium text-${color}-700`}>
            {label}
        </span>
    );
};

export default function Departments() {
    const { departments, services } = usePage<Props>().props;
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isServicesModalOpen, setIsServicesModalOpen] = useState(false);
    const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
    const [expandedDepartment, setExpandedDepartment] = useState<number | null>(null);

    const departmentsArray = Array.isArray(departments) ? departments : [];
    const servicesArray = Array.isArray(services) ? services : [];

    const filteredDepartments = departmentsArray.filter((dept: Department) => {
        const matchesSearch =
            (dept.name?.toLowerCase() || '').includes(searchTerm?.toLowerCase() || '') ||
            (dept.code?.toLowerCase() || '').includes(searchTerm?.toLowerCase() || '') ||
            (dept.description?.toLowerCase() || '').includes(searchTerm?.toLowerCase() || '');
        const matchesStatus = statusFilter === 'all' || dept.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const handleEditDepartment = (department: Department) => {
        setSelectedDepartment(department);
        setIsEditModalOpen(true);
    };

    const handleViewServices = (department: Department) => {
        setSelectedDepartment(department);
        setIsServicesModalOpen(true);
    };

    const handleDeleteDepartment = async (departmentId: number) => {
        Notiflix.Confirm.show(
            'Delete Department',
            'Are you sure you want to delete this department? This will also delete all associated services.',
            'Yes',
            'No',
            async () => {
                try {
                    await departmentAPI.delete(departmentId);
                    Notiflix.Notify.success('Department deleted successfully!');
                    router.reload();
                } catch (error: any) {
                    Notiflix.Notify.failure(error.response?.data?.message || 'Failed to delete department');
                }
            }
        );
    };

    const handleSuccess = () => {
        router.reload();
    };

    const toggleExpand = (departmentId: number) => {
        setExpandedDepartment(expandedDepartment === departmentId ? null : departmentId);
    };

    const getDepartmentServices = (departmentId: number) => {
        return servicesArray.filter((service: Service) => service.department_id === departmentId);
    };

    return (
        <AppLayout breadcrumbs={[{ href: '', title: 'Departments' }]}>
            <div className="p-6">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Departments</h1>
                        <p className="mt-1 text-sm text-gray-500">Manage medical departments and their services</p>
                    </div>
                    <Button onClick={() => setIsAddModalOpen(true)} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Add Department
                    </Button>
                </div>

                <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap gap-4">
                        <div className="min-w-[250px] flex-1">
                            <div className="relative">
                                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search by name, code, or description..."
                                    className="w-full rounded-md border border-gray-300 py-2 pr-4 pl-10 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                        >
                            <option value="all">All Status</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>
                </div>

                {filteredDepartments.length === 0 ? (
                    <div className="rounded-lg border border-gray-200 bg-white py-12 text-center">
                        <Building2 className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No departments found</h3>
                        <p className="mt-1 text-sm text-gray-500">Get started by creating a new department.</p>
                        <Button onClick={() => setIsAddModalOpen(true)} className="mt-4 gap-2">
                            <Plus className="h-4 w-4" />
                            Add Department
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {filteredDepartments.map((department: Department) => {
                            const departmentServices = getDepartmentServices(department.id);
                            const isExpanded = expandedDepartment === department.id;

                            return (
                                <div key={department.id} className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                                    <div className="p-4 transition-colors hover:bg-gray-50">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="mb-2 flex items-center gap-3">
                                                    <FolderTree className="h-5 w-5 text-blue-500" />
                                                    <h3 className="text-lg font-semibold text-gray-900">{department.name}</h3>
                                                    <StatusBadge status={department.status} />
                                                    <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-500">
                                                        Code: {department.code}
                                                    </span>
                                                </div>
                                                {department.description && (
                                                    <p className="mb-2 text-sm text-gray-600">{department.description}</p>
                                                )}
                                                <div className="flex items-center gap-4 text-sm text-gray-500">
                                                    <span className="flex items-center gap-1">
                                                        <Package className="h-4 w-4" />
                                                        {department.service_count || departmentServices.length} Services
                                                    </span>
                                                    <span>
                                                        Created: {department.created_at
                                                            ? new Date(department.created_at).toLocaleDateString()
                                                            : 'N/A'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleViewServices(department)}
                                                    className="gap-1"
                                                >
                                                    <Package className="h-4 w-4" />
                                                    Services
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleEditDepartment(department)}
                                                    className="text-blue-600 hover:text-blue-800"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDeleteDepartment(department.id)}
                                                    className="text-red-600 hover:text-red-800"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => toggleExpand(department.id)}>
                                                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>

                                    {isExpanded && departmentServices.length > 0 && (
                                        <div className="border-t border-gray-200 bg-gray-50 p-4">
                                            <h4 className="mb-3 text-sm font-medium text-gray-700">Recent Services</h4>
                                            <div className="space-y-2">
                                                {departmentServices.slice(0, 5).map((service: Service) => (
                                                    <div key={service.id} className="flex items-center justify-between text-sm">
                                                        <span className="text-gray-600">{service.service_name}</span>
                                                        <span className="font-medium text-gray-900">
                                                            ZMW {service.cash_price?.toLocaleString() || '0'}
                                                        </span>
                                                    </div>
                                                ))}
                                                {departmentServices.length > 5 && (
                                                    <button
                                                        onClick={() => handleViewServices(department)}
                                                        className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                                                    >
                                                        View all {departmentServices.length} services →
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <DepartmentModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={handleSuccess}
                isEditing={false}
            />

            <DepartmentModal
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setSelectedDepartment(null);
                }}
                onSuccess={handleSuccess}
                department={selectedDepartment}
                isEditing={true}
            />

            <ServicesModal
                isOpen={isServicesModalOpen}
                onClose={() => {
                    setIsServicesModalOpen(false);
                    setSelectedDepartment(null);
                }}
                onSuccess={handleSuccess}
                department={selectedDepartment}
                services={selectedDepartment ? getDepartmentServices(selectedDepartment.id) : []}
            />
        </AppLayout>
    );
}
