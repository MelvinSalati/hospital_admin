import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Stethoscope,
  ClipboardList,
  Pill,
  Activity,
  Calendar,
  ChevronDown,
  ChevronUp,
  FileText,
  AlertCircle,
  PlusCircle,
  X
} from "lucide-react";
import React, { useState } from "react";
import Http from "@/utils/Http";
import Notiflix from "notiflix";

// Types based on your actual data structure
interface ChiefComplaint {
  symptom: string;
  severity: number;
  duration: string;
  onset?: string;
  characteristics?: string;
}

interface DrugHistoryItem {
  drugName: string;
  dosage?: string;
  frequency?: string;
  status?: string;
}

interface MedicalCondition {
  condition: string;
  diagnosedDate: string;
  status?: string;
  notes?: string | null;
}

interface PhysicalExam {
  system: string;
  finding: string;
  normal: boolean;
  description?: string;
}

interface Diagnosis {
  id?: number;
  diagnosis_uuid?: string;
  patient_id?: number;
  consultation_uuid?: string;
  diagnosis: string;
  icd10_code?: string;
  diagnosed_date: string;
  status: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

interface Interaction {
  id: number;
  consultation_uuid: string;
  chief_complaints: ChiefComplaint[];
  chief_complaints_summary: string;
  drug_history: DrugHistoryItem[];
  drug_history_summary: string;
  medical_conditions: MedicalCondition[];
  medical_conditions_summary: string;
  physical_exam: PhysicalExam[];
  has_chief_complaints: boolean;
  status: string;
  submitted_at: string;
  diagnoses?: Diagnosis[] | null;
}

interface Props {
  data?: Interaction[];
  isLoading?: boolean;
  patientId?: number;
  onViewDetails?: (consultationUuid: string) => void;
  onDiagnosisAdded?: () => void;
}


export default function RecentInteractions({
  isAdmission,
  admissionNumber=[],
  data: interactions = [],
  isLoading = false,
  patientId,
  onViewDetails,
  onDiagnosisAdded
}: Props) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [showDiagnosisModal, setShowDiagnosisModal] = useState(false);
  const [selectedConsultation, setSelectedConsultation] = useState<Interaction | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [diagnosisForm, setDiagnosisForm] = useState({
    diagnosis: "",
    icd10_code: "",
    diagnosed_date: new Date().toISOString().split('T')[0],
    notes: "",
    status: "active"
  });
 
  const toggleRow = (id: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      completed: "bg-green-100 text-green-800",
      pending: "bg-yellow-100 text-yellow-800",
      cancelled: "bg-red-100 text-red-800",
    };
    return variants[status] || "bg-gray-100 text-gray-800";
  };

  const getSeverityBadge = (severity: number) => {
    const colors = {
      1: "bg-green-100 text-green-800",
      2: "bg-blue-100 text-blue-800",
      3: "bg-yellow-100 text-yellow-800",
      4: "bg-orange-100 text-orange-800",
      5: "bg-red-100 text-red-800",
    };
    return colors[severity as keyof typeof colors] || colors[3];
  };

  const getDiagnosisStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      active: "bg-green-100 text-green-800",
      resolved: "bg-blue-100 text-blue-800",
      chronic: "bg-yellow-100 text-yellow-800",
      inactive: "bg-gray-100 text-gray-800",
    };
    return variants[status] || "bg-gray-100 text-gray-800";
  };

  const hasDiagnosis = (interaction: Interaction): boolean => {
    return interaction.diagnoses !== null && 
           interaction.diagnoses !== undefined && 
           Array.isArray(interaction.diagnoses) && 
           interaction.diagnoses.length > 0;
  };

  const handleAddDiagnosisClick = (interaction: Interaction) => {
    if (!patientId) {
      Notiflix.Notify.failure("Patient information is missing");
      return;
    }
    setSelectedConsultation(interaction);
    setShowDiagnosisModal(true);
    setDiagnosisForm({
      diagnosis: "",
      icd10_code: "",
      diagnosed_date: new Date().toISOString().split('T')[0],
      notes: "",
      status: "active"
    });
  };

