import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Plus, X, Calendar, Clock, MapPin, Shield, FileText, ClipboardList, User, Stethoscope } from "lucide-react";
import Notiflix from 'notiflix';
import Http from '@/utils/Http';

interface AdmissionFormData {
    patient_id: string;
    doctor_id: string;
    date_of_admission: string;
    time_of_admission: string;
    diagnosis_on_admission: string;
    priority: string;
    admitted_to_ward: string;
    condition_on_admission: string;
    admission_notes: string;
}

interface Doctor {
    id: number;
    name: string;
    email?: string;
    specialization?: string;
}

interface AdmissionModalProps {
    admittedById: number;
    doctorsList: Doctor[];
    patientId?: number; // Optional if you have patient ID from context/URL
    onSuccess?: () => void;
}

const PRIORITY_CONFIG = {
    LOW: { label: "Low", color: "text-slate-500", bg: "bg-slate-50 border-slate-200" },
    NORMAL: { label: "Normal", color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
    HIGH: { label: "High", color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
    URGENT: { label: "Urgent", color: "text-orange-600", bg: "bg-orange-50 border-orange-200" },
    EMERGENCY: { label: "Emergency", color: "text-red-600", bg: "bg-red-50 border-red-200" },
} as const;

export default function AdmissionModal({ admittedById,  patientId,doctorsList, onSuccess }: AdmissionModalProps) {
   
console.log("Doctors List:", patientId); // Debugging line to check doctors data
    const now = new Date();
    const todayISO = now.toISOString().split('T')[0];
    const timeNow = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });

    const [admissionFormData, setAdmissionFormData] = useState<AdmissionFormData>({
        patient_id: patientId,
        doctor_id: "",
        date_of_admission: todayISO,
        time_of_admission: timeNow,
        diagnosis_on_admission: "",
        priority: "NORMAL",
        admitted_to_ward: "",
        condition_on_admission: "",
        admission_notes: "",
    });
    
    const [showModal, setShowModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setAdmissionFormData((prevData) => ({
            ...prevData,
            [name]: value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validation
        if (!admissionFormData.patient_id) {
            Notiflix.Notify.warning('Please enter Patient ID');
            return;
        }
        
        if (!admissionFormData.doctor_id) {
            Notiflix.Notify.warning('Please select a doctor');
            return;
        }
        
        setIsSubmitting(true);
        setError(null);
        
        try {
            // Generate UUID for admission_uuid
            const admissionUuid = crypto.randomUUID ? crypto.randomUUID() : 
                `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            
            const payload = {
                admission_uuid: admissionUuid,
                patient_id: parseInt(admissionFormData.patient_id),
                doctor_id: parseInt(admissionFormData.doctor_id),
                admitted_by: admittedById,
                date_of_admission: admissionFormData.date_of_admission,
                time_of_admission: admissionFormData.time_of_admission,
                diagnosis_on_admission: admissionFormData.diagnosis_on_admission || null,
                priority: admissionFormData.priority,
                admitted_to_ward: admissionFormData.admitted_to_ward || null,
                condition_on_admission: admissionFormData.condition_on_admission || null,
                admission_notes: admissionFormData.admission_notes || null,
                diagnosis_on_discharge: null, // Will be set on discharge
            };
            
            const response = await Http.post('/admissions', payload);
            Notiflix.Notify.success(response.data.message || 'Admission created successfully');
                setShowModal(false);
                resetForm();
                onSuccess?.(); 
            if (response.data.status) {
               
            } else {
                Notiflix.Notify.failure(response.data.message || 'Failed to create admission');
            }
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || err.message || "Something went wrong. Please try again.";
            setError(errorMessage);
            Notiflix.Notify.failure(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setAdmissionFormData({
            patient_id: patientId?.toString() || "",
            doctor_id: "",
            date_of_admission: todayISO,
            time_of_admission: timeNow,
            diagnosis_on_admission: "",
            priority: "NORMAL",
            admitted_to_ward: "",
            condition_on_admission: "",
            admission_notes: "",
        });
        setError(null);
    };

    const handleClose = () => {
        setShowModal(false);
        resetForm();
    };

    const selectedPriority = PRIORITY_CONFIG[admissionFormData.priority as keyof typeof PRIORITY_CONFIG];

    return (
        <>
            <Button onClick={() => setShowModal(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Create Admission
            </Button>

            {showModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ backgroundColor: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)" }}
                >
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">Create New Admission</h2>
                                <p className="text-xs text-gray-400 mt-0.5">Fill in the admission details below</p>
                            </div>
                            <button
                                onClick={handleClose}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Info Banner */}
                       

                        {/* Form Body */}
                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                            {/* Patient ID and Doctor Selection */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <input
                                        type="hidden"
                                        name="patient_id"
                                        value={admissionFormData.patient_id}
                                        onChange={handleInputChange}
                                        required
                                        placeholder="Enter patient ID"
                                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                                        <Stethoscope className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
                                        Doctor <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        name="doctor_id"
                                        value={admissionFormData.doctor_id}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                    >
                                        <option value="">Select Doctor</option>
                                        {doctorsList && doctorsList.map((doctor) => (
                                            <option key={doctor.id} value={doctor.id}>
                                                {doctor.first_name} {doctor.surname}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Date, Time, Ward, Priority */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                                        <Calendar className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
                                        Date of Admission <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        name="date_of_admission"
                                        value={admissionFormData.date_of_admission}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                                        <Clock className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
                                        Time of Admission <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="time"
                                        name="time_of_admission"
                                        value={admissionFormData.time_of_admission}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                                        <MapPin className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
                                        Admitted To Ward
                                    </label>
                                    <input
                                        type="text"
                                        name="admitted_to_ward"
                                        value={admissionFormData.admitted_to_ward}
                                        onChange={handleInputChange}
                                        placeholder="e.g., Ward 3B, ICU"
                                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                                        <Shield className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
                                        Priority
                                    </label>
                                    <select
                                        name="priority"
                                        value={admissionFormData.priority}
                                        onChange={handleInputChange}
                                        className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition font-medium ${selectedPriority.color} ${selectedPriority.bg}`}
                                    >
                                        {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                                            <option key={key} value={key} className={config.color}>
                                                {config.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Diagnosis on Admission */}
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                                    <FileText className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
                                    Diagnosis on Admission
                                </label>
                                <textarea
                                    name="diagnosis_on_admission"
                                    value={admissionFormData.diagnosis_on_admission}
                                    onChange={handleInputChange}
                                    rows={2}
                                    placeholder="Initial diagnosis..."
                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
                                />
                            </div>

                            {/* Condition on Admission */}
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                                    <ClipboardList className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
                                    Condition on Admission
                                </label>
                                <textarea
                                    name="condition_on_admission"
                                    value={admissionFormData.condition_on_admission}
                                    onChange={handleInputChange}
                                    rows={2}
                                    placeholder="Patient's presenting condition, vitals, symptoms..."
                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
                                />
                            </div>

                            {/* Admission Notes */}
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                                    Admission Notes
                                </label>
                                <textarea
                                    name="admission_notes"
                                    value={admissionFormData.admission_notes}
                                    onChange={handleInputChange}
                                    rows={3}
                                    placeholder="Additional notes, allergies, special instructions..."
                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
                                />
                            </div>

                            {/* Note */}
                            <div className="text-xs text-gray-400 flex items-center gap-1.5 pt-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-gray-300 inline-block"></span>
                                Diagnosis on discharge will be recorded during patient checkout
                            </div>

                            {/* Error Message */}
                            {error && (
                                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                                    {error}
                                </div>
                            )}
                        </form>

                        {/* Footer */}
                        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
                            <Button type="button" variant="outline" onClick={handleClose} className="text-sm">
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="text-sm min-w-[140px]"
                            >
                                {isSubmitting ? (
                                    <span className="flex items-center gap-2">
                                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                                        </svg>
                                        Creating...
                                    </span>
                                ) : "Create Admission"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}