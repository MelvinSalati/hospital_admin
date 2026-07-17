import AppLayout from "@/layouts/app-layout";
import AddPatientModal from '@/components/modals/AddPatientModal';
import { useState } from 'react';
import { Link } from '@inertiajs/react';
import { MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline';

interface Patient {
    id: number;
    patient_number: string;
    first_name: string;
    last_name: string;
    gender: string;
    phone: string;
    email: string;
    status: 'active' | 'inactive';
    created_at: string;
}

// Sample data - replace with actual data from your backend
const samplePatients: Patient[] = [
    {
        id: 1,
        patient_number: 'PT-2024-001',
        first_name: 'John',
        last_name: 'Doe',
        gender: 'male',
        phone: '+250 788 123 456',
        email: 'john.doe@example.com',
        status: 'active',
        created_at: '2024-01-15'
    },
    {
        id: 2,
        patient_number: 'PT-2024-002',
        first_name: 'Jane',
        last_name: 'Smith',
        gender: 'female',
        phone: '+250 722 987 654',
        email: 'jane.smith@example.com',
        status: 'active',
        created_at: '2024-01-20'
    },
    {
        id: 3,
        patient_number: 'PT-2024-003',
        first_name: 'Peter',
        last_name: 'Johnson',
        gender: 'male',
        phone: '+250 733 456 789',
        email: 'peter.j@example.com',
        status: 'inactive',
        created_at: '2024-02-01'
    }
];

export default function Registry() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

    // Filter patients based on search and status
    const filteredPatients = samplePatients.filter(patient => {
        const matchesSearch =
            patient.patient_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
            patient.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            patient.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            patient.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            patient.phone.includes(searchTerm);

        const matchesStatus = statusFilter === 'all' || patient.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    const handlePatientAdded = () => {
        // Refresh the patient list here
        console.log('Patient added successfully - refresh list');
        // You would typically fetch updated data from your backend
    };

    return (
        <AppLayout>
            <div className="p-4 md:p-6 bg-blue-50 min-h-screen">
                {/* Header Section */}
                <div className="mb-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h3 className="text-2xl font-semibold text-blue-800 flex items-center gap-2">
                                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                Patient Registry
                            </h3>
                            <p className="text-sm text-blue-600 mt-1">
                                Manage and view all patients in the system
                            </p>
                        </div>


                    </div>

                    {/* Search and Filter Bar */}
                    <div className="mt-4 flex flex-col sm:flex-row gap-3">
                        <div className="flex-1 relative">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search patients by name, ID, email or phone..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2
                                         focus:ring-blue-500 focus:border-transparent dark:bg-gray-800
                                         dark:border-gray-600 dark:text-white"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <FunnelIcon className="w-5 h-5 text-gray-500" />
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as any)}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2
                                         focus:ring-blue-500 focus:border-transparent dark:bg-gray-800
                                         dark:border-gray-600 dark:text-white"
                            >
                                <option value="all">All Status</option>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Patients Table/Card View */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
                    {/* Table for desktop */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Patient #
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Name
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Contact
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Gender
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Registered
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {filteredPatients.length > 0 ? (
                                    filteredPatients.map((patient) => (
                                        <tr key={patient.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 dark:text-blue-400">
                                                {patient.patient_number}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                    {patient.first_name} {patient.last_name}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                                    <div>{patient.email}</div>
                                                    <div>{patient.phone}</div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 capitalize">
                                                {patient.gender}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                                    patient.status === 'active'
                                                        ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                                                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                                }`}>
                                                    {patient.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                {new Date(patient.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-3">
                                                    View
                                                </button>
                                                <button className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300">
                                                    Edit
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                            <div className="flex flex-col items-center">
                                                <svg className="w-12 h-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                          d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <p className="text-lg font-medium">No patients found</p>
                                                <p className="text-sm mt-1">Try adjusting your search or filter</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Card view for mobile */}
                    <div className="md:hidden p-4 space-y-4">
                        {filteredPatients.length > 0 ? (
                            filteredPatients.map((patient) => (
                                <div key={patient.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 shadow">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                                                {patient.patient_number}
                                            </span>
                                            <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                                                {patient.first_name} {patient.last_name}
                                            </h4>
                                        </div>
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                            patient.status === 'active'
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-gray-100 text-gray-800'
                                        }`}>
                                            {patient.status}
                                        </span>
                                    </div>
                                    <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                                        <p>📧 {patient.email}</p>
                                        <p>📞 {patient.phone}</p>
                                        <p>👤 {patient.gender}</p>
                                        <p>📅 Registered: {new Date(patient.created_at).toLocaleDateString()}</p>
                                    </div>
                                    <div className="mt-3 flex justify-end gap-3 pt-2 border-t border-gray-200 dark:border-gray-600">
                                        <button className="text-blue-600 hover:text-blue-900 text-sm font-medium">
                                            View
                                        </button>
                                        <button className="text-green-600 hover:text-green-900 text-sm font-medium">
                                            Edit
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                                <p className="text-lg font-medium">No patients found</p>
                                <p className="text-sm mt-1">Click "Add New Patient" to create one</p>
                            </div>
                        )}
                    </div>

                    {/* Pagination (optional) */}
                    {filteredPatients.length > 0 && (
                        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                    Showing <span className="font-medium">1</span> to <span className="font-medium">{filteredPatients.length}</span> of{' '}
                                    <span className="font-medium">{filteredPatients.length}</span> results
                                </p>
                                <div className="flex gap-2">
                                    <button className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50" disabled>
                                        Previous
                                    </button>
                                    <button className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50" disabled>
                                        Next
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Add Patient Modal */}
                <AddPatientModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={handlePatientAdded}
                />
            </div>
        </AppLayout>
    );
}