const handleSubmitDiagnosis = async () => {
  // Validate diagnosis
  if (!diagnosisForm.diagnosis.trim()) {
    Notiflix.Notify.failure("Please enter a diagnosis");
    return;
  }

  // Validate required fields
  if (!selectedConsultation || !patientId) {
    Notiflix.Notify.failure("Missing consultation or patient information");
    return;
  }

  setIsSubmitting(true);
  
  try {
    const response = await Http.post(`/consultation/diagnosis/${selectedConsultation.consultation_uuid}`, {
      patient_id: patientId,
      admission_number: isAdmission ? admissionNumber : null,
      consultation_uuid: selectedConsultation.consultation_uuid,
      diagnosis: diagnosisForm.diagnosis,
      icd10_code: diagnosisForm.icd10_code || null,
      diagnosed_date: diagnosisForm.diagnosed_date,
      status: diagnosisForm.status,
      notes: diagnosisForm.notes || null,
    });

    // Check for successful response
    if (response.status === 201 || response.status === 200 || response.data?.status === true) {
      // Success
      Notiflix.Notify.success("Diagnosis added successfully");
      
      // Reset form
      setDiagnosisForm({
        diagnosis: '',
        icd10_code: '',
        diagnosed_date: new Date().toISOString().split('T')[0],
        status: 'active',
        notes: ''
      });
      
      // Close modal
      setShowDiagnosisModal(false);
      setSelectedConsultation(null);
      
      // Refresh data
      if (onDiagnosisAdded) {
        await onDiagnosisAdded(); // Consider awaiting if it's async
      }
      
    } else {
      // Handle unexpected response format
      throw new Error(response.data?.message || "Failed to add diagnosis");
    }
    
  } catch (error: any) {
    console.error("Error adding diagnosis:", error);
    
    // Handle different error types
    const errorMessage = error.response?.data?.message 
      || error.message 
      || "Failed to add diagnosis. Please try again.";
    
    Notiflix.Notify.failure(errorMessage);
    
  } finally {
    setIsSubmitting(false);
  }
};
  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/4"></div>
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-gray-100 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!interactions || interactions.length === 0) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No interactions recorded for this patient.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-semibold flex items-center gap-2">
                <ClipboardList className="w-5 h-5" />
                Patient Interactions
              </CardTitle>
              <CardDescription>
                Consultation history and clinical summaries
              </CardDescription>
            </div>
            <Badge variant="outline">{interactions.length} total</Badge>
          </div>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Chief Complaints</TableHead>
                <TableHead>Drug History</TableHead>
                <TableHead>Medical Hx</TableHead>
                <TableHead>Diagnosis</TableHead>
                <TableHead>Status</TableHead>
                {/* <TableHead className="text-right">Actions</TableHead> */}
              </TableRow>
            </TableHeader>
            <TableBody>
              {interactions.map((interaction) => (
                <React.Fragment key={interaction.id}>
                  <TableRow className="hover:bg-gray-50">
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleRow(interaction.id)}
                        className="h-8 w-8 p-0"
                      >
                        {expandedRows.has(interaction.id) ? 
                          <ChevronUp className="h-4 w-4" /> : 
                          <ChevronDown className="h-4 w-4" />
                        }
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-gray-400" />
                        <span className="text-sm">
                          {new Date(interaction.submitted_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(interaction.submitted_at).toLocaleTimeString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      {interaction.has_chief_complaints && interaction.chief_complaints_summary ? (
                        <div>
                          <Badge className="bg-blue-100 text-blue-800">
                            {interaction.chief_complaints?.length || 0} complaint(s)
                          </Badge>
                          <div className="text-sm mt-1 line-clamp-2">
                            {interaction.chief_complaints_summary}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">No complaints</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {interaction.drug_history_summary ? (
                        <div>
                          <Badge variant="outline" className="text-xs">
                            <Pill className="w-3 h-3 mr-1" />
                            Active
                          </Badge>
                          <div className="text-sm mt-1">
                            {interaction.drug_history_summary}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">None recorded</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {interaction.medical_conditions_summary ? (
                        <div>
                          <Badge variant="secondary" className="text-xs">
                            Chronic
                          </Badge>
                          <div className="text-sm mt-1">
                            {interaction.medical_conditions_summary}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">None</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {hasDiagnosis(interaction) ? (
                        <div>
                          <Badge className="bg-green-100 text-green-800">
                            {interaction.diagnoses?.length} Diagnosis(es)
                          </Badge>
                          <div className="text-sm mt-1">
                            {interaction.diagnoses?.[0]?.diagnosis}
                            {interaction.diagnoses && interaction.diagnoses.length > 1 && 
                              ` +${interaction.diagnoses.length - 1} more`
                            }
                          </div>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddDiagnosisClick(interaction)}
                          className="text-blue-600 border-blue-200 hover:bg-blue-50"
                        >
                          <PlusCircle className="w-3 h-3 mr-1" />
                          Add Diagnosis
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusBadge(interaction.status)}>
                        {interaction.status}
                      </Badge>
                    </TableCell>
                    {/* <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewDetails?.(interaction.consultation_uuid)}
                      >
                        View Details
                      </Button>
                    </TableCell> */}
                  </TableRow>

                  {/* Expanded Details Row */}
                  {expandedRows.has(interaction.id) && (
                    <TableRow className="bg-gray-50">
                      <TableCell colSpan={8} className="p-4">
                        <div className="space-y-4">
                          {hasDiagnosis(interaction) && interaction.diagnoses && (
                            <div>
                              <h4 className="font-semibold text-sm flex items-center gap-2 mb-2">
                                <Stethoscope className="w-4 h-4" />
                                Diagnoses
                              </h4>
                              <div className="grid gap-2 pl-6">
                                {interaction.diagnoses.map((diag, idx) => (
                                  <div key={diag.diagnosis_uuid || idx} className="text-sm border-l-2 border-green-200 pl-3">
                                    <div className="font-medium">{diag.diagnosis}</div>
                                    <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-600">
                                      {diag.icd10_code && <span>ICD-10: {diag.icd10_code}</span>}
                                      <span>Diagnosed: {new Date(diag.diagnosed_date).toLocaleDateString()}</span>
                                      {diag.status && (
                                        <Badge className={getDiagnosisStatusBadge(diag.status)}>
                                          {diag.status}
                                        </Badge>
                                      )}
                                    </div>
                                    {diag.notes && (
                                      <div className="text-xs text-gray-500 mt-2">
                                        Notes: {diag.notes}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {!hasDiagnosis(interaction) && (
                            <div>
                              <h4 className="font-semibold text-sm flex items-center gap-2 mb-2">
                                <Stethoscope className="w-4 h-4" />
                                Diagnosis
                              </h4>
                              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 text-center">
                                <p className="text-sm text-yellow-800 mb-2">
                                  No diagnosis has been added for this consultation.
                                </p>
                                <Button
                                  size="sm"
                                  onClick={() => handleAddDiagnosisClick(interaction)}
                                  className="bg-yellow-600 hover:bg-yellow-700"
                                >
                                  <PlusCircle className="w-3 h-3 mr-1" />
                                  Add Diagnosis Now
                                </Button>
                              </div>
                            </div>
                          )}

                          {/* Chief Complaints Details */}
                          {interaction.chief_complaints && interaction.chief_complaints.length > 0 && (
                            <div>
                              <h4 className="font-semibold text-sm flex items-center gap-2 mb-2">
                                <Activity className="w-4 h-4" />
                                Chief Complaints Details
                              </h4>
                              <div className="grid gap-2 pl-6">
                                {interaction.chief_complaints.map((complaint, idx) => (
                                  <div key={idx} className="text-sm border-l-2 border-blue-200 pl-3">
                                    <div className="font-medium">{complaint.symptom}</div>
                                    <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-600">
                                      <span>Severity: 
                                        <Badge className={`ml-1 ${getSeverityBadge(complaint.severity)}`}>
                                          {complaint.severity}/5
                                        </Badge>
                                      </span>
                                      <span>Duration: {complaint.duration}</span>
                                      {complaint.onset && <span>Onset: {complaint.onset}</span>}
                                    </div>
                                    {complaint.characteristics && (
                                      <div className="text-xs text-gray-500 mt-1">
                                        {complaint.characteristics}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Drug History Details */}
                          {interaction.drug_history && interaction.drug_history.length > 0 && (
                            <div>
                              <h4 className="font-semibold text-sm flex items-center gap-2 mb-2">
                                <Pill className="w-4 h-4" />
                                Medications
                              </h4>
                              <div className="grid gap-2 pl-6">
                                {interaction.drug_history.map((drug, idx) => (
                                  <div key={idx} className="text-sm border-l-2 border-green-200 pl-3">
                                    <div className="font-medium">{drug.drugName}</div>
                                    <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-600">
                                      {drug.dosage && <span>Dosage: {drug.dosage}</span>}
                                      {drug.frequency && <span>Frequency: {drug.frequency}</span>}
                                      {drug.status && (
                                        <Badge variant="outline" className="text-xs">
                                          {drug.status}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Medical Conditions Details */}
                          {interaction.medical_conditions && interaction.medical_conditions.length > 0 && (
                            <div>
                              <h4 className="font-semibold text-sm flex items-center gap-2 mb-2">
                                <FileText className="w-4 h-4" />
                                Medical Conditions
                              </h4>
                              <div className="grid gap-2 pl-6">
                                {interaction.medical_conditions.map((condition, idx) => (
                                  <div key={idx} className="text-sm border-l-2 border-purple-200 pl-3">
                                    <div className="font-medium">{condition.condition}</div>
                                    <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-600">
                                      <span>Diagnosed: {new Date(condition.diagnosedDate).toLocaleDateString()}</span>
                                      {condition.status && <span>Status: {condition.status}</span>}
                                    </div>
                                    {condition.notes && (
                                      <div className="text-xs text-gray-500 mt-1">
                                        Notes: {condition.notes}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Physical Exam Details */}
                          {interaction.physical_exam && interaction.physical_exam.length > 0 && (
                            <div>
                              <h4 className="font-semibold text-sm flex items-center gap-2 mb-2">
                                <Stethoscope className="w-4 h-4" />
                                Physical Examination
                              </h4>
                              <div className="grid gap-2 pl-6">
                                {interaction.physical_exam.map((exam, idx) => (
                                  <div key={idx} className="text-sm border-l-2 border-yellow-200 pl-3">
                                    <div className="font-medium">{exam.system}: {exam.finding}</div>
                                    <div className="flex gap-3 mt-1 text-xs text-gray-600">
                                      <Badge variant={exam.normal ? "outline" : "destructive"}>
                                        {exam.normal ? "Normal" : "Abnormal"}
                                      </Badge>
                                      {exam.description && <span>{exam.description}</span>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {(!interaction.chief_complaints?.length && 
                            !interaction.drug_history?.length && 
                            !interaction.medical_conditions?.length && 
                            !interaction.physical_exam?.length &&
                            !hasDiagnosis(interaction)) && (
                            <div className="text-center py-4 text-gray-500 text-sm">
                              No detailed clinical data available for this consultation
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Diagnosis Modal */}
      {showDiagnosisModal && selectedConsultation && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={() => setShowDiagnosisModal(false)}
          />
          
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                <h2 className="text-xl font-semibold">Add Diagnosis</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDiagnosisModal(false)}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="bg-gray-50 p-3 rounded-md text-sm">
                  <p className="font-medium text-gray-700">Consultation Details:</p>
                  <p className="text-gray-600 mt-1">
                    Date: {new Date(selectedConsultation.submitted_at).toLocaleDateString()}
                  </p>
                  {selectedConsultation.chief_complaints_summary && (
                    <p className="text-gray-600 mt-1">
                      Chief Complaints: {selectedConsultation.chief_complaints_summary}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Diagnosis *
                  </label>
                  <input
                    type="text"
                    value={diagnosisForm.diagnosis}
                    onChange={(e) => setDiagnosisForm({...diagnosisForm, diagnosis: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Hypertension, Type 2 Diabetes Mellitus"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ICD-10 Code (Optional)
                  </label>
                  <input
                    type="text"
                    value={diagnosisForm.icd10_code}
                    onChange={(e) => setDiagnosisForm({...diagnosisForm, icd10_code: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., I10, E11.9"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Diagnosed Date *
                  </label>
                  <input
                    type="date"
                    value={diagnosisForm.diagnosed_date}
                    onChange={(e) => setDiagnosisForm({...diagnosisForm, diagnosed_date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={diagnosisForm.status}
                    onChange={(e) => setDiagnosisForm({...diagnosisForm, status: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="active">Active</option>
                    <option value="resolved">Resolved</option>
                    <option value="chronic">Chronic</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Clinical Notes (Optional)
                  </label>
                  <textarea
                    value={diagnosisForm.notes}
                    onChange={(e) => setDiagnosisForm({...diagnosisForm, notes: e.target.value})}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Add any relevant clinical notes, observations, or treatment plan..."
                  />
                </div>
              </div>

              <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowDiagnosisModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitDiagnosis}
                  disabled={isSubmitting || !diagnosisForm.diagnosis.trim()}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isSubmitting ? "Adding..." : "Add Diagnosis"}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}