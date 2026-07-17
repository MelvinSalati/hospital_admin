// pages/components/tabs/RolesTab.tsx

import { Building2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
        description: 'manage products in the warehouse',
    },
    {
        value: 'lab_technician',
        label: 'Lab Technician',
        description: 'Can process lab tests',
    },
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

export default function RolesTab({ 
  data, 
  setData, 
  errors, 
  departments = [], 
  loadingDepartments = false,
  departmentError = null,
  onRefresh 
}: RolesTabProps) {
  const handleRoleChange = (roleValue: string) => {
    const updatedRoles = data.roles.includes(roleValue)
      ? data.roles.filter(r => r !== roleValue)
      : [...data.roles, roleValue];
    setData('roles', updatedRoles);
  };

  return (
    <div className="space-y-6">
      {/* Roles Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          User Roles <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {roleOptions.map((role) => (
            <div
              key={role.value}
              onClick={() => handleRoleChange(role.value)}
              className={`
                relative flex items-start p-4 border rounded-lg cursor-pointer transition-all
                ${data.roles.includes(role.value)
                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }
              `}
            >
              <div className="flex items-center h-5">
                <input
                  type="checkbox"
                  checked={data.roles.includes(role.value)}
                  onChange={() => handleRoleChange(role.value)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
              </div>
              <div className="ml-3 flex-1">
                <label className="font-medium text-gray-900 cursor-pointer">
                  {role.label}
                </label>
                <p className="text-sm text-gray-500">{role.description}</p>
              </div>
            </div>
          ))}
        </div>
        {errors.roles && (
          <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            {errors.roles}
          </p>
        )}
      </div>

      {/* Department Selection */}
      <div className="border-t border-gray-200 pt-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Department Assignment <span className="text-red-500">*</span>
        </label>
        
        {loadingDepartments ? (
          <div className="flex items-center justify-center p-8 bg-gray-50 rounded-lg border border-gray-200">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-500">Loading departments...</span>
          </div>
        ) : departmentError ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
            <p className="text-red-600 mb-2">{departmentError}</p>
            {onRefresh && (
              <Button
                onClick={onRefresh}
                variant="outline"
                className="mt-2"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            )}
          </div>
        ) : departments && departments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {departments.map((department) => (
              <div
                key={department.id}
                onClick={() => setData('department_id', department.id.toString())}
                className={`
                  relative flex items-start p-4 border rounded-lg cursor-pointer transition-all
                  ${data.department_id === department.id.toString()
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }
                `}
              >
                <div className="flex items-center h-5">
                  <input
                    type="radio"
                    name="department"
                    checked={data.department_id === department.id.toString()}
                    onChange={() => setData('department_id', department.id.toString())}
                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                </div>
                <div className="ml-3 flex-1">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-gray-400" />
                    <label className="font-medium text-gray-900 cursor-pointer">
                      {department.name}
                    </label>
                    {department.code && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {department.code}
                      </span>
                    )}
                  </div>
                  {department.description && (
                    <p className="text-sm text-gray-500 mt-1">{department.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
            <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">No departments available</p>
            <p className="text-sm text-gray-400 mt-1">Please contact administrator to add departments</p>
          </div>
        )}
        
        {errors.department_id && !departmentError && (
          <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            {errors.department_id}
          </p>
        )}
      </div>

      {/* Help Text */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-800 mb-2">About Roles & Departments</h4>
        <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
          <li>Users can have multiple roles based on their responsibilities</li>
          <li>Each user must be assigned to at least one department</li>
          <li>Department assignment determines access to department-specific features</li>
          <li>Roles can be modified later by administrators</li>
        </ul>
      </div>
    </div>
  );
}