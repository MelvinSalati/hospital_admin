import { useState } from "react";
import { 
  Plus, Eye, CheckCircle, ArrowRight, Stethoscope, ToggleRightIcon,
  PillIcon, Scissors, MicroscopeIcon, ActivityIcon, X, AlertTriangle,
  Scan,
  ChevronLeft
} from "lucide-react";
import { format } from "date-fns";
import { router, usePage } from "@inertiajs/react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PatientLayout from "@/layouts/patients/PatientLayout";
import AdmissionModal from "./components/AdmissionModal";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

import DrugAdministrationTab from "./components/DrugAdministrationTab";
import VitalSignsTab from "./components/VitalSignsTab";
import LabOrders from "./components/LabOrders";
import Procedures from "./Procedures";
import ConsultationTabs from "./components/ConsultationTabs";
import RecentInteractions from "./components/RecentInteractions";
import NursingDiagnosis from "./components/NursingDiagnosis";
import { admissionAPI } from "@/services/api"; // Import admissionAPI instead of admission
import ImagingTab from "./components/ImagingTab";
import PageHeader from "@/components/PageHeader";

interface Admission {
  id: number;
  admission_number: string;
  admission_date: string;
  date_of_admission?: string;
  department?: string;
  bed?: string;
  discharge_date?: string | null;
  status?: 'active' | 'discharged';
  uuid?: string; // Add uuid if your API uses it
}

interface Props {
  doctorId: number;
  data?: Interaction[];
  isLoading?: boolean;
}

