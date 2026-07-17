import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Thermometer, 
  Heart, 
  Weight, 
  Wind, 
  TrendingUp, 
  TrendingDown,
  Minus,
  AlertCircle,
  CheckCircle,
  Plus,
  X,
  Save,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Http from '@/utils/Http';
import Notiflix from 'notiflix';
import { usePage } from '@inertiajs/react';

// Type definitions
interface VitalSignsRecord {
  id: number;
  vital_sign_uuid: string;
  patient_id: number;
  consultation_uuid: string | null;
  temperature: number | null;
  pulse: number | null;
  bp_systolic: number | null;
  bp_diastolic: number | null;
  oxygen_saturation: number | null;
  weight: number | null;
  notes: string | null;
  recorded_by: number;
  recorded_at: string;
  created_at: string;
  updated_at: string;
  recorder?: {
    id: number;
    name: string;
  };
}

interface VitalSignsProps {
  patientId: number;
  consultationUuid?: string;
  initialData?: VitalSignsRecord[];
}

// Helper function to determine status color and trend
const getTemperatureStatus = (temp: number | null): { color: string; trend: string; status: string } => {
  if (!temp) return { color: 'text-gray-400', trend: 'normal', status: 'No data' };
  if (temp > 38.0) return { color: 'text-red-600', trend: 'high', status: 'Fever' };
  if (temp < 36.0) return { color: 'text-blue-600', trend: 'low', status: 'Hypothermia' };
  return { color: 'text-green-600', trend: 'normal', status: 'Normal' };
};

const getPulseStatus = (pulse: number | null): { color: string; trend: string; status: string } => {
  if (!pulse) return { color: 'text-gray-400', trend: 'normal', status: 'No data' };
  if (pulse > 100) return { color: 'text-red-600', trend: 'high', status: 'Tachycardia' };
  if (pulse < 60) return { color: 'text-blue-600', trend: 'low', status: 'Bradycardia' };
  return { color: 'text-green-600', trend: 'normal', status: 'Normal' };
};

const getBPStatus = (systolic: number | null, diastolic: number | null): { color: string; trend: string; status: string } => {
  if (!systolic || !diastolic) return { color: 'text-gray-400', trend: 'normal', status: 'No data' };
  if (systolic >= 140 || diastolic >= 90) return { color: 'text-red-600', trend: 'high', status: 'Hypertension' };
  if (systolic <= 90 || diastolic <= 60) return { color: 'text-blue-600', trend: 'low', status: 'Hypotension' };
  return { color: 'text-green-600', trend: 'normal', status: 'Normal' };
};

const getO2Status = (o2: number | null): { color: string; trend: string; status: string } => {
  if (!o2) return { color: 'text-gray-400', trend: 'normal', status: 'No data' };
  if (o2 < 90) return { color: 'text-red-600', trend: 'critical', status: 'Critical' };
  if (o2 < 94) return { color: 'text-orange-500', trend: 'low', status: 'Low' };
  return { color: 'text-green-600', trend: 'normal', status: 'Normal' };
};

// Trend indicator component
const TrendIndicator = ({ current, previous }: { current: number | null; previous: number | null }) => {
  if (!current || !previous) return <Minus size={14} className="text-gray-400" />;
  if (current > previous) return <TrendingUp size={14} className="text-red-500" />;
  if (current < previous) return <TrendingDown size={14} className="text-green-500" />;
  return <Minus size={14} className="text-gray-400" />;
};

