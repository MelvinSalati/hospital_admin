// pages/components/tabs/DepartmentsTab.tsx

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { usePage, router } from '@inertiajs/react';
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  X,
  Save,
  Building2,
  RefreshCw,
  CheckCircle
} from 'lucide-react';
import Notiflix from 'notiflix';

interface Department {
  id: number;
  name: string;
  code: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

interface DepartmentFormData {
  name: string;
  code: string;
  description: string;
}

interface SelectedDepartment {
  id: number;
  name: string;
  code: string;
}

const defaultFormData: DepartmentFormData = {
  name: '',
  code: '',
  description: '',
};

interface DepartmentsTabProps {
  data: any; // The form data object
  setData: (key: string, value: any) => void; // Form setData function
  errors?: Record<string, string>;
  required?: boolean;
}

export default function DepartmentsTab({
  data,
  setData,
  errors,
  required = false
}: DepartmentsTabProps) {
  const { departments: initialDepartments = [] } = usePage().props;
  const [departments, setDepartments] = useState<Department[]>(initialDepartments);
  const [selectedDept, setSelectedDept] = useState<SelectedDepartment | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [formData, setFormData] = useState<DepartmentFormData>(defaultFormData);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);

  // Initialize selected department from form data
  useEffect(() => {
    if (data.department_id && departments.length > 0) {
      const department = departments.find(d => d.id === Number(data.department_id));
      if (department) {
        setSelectedDept({
          id: department.id,
          name: department.name,
          code: department.code
        });
      }
    }
  }, [data.department_id, departments]);

  // Filter departments based on search term
  const filteredDepartments = departments.filter(dept =>
    dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dept.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (dept.description && dept.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSelectDepartment = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const deptId = parseInt(e.target.value);
    if (deptId) {
      const department = departments.find(d => d.id === deptId);
      if (department) {
        const selected = {
          id: department.id,
          name: department.name,
          code: department.code
        };
        setSelectedDept(selected);
        setData('department_id', department.id); // Update form data
      }
    } else {
      setSelectedDept(null);
      setData('department_id', ''); // Clear form data
    }
  };

  const handleOpenModal = (department?: Department) => {
    if (department) {
      setIsEditing(true);
      setSelectedDepartment(department);
      setFormData({
        name: department.name,
        code: department.code,
        description: department.description || '',
      });
    } else {
      setIsEditing(false);
      setSelectedDepartment(null);
      setFormData(defaultFormData);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedDepartment(null);
    setFormData(defaultFormData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      Notiflix.Notify.warning('Department name is required');
      return;
    }
    if (!formData.code.trim()) {
      Notiflix.Notify.warning('Department code is required');
      return;
    }

    setSubmitting(true);

    const payload = {
      name: formData.name,
      code: formData.code,
      description: formData.description,
    };

    const url = isEditing && selectedDepartment
      ? `/departments/${selectedDepartment.id}`
      : '/departments';

    const method = isEditing ? 'put' : 'post';

    router[method](url, payload, {
      preserveScroll: true,
      onSuccess: () => {
        Notiflix.Notify.success(
          isEditing ? 'Department updated successfully' : 'Department created successfully'
        );
        handleCloseModal();
        // Refresh departments list
        router.reload({ only: ['departments'] });
      },
      onError: (errors) => {
        console.error('Error saving department:', errors);
        if (errors && typeof errors === 'object') {
          Object.values(errors).forEach((error: any) => {
            if (Array.isArray(error)) {
              error.forEach(err => Notiflix.Notify.failure(err));
            } else if (typeof error === 'string') {
              Notiflix.Notify.failure(error);
            }
          });
        } else {
          Notiflix.Notify.failure('An error occurred');
        }
      },
      onFinish: () => {
        setSubmitting(false);
      }
    });
  };

  const handleDeleteDepartment = (department: Department) => {
    Notiflix.Confirm.show(
      'Confirm Delete',
      `Are you sure you want to delete department "${department.name}"? This action cannot be undone.`,
      'Yes, Delete',
      'Cancel',
      () => {
        router.delete(`/departments/${department.id}`, {
          preserveScroll: true,
          onSuccess: () => {
            Notiflix.Notify.success('Department deleted successfully');
            if (selectedDept?.id === department.id) {
              setSelectedDept(null);
              setData('department_id', '');
            }
            router.reload({ only: ['departments'] });
          },
          onError: (errors) => {
            console.error('Error deleting department:', errors);
            Notiflix.Notify.failure('Failed to delete department');
          }
        });
      }
    );
  };

  const refreshDepartments = () => {
    setLoading(true);
    router.reload({
      only: ['departments'],
      onSuccess: () => {
        Notiflix.Notify.success('Departments refreshed');
      },
      onError: () => {
        Notiflix.Notify.failure('Failed to refresh departments');
      },
      onFinish: () => {
        setLoading(false);
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Department Selection Section */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Assign Department {required && <span className="text-red-500">*</span>}
        </label>
        <div className="flex gap-2 items-start">
          <select
            className={`flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors?.department_id ? 'border-red-500' : 'border-gray-300'
            }`}
            value={selectedDept?.id || ''}
            onChange={handleSelectDepartment}
          >
            <option value="">Select Department</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name} ({dept.code})
              </option>
            ))}
          </select>

          {/* Action Buttons */}
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => handleOpenModal()}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Add New Department"
            >
              <Plus className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={refreshDepartments}
              disabled={loading}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh Departments"
            >
              <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Error Message */}
        {errors?.department_id && (
          <p className="text-sm text-red-500">{errors.department_id}</p>
        )}

        {/* Selected Department Info */}
        {selectedDept && (
          <div className="flex items-center gap-2 mt-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
            <CheckCircle className="h-4 w-4 text-blue-600" />
            <span className="text-sm text-blue-800">
              Selected: <strong>{selectedDept.name}</strong> ({selectedDept.code})
            </span>
            <button
              type="button"
              onClick={() => {
                setSelectedDept(null);
                setData('department_id', '');
              }}
              className="ml-auto text-blue-600 hover:text-blue-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <p className="text-xs text-gray-500">
          {departments.length === 0
            ? 'No departments available. Click + to add a department.'
            : 'Select a department to assign to this user'}
        </p>
      </div>

      {/* Manage Departments Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-[2px]" onClick={handleCloseModal} />

          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {isEditing ? 'Edit Department' : 'Add New Department'}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Manage departments for user assignment
                </p>
              </div>
              <button
                onClick={handleCloseModal}
                className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {/* Search Bar */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search departments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Departments List */}
              {filteredDepartments.length === 0 ? (
                <div className="text-center py-8">
                  <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">No departments found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredDepartments.map((department) => (
                    <div
                      key={department.id}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-blue-600" />
                          <span className="font-medium text-gray-900">{department.name}</span>
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                            {department.code}
                          </span>
                        </div>
                        {department.description && (
                          <p className="text-sm text-gray-500 mt-1">{department.description}</p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleOpenModal(department)}
                          className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteDepartment(department)}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add/Edit Form */}
            <div className="border-t border-gray-100 p-6 bg-gray-50">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Department Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="e.g., Cardiology"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Department Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="code"
                      value={formData.code}
                      onChange={handleInputChange}
                      placeholder="e.g., CARD"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={2}
                    placeholder="Brief description..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCloseModal}
                    className="h-9 text-sm"
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="h-9 text-sm bg-blue-600 hover:bg-blue-700"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        {isEditing ? 'Saving...' : 'Creating...'}
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        {isEditing ? 'Update Department' : 'Create Department'}
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
