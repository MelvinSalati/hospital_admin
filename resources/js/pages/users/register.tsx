// pages/Register.tsx

import { useState } from 'react';
import { useForm, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, User, Phone, Shield, Save, Users, Loader2 } from 'lucide-react';

// Import Tab Components
import DemographicsTab from './components/tabs/DemographicsTab';
import ContactTab from './components/tabs/ContactTab';
import RolesTab from './components/tabs/RolesTab';
import AppLayout from '@/layouts/app-layout';
import Http from '@/utils/Http';
import routes from '@/constants/routes';
import Notiflix from 'notiflix';
import DepartmentsTab from './components/tabs/DepartmentsTab';

interface RegisterFormData {
  first_name: string;
  surname: string;
  date_of_birth: string;
  gender: string;
  address: string;
  mobile_phone_number: string;
  email: string;
  profession_id: string;
  certificates: File[];
  diplomas: File[];
  degrees: File[];
  roles: string[];
  license_number: string;
  license_expiry_date: string;
  license_document: File | null;
  department_id: number | string;
}

interface DepartmentsTabProps {
  data: RegisterFormData;
  setData: (key: keyof RegisterFormData, value: any) => void;
  errors?: Record<string, string>;
  required?: boolean;
}

const tabs = [
  { id: 'demographics', label: 'Demographics', icon: User, step: 1 },
  { id: 'contact', label: 'Contact Info', icon: Phone, step: 2 },
  { id: 'roles', label: 'Roles & Access', icon: Shield, step: 3 },
  { id: 'departments', label: 'Departments', icon: Users, step: 4 },
];

const defaultFormValues: RegisterFormData = {
  first_name: '',
  surname: '',
  date_of_birth: '',
  gender: '',
  address: '',
  mobile_phone_number: '',
  email: '',
  profession_id: '',
  certificates: [],
  diplomas: [],
  degrees: [],
  roles: [],
  license_number: '',
  license_expiry_date: '',
  license_document: null,
  department_id: '',
};

export default function Register() {
  const [activeTab, setActiveTab] = useState('demographics');
  const [tabErrors, setTabErrors] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { props } = usePage();

  const { data, setData, processing, errors, clearErrors, reset } = useForm<RegisterFormData>(defaultFormValues);

  // Reset form to default values and reset all states
  const resetForm = () => {
    reset(defaultFormValues);
    setActiveTab('demographics');
    setTabErrors({});
    clearErrors();
    setIsSubmitting(false);
  };

  // Validate current tab before switching
  const validateTab = (tabId: string): boolean => {
    const tabValidationErrors: Record<string, boolean> = {};
    let isValid = true;

    switch(tabId) {
      case 'demographics':
        if (!data.first_name) { isValid = false; tabValidationErrors.first_name = true; }
        if (!data.surname) { isValid = false; tabValidationErrors.surname = true; }
        if (!data.date_of_birth) { isValid = false; tabValidationErrors.date_of_birth = true; }
        if (!data.gender) { isValid = false; tabValidationErrors.gender = true; }
        break;

      case 'contact':
        if (!data.mobile_phone_number) { isValid = false; tabValidationErrors.mobile_phone_number = true; }
        if (!data.email) { isValid = false; tabValidationErrors.email = true; }
        break;

      case 'roles':
        if (data.roles.length === 0) { isValid = false; tabValidationErrors.roles = true; }
        break;
    }

    setTabErrors(prev => ({ ...prev, [tabId]: !isValid }));
    return isValid;
  };

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
  };

  const handleNext = () => {
    const currentIndex = tabs.findIndex(t => t.id === activeTab);
    if (currentIndex < tabs.length - 1 && validateTab(activeTab)) {
      setActiveTab(tabs[currentIndex + 1].id);
      clearErrors();
    }
  };

  const handlePrevious = () => {
    const currentIndex = tabs.findIndex(t => t.id === activeTab);
    if (currentIndex > 0) {
      setActiveTab(tabs[currentIndex - 1].id);
      clearErrors();
    }
  };

  const handleSubmit = async () => {
    // Final validation before submission
    if (!validateTab('demographics') || !validateTab('contact') || !validateTab('roles')) {
      Notiflix.Notify.warning('Please complete all required fields before submitting');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const user = await Http.post(routes.api.user.register, { data });

      if (user.data.status) {
        Notiflix.Notify.success(user.data.message);
        // Reset form to default values on success
        resetForm();
      } else {
        Notiflix.Notify.failure(user.data.message || 'Failed to create user!');
        setIsSubmitting(false);
      }
    } catch (error) {
      Notiflix.Notify.failure('An error occurred while creating user!');
      console.error('Registration error:', error);
      setIsSubmitting(false);
    }
  };

  const currentIndex = tabs.findIndex(t => t.id === activeTab);
  const progress = ((currentIndex + 1) / tabs.length) * 100;

  return (
    <AppLayout breadcrumbs={[{ href: '', title: 'Admin' }, { href: '', title: 'User Registration' }]}>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          {/* Header Section */}
          <div className="mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm border border-gray-200">
                <Users className="h-5 w-5 text-gray-700" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">Registration Form</h1>
                <p className="text-sm text-gray-500 mt-0.5">Add new user to the billing system</p>
              </div>
            </div>
          </div>

          {/* Form Container */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            {/* Progress Bar */}
            <div className="px-8 pt-6 pb-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">
                    Step {currentIndex + 1} of {tabs.length}
                  </span>
                  {isSubmitting && (
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Submitting...
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-400">{Math.round(progress)}% Complete</span>
              </div>
              <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gray-800 transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="border-b border-gray-100">
              <nav className="flex overflow-x-auto px-4">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const hasError = tabErrors[tab.id];
                  const isActive = activeTab === tab.id;

                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleTabChange(tab.id)}
                      disabled={isSubmitting}
                      className={`
                        relative flex items-center gap-2 px-5 py-4 text-sm font-medium transition-all
                        ${isActive
                          ? 'text-gray-900 border-b-2 border-gray-900'
                          : 'text-gray-500 hover:text-gray-700'
                        }
                        ${hasError ? 'text-red-600' : ''}
                        ${isSubmitting ? 'cursor-not-allowed opacity-50' : ''}
                      `}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{tab.label}</span>
                      <span className={`
                        text-xs px-2 py-0.5 rounded-full
                        ${isActive ? 'bg-gray-100 text-gray-600' : 'bg-gray-50 text-gray-400'}
                      `}>
                        {tab.step}
                      </span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Form Content */}
            <div className="p-8">
              {activeTab === 'demographics' && (
                <DemographicsTab data={data} setData={setData} errors={errors} />
              )}
              {activeTab === 'contact' && (
                <ContactTab data={data} setData={setData} errors={errors} />
              )}
              {activeTab === 'roles' && (
                <RolesTab data={data} setData={setData} errors={errors} />
              )}
              {activeTab === 'departments' && (
                <DepartmentsTab data={data} setData={setData} errors={errors} />
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentIndex === 0 || isSubmitting}
                  className="px-6 text-gray-600 hover:text-gray-900 border-gray-200 hover:border-gray-300 disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>

                {currentIndex === tabs.length - 1 ? (
                  <Button
                    onClick={handleSubmit}
                    type="button"
                    disabled={isSubmitting || processing}
                    className="px-6 bg-gray-900 hover:bg-gray-800 text-white disabled:opacity-50 disabled:cursor-not-allowed min-w-[180px]"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      <>
                        Complete Registration
                        <Save className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={handleNext}
                    disabled={isSubmitting}
                    className="px-6 bg-gray-900 hover:bg-gray-800 text-white disabled:opacity-50"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}