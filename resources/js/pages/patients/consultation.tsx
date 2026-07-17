import { useState, useEffect } from 'react';
import PatientLayout from '@/layouts/patients/PatientLayout';
import { Button } from '@/components/ui/button';
import {
    ChevronLeftIcon,
    Activity,
    Plus,
    LayoutGrid,
    MicroscopeIcon,
} from 'lucide-react';
import { Link, usePage, router } from '@inertiajs/react';
import ConsultationTabs from './components/ConsultationTabs';
import RecentInteractions from './components/RecentInteractions';

interface Tab {
    key: number;
    name: string;
    icon?: any;
}

const tabs: Tab[] = [
    { key: 1, name: 'Recent Interactions', icon: Activity },
    { key: 2, name: 'Add Interactions', icon: Plus },
];

interface Props {
    patient?: any;
    appointments?: any[];
    consultations?: any[];
    recentInteractions?: any[];
}

// Main Component
export default function Consultation({
    patient,
    consultations,
    recentInteractions,
}: Props) {
    const { props } = usePage<Props>();

    // Debug: Log available data
    console.log('Consultations:', consultations);
    console.log('Recent Interactions:', recentInteractions);

    // Extract patient ID from URL: /patients/consultations/23
    const pathSegments = window.location.pathname.split('/').filter(Boolean);
    const patientIdFromUrl = parseInt(pathSegments[pathSegments.length - 1]);

    // Use patient from props or ID from URL
    const patientId = patient?.id || patientIdFromUrl;

    const [activeTab, setActiveTab] = useState<number>(2);
    const [patientData, setPatientData] = useState(patient);

    // Use consultations as recent interactions if recentInteractions is not provided
    const interactions = recentInteractions || consultations || [];

    // Fetch patient data if not provided in props
    useEffect(() => {
        if (!patient && patientIdFromUrl) {
            const fetchPatient = async () => {
                try {
                    const response = await fetch(
                        `/api/patients/${patientIdFromUrl}`,
                    );
                    if (response.ok) {
                        const data = await response.json();
                        setPatientData(data.data || data);
                    }
                } catch (error) {
                    console.error('Error fetching patient:', error);
                }
            };
            fetchPatient();
        }
    }, [patientIdFromUrl, patient]);

    const handleConsultationSuccess = () => {
        router.reload();
    };

    // Get patient name for display
    const patientName = patientData
        ? `${patientData.first_name || ''} ${patientData.last_name || ''}`.trim()
        : 'Patient';

    const renderTabContent = () => {
        switch (activeTab) {
            case 1:
                return (
                    <div className="mt-4">
                        <div className="rounded-lg border bg-white p-6">
                            <div className="mb-4 flex items-center justify-between">
                                <h3 className="flex items-center gap-2 text-lg font-semibold">
                                    <Activity className="h-5 w-5 text-blue-600" />
                                    Recent Interactions
                                </h3>
                            </div>

                            <RecentInteractions
                                isAdmission={true}
                                data={interactions}
                                patientId={patientId}
                            />
                        </div>
                    </div>
                );

            case 2:
                return (
                    <div className="mt-4">
                        <div className="rounded-lg bg-white">
                            <ConsultationTabs
                                patientId={patientId}
                                onSuccess={handleConsultationSuccess}
                            />
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <PatientLayout
            patient={patientData}
            breadcrumbs={[
                { title: 'Patients', href: '/patients' },
                { title: patientName, href: `/patients/${patientId}` },
                { title: 'Consultations', href: '' },
            ]}
        >
            <div className="p-0">
                {/* Tabs */}
                <div className="border-b border-gray-200 bg-white px-4">
                    <div className="flex gap-2">
                        {tabs.map((item) => {
                            const Icon = item.icon;
                            return (
                                <Button
                                    key={item.key}
                                    className={`${
                                        activeTab === item.key
                                            ? 'rounded-none border-b-2 border-blue-500 text-blue-600'
                                            : 'border-b-2 border-transparent text-gray-500 hover:text-gray-700'
                                    } rounded-none bg-transparent px-4 py-3 text-sm font-medium hover:bg-gray-50`}
                                    variant="ghost"
                                    onClick={() => setActiveTab(item.key)}
                                >
                                    {Icon && <Icon className="mr-2 h-4 w-4" />}
                                    {item.name}
                                </Button>
                            );
                        })}
                    </div>
                </div>

                {/* Tab Content */}
                <div className="p-4">{renderTabContent()}</div>
            </div>
        </PatientLayout>
    );
}