// Main Component
export default function VitalSignsTab({admissionNumber, patientId, consultationUuid, initialData = [] }: VitalSignsProps) {
  const [vitalSigns, setVitalSigns] = useState<VitalSignsRecord[]>(initialData);
  const [isLoading, setIsLoading] = useState(!initialData.length);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { props } = usePage();
  const authUser = (props as any).auth?.user;
  
  const [formData, setFormData] = useState({
    temperature: '',
    pulse: '',
    bp_systolic: '',
    bp_diastolic: '',
    oxygen_saturation: '',
    weight: '',
    notes: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch vital signs on component mount
  useEffect(() => {
    if (!initialData.length) {
      fetchVitalSigns();
    }
  }, [patientId]);

  const fetchVitalSigns = async () => {
    setIsLoading(true);
    try {
      const response = await Http.get(`vital-signs/patient/${patientId}`);
      if (response.data.status) {
        setVitalSigns(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching vital signs:', error);
      Notiflix.Notify.failure('Failed to load vital signs');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    // Validate temperature
    if (formData.temperature && (parseFloat(formData.temperature) < 34 || parseFloat(formData.temperature) > 42)) {
      newErrors.temperature = 'Temperature must be between 34°C and 42°C';
    }
    
    // Validate pulse
    if (formData.pulse && (parseInt(formData.pulse) < 30 || parseInt(formData.pulse) > 200)) {
      newErrors.pulse = 'Pulse must be between 30 and 200 bpm';
    }
    
    // Validate BP
    if (formData.bp_systolic && (parseInt(formData.bp_systolic) < 50 || parseInt(formData.bp_systolic) > 250)) {
      newErrors.bp_systolic = 'Systolic BP must be between 50 and 250 mmHg';
    }
    if (formData.bp_diastolic && (parseInt(formData.bp_diastolic) < 30 || parseInt(formData.bp_diastolic) > 150)) {
      newErrors.bp_diastolic = 'Diastolic BP must be between 30 and 150 mmHg';
    }
    
    // Validate O2 saturation
    if (formData.oxygen_saturation && (parseInt(formData.oxygen_saturation) < 50 || parseInt(formData.oxygen_saturation) > 100)) {
      newErrors.oxygen_saturation = 'Oxygen saturation must be between 50% and 100%';
    }
    
    // Validate weight
    if (formData.weight && (parseFloat(formData.weight) < 1 || parseFloat(formData.weight) > 300)) {
      newErrors.weight = 'Weight must be between 1 and 300 kg';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        patient_id: patientId,
        admission_number:admissionNumber,
        consultation_uuid: consultationUuid || null,
        temperature: formData.temperature ? parseFloat(formData.temperature) : null,
        pulse: formData.pulse ? parseInt(formData.pulse) : null,
        bp_systolic: formData.bp_systolic ? parseInt(formData.bp_systolic) : null,
        bp_diastolic: formData.bp_diastolic ? parseInt(formData.bp_diastolic) : null,
        oxygen_saturation: formData.oxygen_saturation ? parseInt(formData.oxygen_saturation) : null,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        notes: formData.notes || null,
        recorded_by: authUser?.id,
        recorded_at: new Date().toISOString()
      };

      const response = await Http.post('/patients/vital-signs', payload);

      if (response.data.status) {
        Notiflix.Notify.success('Vital signs recorded successfully!');
        closeModal();
        fetchVitalSigns();
      } else {
        Notiflix.Notify.failure(response.data.message || 'Failed to record vital signs');
      }
    } catch (error: any) {
      console.error('Error saving vital signs:', error);
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      }
      Notiflix.Notify.failure('Failed to save vital signs. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData({
      temperature: '',
      pulse: '',
      bp_systolic: '',
      bp_diastolic: '',
      oxygen_saturation: '',
      weight: '',
      notes: ''
    });
    setErrors({});
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-xl shadow-lg">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Vital Signs</h2>
            <p className="text-sm text-gray-500 mt-1">Patient vital signs monitoring history</p>
          </div>
          <Button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Record Vital Signs
          </Button>
        </div>

        {/* Vital Signs Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date/Time
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Temp (°C)
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pulse (bpm)
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  BP (mmHg)
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SpO₂ (%)
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Weight (kg)
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Recorded By
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {vitalSigns.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    No vital signs recorded. Click "Record Vital Signs" to add one.
                  </td>
                </tr>
              ) : (
                vitalSigns.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {formatDate(record.recorded_at)}
                    </td>
                    <td className={`px-4 py-3 text-sm font-medium ${getTemperatureStatus(record.temperature).color}`}>
                      {record.temperature || '—'}
                      {record.temperature && (
                        <TrendIndicator 
                          current={record.temperature} 
                          previous={vitalSigns[vitalSigns.indexOf(record) + 1]?.temperature || null}
                        />
                      )}
                    </td>
                    <td className={`px-4 py-3 text-sm font-medium ${getPulseStatus(record.pulse).color}`}>
                      {record.pulse || '—'}
                      {record.pulse && (
                        <TrendIndicator 
                          current={record.pulse} 
                          previous={vitalSigns[vitalSigns.indexOf(record) + 1]?.pulse || null}
                        />
                      )}
                    </td>
                    <td className={`px-4 py-3 text-sm font-medium ${getBPStatus(record.bp_systolic, record.bp_diastolic).color}`}>
                      {record.bp_systolic && record.bp_diastolic ? `${record.bp_systolic}/${record.bp_diastolic}` : '—'}
                    </td>
                    <td className={`px-4 py-3 text-sm font-medium ${getO2Status(record.oxygen_saturation).color}`}>
                      {record.oxygen_saturation || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {record.weight || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {record.recorder?.name || 'Unknown'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                      {record.notes || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Note */}
        <div className="border-t border-gray-200 px-6 py-4">
          <div className="text-center text-xs text-gray-400 flex items-center justify-center gap-2">
            <CheckCircle size={12} />
            <span>Regular monitoring recommended every 4 hours</span>
          </div>
        </div>
      </div>

      {/* Add Vital Signs Modal with Blurred Background */}
      {isModalOpen && (
        <>
          {/* Blurred Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={closeModal}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center sticky top-0 bg-white">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Activity className="h-5 w-5 text-blue-600" />
                  Record Vital Signs
                </h3>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Temperature */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Thermometer className="h-4 w-4 inline mr-1" />
                      Temperature (°C)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.temperature}
                      onChange={(e) => handleInputChange('temperature', e.target.value)}
                      className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.temperature ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="e.g., 37.5"
                    />
                    {errors.temperature && (
                      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.temperature}
                      </p>
                    )}
                  </div>

                  {/* Pulse */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Heart className="h-4 w-4 inline mr-1" />
                      Pulse (bpm)
                    </label>
                    <input
                      type="number"
                      value={formData.pulse}
                      onChange={(e) => handleInputChange('pulse', e.target.value)}
                      className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.pulse ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="e.g., 75"
                    />
                    {errors.pulse && (
                      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.pulse}
                      </p>
                    )}
                  </div>

                  {/* BP Systolic */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      BP - Systolic (mmHg)
                    </label>
                    <input
                      type="number"
                      value={formData.bp_systolic}
                      onChange={(e) => handleInputChange('bp_systolic', e.target.value)}
                      className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.bp_systolic ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="e.g., 120"
                    />
                    {errors.bp_systolic && (
                      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.bp_systolic}
                      </p>
                    )}
                  </div>

                  {/* BP Diastolic */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      BP - Diastolic (mmHg)
                    </label>
                    <input
                      type="number"
                      value={formData.bp_diastolic}
                      onChange={(e) => handleInputChange('bp_diastolic', e.target.value)}
                      className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.bp_diastolic ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="e.g., 80"
                    />
                    {errors.bp_diastolic && (
                      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.bp_diastolic}
                      </p>
                    )}
                  </div>

                  {/* Oxygen Saturation */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Wind className="h-4 w-4 inline mr-1" />
                      SpO₂ (%)
                    </label>
                    <input
                      type="number"
                      value={formData.oxygen_saturation}
                      onChange={(e) => handleInputChange('oxygen_saturation', e.target.value)}
                      className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.oxygen_saturation ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="e.g., 98"
                      min="0"
                      max="100"
                    />
                    {errors.oxygen_saturation && (
                      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.oxygen_saturation}
                      </p>
                    )}
                  </div>

                  {/* Weight */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Weight className="h-4 w-4 inline mr-1" />
                      Weight (kg)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.weight}
                      onChange={(e) => handleInputChange('weight', e.target.value)}
                      className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.weight ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="e.g., 68.5"
                    />
                    {errors.weight && (
                      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.weight}
                      </p>
                    )}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Clinical Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    rows={3}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Add any observations or clinical notes..."
                  />
                </div>
              </div>

              <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3 sticky bottom-0 bg-white">
                <Button variant="outline" onClick={closeModal}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Vital Signs
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}