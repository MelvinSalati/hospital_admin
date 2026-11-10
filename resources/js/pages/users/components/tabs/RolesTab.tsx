/* pages/components/tabs/RolesTab.tsx */

import {
    Building2,
    AlertCircle,
    RefreshCw,
    Baby,
    HeartPulse,
    Scissors,
    Smile,
    Eye,
} from 'lucide-react';

import { Button } from '@/components/ui/button';

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

interface Department {
    id: number;
    name: string;
    code: string;
    description?: string;
}

interface RolesTabProps {
    data: {
        roles: string[];
        department_id: string;
    };
    setData: (key: string, value: any) => void;
    errors: Record<string, string>;
    departments: Department[];
    loadingDepartments: boolean;
    departmentError?: string | null;
    onRefresh?: () => void;
}

/* -------------------------------------------------------------------------- */
/*                               Role Definitions                             */
/* -------------------------------------------------------------------------- */

const roleOptions = [
    {
        value: 'admin',
        label: 'Administrator',
        description: 'Full system access',
    },
    {
        value: 'doctor',
        label: 'Doctor',
        description: 'Can prescribe medications and view patient records',
    },
    {
        value: 'nurse',
        label: 'Nurse',
        description: 'Can assist with patient care and vitals',
    },
    {
        value: 'pharmacist',
        label: 'Pharmacist',
        description: 'Can dispense medications',
    },
    {
        value: 'bulkstore',
        label: 'Bulk Store',
        description: 'Manage products in the warehouse',
    },
    {
        value: 'lab_technician',
        label: 'Lab Technician',
        description: 'Can process laboratory tests and manage results',
    },
    {
        value: 'radiologist',
        label: 'Radiology / Imaging',
        description: 'Perform diagnostic imaging and manage radiology reports',
    },

    /* ---------------------------------------------------------------------- */
    /*                         NEW DEPARTMENT ROLES                           */
    /* ---------------------------------------------------------------------- */

    {
        value: 'maternal_child_health',
        label: 'Maternal & Child Health',
        description:
            'Manage antenatal care, postnatal care, maternal services, immunisation and child health services',
        icon: HeartPulse,
    },
    {
        value: 'theatre',
        label: 'Theatre',
        description:
            'Manage surgical schedules, theatre queues, procedures and surgical records',
        icon: Scissors,
    },
    {
        value: 'dental',
        label: 'Dental',
        description:
            'Manage dental consultations, oral examinations, treatments and dental procedures',
        icon: Smile,
    },
    {
        value: 'ophthalmology',
        label: 'Ophthalmology',
        description:
            'Manage eye examinations, ophthalmic consultations, procedures and eye care records',
        icon: Eye,
    },

    /* ---------------------------------------------------------------------- */
    /*                          EXISTING USER ROLES                           */
    /* ---------------------------------------------------------------------- */

    {
        value: 'receptionist',
        label: 'Receptionist',
        description: 'Can manage appointments and registrations',
    },
    {
        value: 'accountant',
        label: 'Accountant',
        description: 'Can manage billing and payments',
    },
];

/* -------------------------------------------------------------------------- */
/*                                  Component                                 */
/* -------------------------------------------------------------------------- */