export default function Admissions() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTabItem, setActiveTabItem] = useState("admissions");
  const [activeConsultationTab, setActiveConsultationTab] = useState("recent-interactions");
  const [showDischargeModal, setShowDischargeModal] = useState(false);
  const [selectedAdmission, setSelectedAdmission] = useState<Admission | null>(null);
  const [isDischarging, setIsDischarging] = useState(false);
  const [dischargeError, setDischargeError] = useState<string | null>(null);
  
  const { imagingOrders, admissions: initialAdmissions, auth, prescriptions: prescribedDrugs, nursing_diagnosis: nursingDx, doctors: ListOfDoctors, interactions: recent } = usePage().props;
  
  const handleDiagnosisAdded = () => {
    router.reload({ only: ['interactions'] });
  };
  
  // Extract patientId
  const pathSegments = window.location.pathname.split('/').filter(Boolean);
  let patientId: number | undefined = undefined;
  if (pathSegments[0] === 'patients' && pathSegments[1] === 'admissions') {
    patientId = parseInt(pathSegments[2]);
  }

  // Check if there's an active admission (not discharged)
  const hasActiveAdmission = initialAdmissions && initialAdmissions.length > 0 && 
    initialAdmissions.some(
      (admission: Admission) => !admission.discharge_date && admission.status !== 'discharged'
    );

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
      // Use admissionAPI.discharge which expects (uuid, data)
      // If your API uses id instead of uuid, you might need to adjust
      const dischargeData = {
        discharge_date: new Date().toISOString(),
        discharged_by: auth.user.id,
        discharged_by_name: auth.user.name,
        diagnosis_on_discharge: "", // Add if needed
        discharge_notes: "Patient discharged", // Add if needed
      };
      
      // Use the correct API method - assuming your admission has a uuid field
      // If your admission uses 'id' instead of 'uuid', you may need to use updateDischarge or modify the API
      const response = await admissionAPI.discharge(selectedAdmission.uuid || String(selectedAdmission.id), dischargeData);
      
      // If the response is successful (your Http wrapper likely handles errors)
      // Close modal and reload data
      setShowDischargeModal(false);
      setSelectedAdmission(null);
      router.reload();
    } catch (error: any) {
      setDischargeError(error.message || 'An error occurred while discharging');
    } finally {
      setIsDischarging(false);
    }
  };

  const tabs = [
    { value: "admissions", label: "Admissions", icon: <Stethoscope className="w-4 h-4 mr-1" /> },
    { value: "firm", label: "Review Patient", icon: <Stethoscope className="w-4 h-4 mr-1" /> },
    { value: "vitals", label: "Vitals", icon: <ActivityIcon className="w-4 h-4 mr-1" /> },
    { value: "prescriptions", label: "Drug Administration", icon: <PillIcon className="w-4 h-4 mr-1" /> },
    { value: "lab-orders", label: "Lab Orders", icon: <MicroscopeIcon className="w-4 h-4 mr-1" /> },
    { value: "procedures", label: "Imaging", icon: <Scan className="w-4 h-4 mr-1" /> },
  ];

  const consultationTabs = [
    { value: "recent-interactions", label: "Recent Interactions", icon: <ActivityIcon className="w-4 h-4 mr-1" /> },
    { value: "add-interactions", label: "Add Interactions", icon: <Plus className="w-4 h-4 mr-1" /> },
    { value: "nursing", label: "Nursing", icon: <ActivityIcon className="w-4 h-4 mr-1" /> },
  ];

  const doctorId = auth.user.id;
 
  const  {admission_number}  = usePage().props;
  
  const renderConsultationTabItems = () => {
    switch (activeConsultationTab) {
      case "recent-interactions":
        return <div><RecentInteractions admissionNumber={admission_number} data={recent} patientId={patientId} onDiagnosisAdded={handleDiagnosisAdded} /></div>;
      case "add-interactions":
        return <div><ConsultationTabs admissionNumber={admission_number} patientId={patientId} doctorId={doctorId} interactions={recent} /></div>;
      case "nursing":
        return <div><NursingDiagnosis admissionNumber={admission_number} patientId={patientId} initialData={nursingDx} /> </div>;
      default:
        return null;
    }
  };

  const renderTabItems = () => {
    return (
      <>
        {/* Admissions */}
        {activeTabItem === "admissions" && (
          <div className="w-full mt-6">
            {initialAdmissions && initialAdmissions.length > 0 ? (
              <div className="bg-white rounded-lg shadow">
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
                    {initialAdmissions.map((admission: Admission) => {
                      const isDischarged = admission.discharge_date || admission.status === 'discharged';
                      return (
                        <TableRow key={admission.id}>
                          <TableCell>{admission.admission_number}</TableCell>
                          <TableCell>
                            {admission.date_of_admission
                              ? format(new Date(admission.date_of_admission), 'PPP')
                              : '-'}
                          </TableCell>
                          <TableCell>
                            {isDischarged ? (
                              <Badge className="bg-gray-50 text-gray-600">Discharged</Badge>
                            ) : (
                              <Badge className="bg-green-50 text-green-600">Active</Badge>
                            )}
                          </TableCell>
                          <TableCell>{admission.department || '-'}</TableCell>
                          <TableCell>{admission.bed || '-'}</TableCell>
                          <TableCell>
                            {!isDischarged && (
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => handleDischargeClick(admission)}
                              >
                                <ToggleRightIcon className="w-8 h-8 text-blue-600" />
                                Discharge
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="w-full mt-8 bg-gradient-to-r from-blue-50 to-blue-100 flex justify-center rounded-lg">
                <div className="py-10 text-center w-full">
                  <h1 className="text-gray-600 mb-4">No Admissions Found</h1>
                  <AdmissionModal
                    admittedById={auth.user.id}
                    doctorsList={ListOfDoctors}
                    patientId={patientId}
                    onSuccess={() => router.reload()}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Consultation */}
        {activeTabItem === "firm" && (
          <>
            <div className="flex gap-2">
              {consultationTabs.map(tab => (
                <Button
                  key={tab.value}
                  size="sm"
                  variant="ghost"
                  onClick={() => setActiveConsultationTab(tab.value)}
                  className={`flex items-center gap-1 rounded-none border-b-2 transition-all
                    ${activeConsultationTab === tab.value
                      ? "border-gray-600 text-gray-900 bg-transparent"
                      : "border-transparent text-gray-400 hover:text-gray-700"
                    }
                  `}
                >
                  {tab.icon}
                  {tab.label}
                </Button>
              ))}
            </div>

            <div className="w-full mt-6">
              {renderConsultationTabItems()}
            </div>
          </>
        )}

        {/* Other Tabs */}
        {activeTabItem === "vitals" && <VitalSignsTab   admissionNumber = {admission_number} patientId={patientId} />}
        {activeTabItem === "prescriptions" && (
          <DrugAdministrationTab
            admissionNumber = {admission_number}
            prescribedDrugs={prescribedDrugs}
            currentUser={auth.user.name}
            patientId={patientId}
          />
        )}
        {activeTabItem === "lab-orders" && <LabOrders   admissionNumber = {admission_number} patientId={patientId} initialOrders={[]} />}
        {activeTabItem === "procedures" && 
        // <ImagingTab admissionNumber = {admission_number} patientId={patientId} initialProcedures={[]} /> 
        // In admission.tsx, when using the ImagingTab component:
<ImagingTab 
 imaging={imagingOrders}
  admissionNumber={admission_number}
  patientId={patientId}
  initialImagingOrders={imagingOrders} 
  // Make sure this matches the prop name
/>
        }
      </>
    );
  };

  return (
    <PatientLayout breadcrumbs={[{ title: 'Patient', href: '' }, { title: 'Admission', href: '#' }]}>
      <div className="p-6">
        {/* Header */}
        <div className="flex  gap-2">
         <PageHeader title={"Admission"} subtitle="View current active admission"   backUrl={`../../patients/${patientId}`}/>
          {/* Only show Admit button if there's NO active admission */}
          {!hasActiveAdmission && (
            <AdmissionModal
              admittedById={auth.user.id}
              doctorsList={ListOfDoctors}
              patientId={patientId}
              onSuccess={() => router.reload()}
            />
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-3 mb-6">
          {tabs.map(tab => (
            <Button
              key={tab.value}
              variant={activeTabItem === tab.value ? "default" : "outline"}
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

      {/* Discharge Confirmation Modal with Blurred Background */}
      {showDischargeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Blurred backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !isDischarging && setShowDischargeModal(false)}
          />
          
          {/* Modal */}
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 z-10 animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-full">
                  <AlertTriangle className="w-6 h-6 text-yellow-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Confirm Discharge</h2>
              </div>
              <button
                onClick={() => !isDischarging && setShowDischargeModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                disabled={isDischarging}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Body */}
            <div className="p-6">
              <p className="text-gray-700 mb-4">
                Are you sure you want to discharge this patient?
              </p>
              
              {selectedAdmission && (
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Admission Number:</span>
                      <span className="font-medium text-gray-900">{selectedAdmission.admission_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Department:</span>
                      <span className="font-medium text-gray-900">{selectedAdmission.department || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Bed:</span>
                      <span className="font-medium text-gray-900">{selectedAdmission.bed || '-'}</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> This action will mark the patient as discharged and free up the bed for other patients. This process cannot be undone.
                </p>
              </div>
              
              {dischargeError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-red-800">{dischargeError}</p>
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="flex justify-end gap-3 p-6 border-t bg-gray-50 rounded-b-lg">
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
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isDischarging ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
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