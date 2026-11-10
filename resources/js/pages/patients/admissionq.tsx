import { router, usePage } from '@inertiajs/react';
import { format } from 'date-fns';
import {
    ActivityIcon,
    AlertTriangle,
    Plus,
    Scan,
    Stethoscope,
    StethoscopeIcon,
    ToggleRightIcon,
    X,
} from 'lucide-react';
import { useState } from 'react';

import PageHeader from '@/components/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import PatientLayout from '@/layouts/patients/PatientLayout';
import { admissionAPI } from '@/services/api';
import AdmissionModal from './components/AdmissionModal';
import ConsultationTabs from './components/ConsultationTabs';
import NursingDiagnosis from './components/NursingDiagnosis';
import RecentInteractions from './components/RecentInteractions';
import VitalSignsTab from './components/VitalSignsTab';

interface Admission {
    id: number;
    admission_number: string;
    admission_date: string;
    date_of_admission?: string;
    department?: string;
    bed?: string;
    discharge_date?: string | null;
    status?: 'active' | 'discharged';
    uuid?: string;
}

export default function Admissions() {
    const [activeTabItem, setActiveTabItem] = useState('admissions');
    const [activeConsultationTab, setActiveConsultationTab] = useState(
        'recent-interactions',
    );
    const [showDischargeModal, setShowDischargeModal] = useState(false);
    const [selectedAdmission, setSelectedAdmission] =
        useState<Admission | null>(null);
    const [isDischarging, setIsDischarging] = useState(false);
    const [dischargeError, setDischargeError] = useState<string | null>(null);

    // 👇 Single source of truth for the admission modal
    const [showAdmissionModal, setShowAdmissionModal] = useState(false);

    const {
        admissions: initialAdmissions,
        auth,
        nursing_diagnosis: nursingDx,
        doctors: ListOfDoctors,
        interactions: recent,
        admission_number,
    } = usePage().props;

    const doctorId = auth.user.id;

    // Extract patientId from URL
    const pathSegments = window.location.pathname.split('/').filter(Boolean);
    const patientId =
        pathSegments[0] === 'patients' && pathSegments[1] === 'admissions'
            ? parseInt(pathSegments[2])
            : undefined;

    const hasActiveAdmission =
        !!initialAdmissions?.length &&
        initialAdmissions.some(
            (a: Admission) => !a.discharge_date && a.status !== 'discharged',
        );

    const handleDiagnosisAdded = () => {
        router.reload({ only: ['interactions'] });
    };

    const handleDischargeClick = (admission: Admission) => {
        setSelectedAdmission(admission);
        setShowDischargeModal(true);
        setDischargeError(null);
    };

    const handleConfirmDischarge = async () => {
        if (!selectedAdmission) return;
        setIsDischarging(true);
        setDischargeError(null);

        try {
            await admissionAPI.discharge(
                selectedAdmission.uuid || String(selectedAdmission.id),
                {
                    discharge_date: new Date().toISOString(),
                    discharged_by: auth.user.id,
                    discharged_by_name: auth.user.name,
                    diagnosis_on_discharge: '',
                    discharge_notes: 'Patient discharged',
                },
            );

            setShowDischargeModal(false);
            setSelectedAdmission(null);
            router.reload();
        } catch (error: any) {
            setDischargeError(
                error.message || 'An error occurred while discharging',
            );
        } finally {
            setIsDischarging(false);
        }
    };

    const tabs = [
        {
            value: 'admissions',
            label: 'Admissions',
            icon: <Stethoscope className="mr-1 h-4 w-4" />,
        },
        {
            value: 'firm',
            label: 'Review Patient',
            icon: <Stethoscope className="mr-1 h-4 w-4" />,
        },
        {
            value: 'vitals',
            label: 'Vitals',
            icon: <ActivityIcon className="mr-1 h-4 w-4" />,
        },
    ];

    const consultationTabs = [
        {
            value: 'recent-interactions',
            label: 'Recent Interactions',
            icon: <ActivityIcon className="mr-1 h-4 w-4" />,
        },
        {
            value: 'add-interactions',
            label: 'Add Interactions',
            icon: <Plus className="mr-1 h-4 w-4" />,
        },
        {
            value: 'nursing',
            label: 'Nursing',
            icon: <ActivityIcon className="mr-1 h-4 w-4" />,
        },
    ];

    const renderConsultationTabItems = () => {
        switch (activeConsultationTab) {
            case 'recent-interactions':
                return (
                    <RecentInteractions
                        admissionNumber={admission_number}
                        data={recent}
                        patientId={patientId}
                        onDiagnosisAdded={handleDiagnosisAdded}
                    />
                );
            case 'add-interactions':
                return (
                    <ConsultationTabs
                        admissionNumber={admission_number}
                        patientId={patientId}
                        doctorId={doctorId}
                        interactions={recent}
                    />
                );
            case 'nursing':
                return (
                    <NursingDiagnosis
                        admissionNumber={admission_number}
                        patientId={patientId}
                        initialData={nursingDx}
                    />
                );
            default:
                return null;
        }
    };

    const renderTabItems = () => (
        <>
            {activeTabItem === 'admissions' && (
                <div className="mt-6 w-full">
                    {initialAdmissions?.length > 0 ? (
                        <div className="rounded-lg bg-white shadow">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Admission Number</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Department</TableHead>
                                        <TableHead>Bed</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {initialAdmissions.map(
                                        (admission: Admission) => {
                                            const isDischarged =
                                                admission.discharge_date ||
                                                admission.status ===
                                                    'discharged';
                                            return (
                                                <TableRow key={admission.id}>
                                                    <TableCell>
                                                        {
                                                            admission.admission_number
                                                        }
                                                    </TableCell>
                                                    <TableCell>
                                                        {admission.date_of_admission
                                                            ? format(
                                                                  new Date(
                                                                      admission.date_of_admission,
                                                                  ),
                                                                  'PPP',
                                                              )
                                                            : '-'}
                                                    </TableCell>
                                                    <TableCell>
                                                        {isDischarged ? (
                                                            <Badge className="bg-gray-50 text-gray-600">
                                                                Discharged
                                                            </Badge>
                                                        ) : (
                                                            <Badge className="bg-green-50 text-green-600">
                                                                Active
                                                            </Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {admission.department ??
                                                            '-'}
                                                    </TableCell>
                                                    <TableCell>
                                                        {admission.bed ?? '-'}
                                                    </TableCell>
                                                    <TableCell>
                                                        {!isDischarged && (
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() =>
                                                                    handleDischargeClick(
                                                                        admission,
                                                                    )
                                                                }
                                                            >
                                                                <ToggleRightIcon className="h-8 w-8 text-blue-600" />
                                                                Discharge
                                                            </Button>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        },
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <div className="mt-8 flex w-full justify-center rounded-lg bg-gradient-to-r from-blue-50 to-blue-100">
                            <div className="w-full py-10 text-center">
                                <h1 className="mb-4 text-gray-600">
                                    No Admissions Found
                                </h1>
                                {/* 👇 Same state, same modal */}
                                <Button
                                    onClick={() => setShowAdmissionModal(true)}
                                >
                                    <Plus className="mr-1 h-4 w-4" />
                                    Admit Patient
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTabItem === 'firm' && (
                <>
                    <div className="flex gap-2">
                        {consultationTabs.map((tab) => (
                            <Button
                                key={tab.value}
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                    setActiveConsultationTab(tab.value)
                                }
                                className={`flex items-center gap-1 rounded-none border-b-2 transition-all ${
                                    activeConsultationTab === tab.value
                                        ? 'border-gray-600 bg-transparent text-gray-900'
                                        : 'border-transparent text-gray-400 hover:text-gray-700'
                                }`}
                            >
                                {tab.icon}
                                {tab.label}
                            </Button>
                        ))}
                    </div>

                    <div className="mt-6 w-full">
                        {renderConsultationTabItems()}
                    </div>
                </>
            )}

            {activeTabItem === 'vitals' && (
                <VitalSignsTab
                    admissionNumber={admission_number}
                    patientId={patientId}
                />
            )}
        </>
    );

    return (
        <PatientLayout
            breadcrumbs={[
                { title: 'Patient', href: '' },
                { title: 'Admission', href: '#' },
            ]}
        >
            <div className="h-full bg-blue-100 p-2">
                {/* Header */}
                <div className="flex gap-2">
                    <PageHeader
                        icon={<StethoscopeIcon />}
                        title="Admission"
                        subtitle="View current active admission"
                        actions={[
                            {
                                label: 'Admit Patient',
                                onClick: () => setShowAdmissionModal(true),
                            },
                        ]}
                    />
                </div>

                {/* Tabs */}
                <div className="mb-6 flex gap-3">
                    {tabs.map((tab) => (
                        <Button
                            key={tab.value}
                            variant={
                                activeTabItem === tab.value
                                    ? 'default'
                                    : 'outline'
                            }
                            size="sm"
                            onClick={() => setActiveTabItem(tab.value)}
                        >
                            {tab.icon}
                            {tab.label}
                        </Button>
                    ))}
                </div>

                {renderTabItems()}
            </div>

            {/* 👇 SINGLE controlled AdmissionModal — no internal trigger */}

            {hasActiveAdmission && (
                <AdmissionModal
                    open={showAdmissionModal}
                    onOpenChange={setShowAdmissionModal}
                    admittedById={auth.user.id}
                    doctorsList={ListOfDoctors}
                    patientId={patientId}
                    onSuccess={() => {
                        setShowAdmissionModal(false);
                        router.reload();
                    }}
                />
            )}
            <AdmissionModal
                open={showAdmissionModal}
                onOpenChange={setShowAdmissionModal}
                admittedById={auth.user.id}
                doctorsList={ListOfDoctors}
                patientId={patientId}
                onSuccess={() => {
                    setShowAdmissionModal(false);
                    router.reload();
                }}
            />
            {/* Discharge confirmation modal */}
            {showDischargeModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() =>
                            !isDischarging && setShowDischargeModal(false)
                        }
                    />

                    <div className="relative z-10 mx-4 w-full max-w-md animate-in rounded-lg bg-white shadow-xl duration-200 fade-in zoom-in">
                        <div className="flex items-center justify-between border-b p-6">
                            <div className="flex items-center gap-3">
                                <div className="rounded-full bg-yellow-100 p-2">
                                    <AlertTriangle className="h-6 w-6 text-yellow-600" />
                                </div>
                                <h2 className="text-xl font-semibold text-gray-900">
                                    Confirm Discharge
                                </h2>
                            </div>
                            <button
                                onClick={() =>
                                    !isDischarging &&
                                    setShowDischargeModal(false)
                                }
                                className="text-gray-400 transition-colors hover:text-gray-600"
                                disabled={isDischarging}
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-6">
                            <p className="mb-4 text-gray-700">
                                Are you sure you want to discharge this patient?
                            </p>

                            {selectedAdmission && (
                                <div className="mb-4 rounded-lg bg-gray-50 p-4">
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">
                                                Admission Number:
                                            </span>
                                            <span className="font-medium text-gray-900">
                                                {
                                                    selectedAdmission.admission_number
                                                }
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">
                                                Department:
                                            </span>
                                            <span className="font-medium text-gray-900">
                                                {selectedAdmission.department ??
                                                    '-'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">
                                                Bed:
                                            </span>
                                            <span className="font-medium text-gray-900">
                                                {selectedAdmission.bed ?? '-'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 p-3">
                                <p className="text-sm text-yellow-800">
                                    <strong>Note:</strong> This action will mark
                                    the patient as discharged and free up the
                                    bed for other patients. This process cannot
                                    be undone.
                                </p>
                            </div>

                            {dischargeError && (
                                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
                                    <p className="text-sm text-red-800">
                                        {dischargeError}
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 rounded-b-lg border-t bg-gray-50 p-6">
                            <Button
                                variant="outline"
                                onClick={() => setShowDischargeModal(false)}
                                disabled={isDischarging}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleConfirmDischarge}
                                disabled={isDischarging}
                                className="bg-red-600 text-white hover:bg-red-700"
                            >
                                {isDischarging ? (
                                    <>
                                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                        Discharging...
                                    </>
                                ) : (
                                    'Confirm Discharge'
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </PatientLayout>
    );
}