export default function RolesTab({
    data,
    setData,
    errors,
    departments = [],
    loadingDepartments = false,
    departmentError = null,
    onRefresh,
}: RolesTabProps) {
    /* -------------------------- Role Selection ---------------------------- */

    const handleRoleChange = (roleValue: string) => {
        const updatedRoles = data.roles.includes(roleValue)
            ? data.roles.filter((role) => role !== roleValue)
            : [...data.roles, roleValue];

        setData('roles', updatedRoles);
    };

    /* ----------------------- Department Selection ------------------------ */

    const handleDepartmentChange = (departmentId: number) => {
        setData('department_id', departmentId.toString());
    };

    /* ---------------------------------------------------------------------- */
    /*                                  Render                                */
    /* ---------------------------------------------------------------------- */

    return (
        <div className="space-y-6">
            {/* ---------------------------------------------------------------- */}
            {/*                           Roles Selection                       */}
            {/* ---------------------------------------------------------------- */}

            <div>
                <label className="mb-3 block text-sm font-medium text-gray-700">
                    User Roles <span className="text-red-500">*</span>
                </label>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {roleOptions.map((role) => {
                        const selected = data.roles.includes(role.value);

                        const Icon = role.icon;

                        return (
                            <div
                                key={role.value}
                                onClick={() => handleRoleChange(role.value)}
                                className={`relative flex cursor-pointer items-start rounded-lg border p-4 transition-all ${
                                    selected
                                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                }`}
                            >
                                <div className="flex h-5 items-center">
                                    <input
                                        type="checkbox"
                                        checked={selected}
                                        onChange={() =>
                                            handleRoleChange(role.value)
                                        }
                                        onClick={(event) =>
                                            event.stopPropagation()
                                        }
                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                </div>

                                <div className="ml-3 flex-1">
                                    <div className="flex items-center gap-2">
                                        {Icon && (
                                            <Icon className="h-4 w-4 text-blue-600" />
                                        )}

                                        <span className="font-medium text-gray-900">
                                            {role.label}
                                        </span>
                                    </div>

                                    <p className="mt-1 text-sm text-gray-500">
                                        {role.description}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {errors.roles && (
                    <p className="mt-2 flex items-center gap-1 text-sm text-red-600">
                        <AlertCircle className="h-4 w-4" />
                        {errors.roles}
                    </p>
                )}
            </div>

            {/* ---------------------------------------------------------------- */}
            {/*                        Department Selection                     */}
            {/* ---------------------------------------------------------------- */}

            <div className="border-t border-gray-200 pt-6">
                <label className="mb-3 block text-sm font-medium text-gray-700">
                    Department Assignment{' '}
                    <span className="text-red-500">*</span>
                </label>

                {/* Loading State */}

                {loadingDepartments ? (
                    <div className="flex items-center justify-center rounded-lg border border-gray-200 bg-gray-50 p-8">
                        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />

                        <span className="ml-2 text-gray-500">
                            Loading departments...
                        </span>
                    </div>
                ) : departmentError ? (
                    /* Error State */

                    <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
                        <AlertCircle className="mx-auto mb-3 h-12 w-12 text-red-500" />

                        <p className="mb-2 text-red-600">{departmentError}</p>

                        {onRefresh && (
                            <Button
                                onClick={onRefresh}
                                variant="outline"
                                className="mt-2"
                            >
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Retry
                            </Button>
                        )}
                    </div>
                ) : departments && departments.length > 0 ? (
                    /* Department List */

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {departments.map((department) => {
                            const selected =
                                data.department_id === department.id.toString();

                            return (
                                <div
                                    key={department.id}
                                    onClick={() =>
                                        handleDepartmentChange(department.id)
                                    }
                                    className={`relative flex cursor-pointer items-start rounded-lg border p-4 transition-all ${
                                        selected
                                            ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                    }`}
                                >
                                    <div className="flex h-5 items-center">
                                        <input
                                            type="radio"
                                            name="department"
                                            checked={selected}
                                            onChange={() =>
                                                handleDepartmentChange(
                                                    department.id,
                                                )
                                            }
                                            onClick={(event) =>
                                                event.stopPropagation()
                                            }
                                            className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                    </div>

                                    <div className="ml-3 flex-1">
                                        <div className="flex items-center gap-2">
                                            <Building2 className="h-4 w-4 text-gray-400" />

                                            <span className="font-medium text-gray-900">
                                                {department.name}
                                            </span>

                                            {department.code && (
                                                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                                                    {department.code}
                                                </span>
                                            )}
                                        </div>

                                        {department.description && (
                                            <p className="mt-1 text-sm text-gray-500">
                                                {department.description}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    /* Empty State */

                    <div className="rounded-lg border border-gray-200 bg-gray-50 py-8 text-center">
                        <Building2 className="mx-auto mb-2 h-12 w-12 text-gray-400" />

                        <p className="text-gray-500">
                            No departments available
                        </p>

                        <p className="mt-1 text-sm text-gray-400">
                            Please contact administrator to add departments
                        </p>
                    </div>
                )}

                {errors.department_id && !departmentError && (
                    <p className="mt-2 flex items-center gap-1 text-sm text-red-600">
                        <AlertCircle className="h-4 w-4" />
                        {errors.department_id}
                    </p>
                )}
            </div>

            {/* ---------------------------------------------------------------- */}
            {/*                             Help Text                           */}
            {/* ---------------------------------------------------------------- */}

            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <h4 className="mb-2 text-sm font-medium text-blue-800">
                    About Roles & Departments
                </h4>

                <ul className="list-inside list-disc space-y-1 text-xs text-blue-700">
                    <li>
                        Users can have multiple roles based on their
                        responsibilities
                    </li>

                    <li>
                        Each user must be assigned to at least one department
                    </li>

                    <li>
                        Department assignment determines access to
                        department-specific features
                    </li>

                    <li>
                        Maternal & Child Health, Theatre, Dental and
                        Ophthalmology have dedicated departmental workspaces
                    </li>

                    <li>Roles can be modified later by administrators</li>
                </ul>
            </div>
        </div>
    );
}
