import { useState, useEffect, Fragment } from 'react';
import { Button } from '@/components/ui/button';
import {
  Plus, Edit, Trash2, Eye, CheckCircle, X, Loader2,
  AlertCircle, ChevronDown, ChevronRight, Stethoscope,
  Activity, Target, Calendar, User, Clock, Save as SaveIcon,
  FileText, ClipboardList
} from 'lucide-react';
import { usePage } from '@inertiajs/react';
import Http from '@/utils/Http';
import routes from '@/constants/routes';
import Notiflix from 'notiflix';

interface NursingDiagnosis {
  id: number;
  nursing_diagnosis_uuid: string;
  created_by: number | null;
  patient_id: number;
  admission_number: string | null;
  problem: string;
  etiology: string;
  symptoms: string;
  intervention: string;
  evaluation: string | null;
  date_identified: string;
  status: 'active' | 'in-progress' | 'resolved' | 'inactive' | 'waiting...';
  updated_by: number | null;
  is_smart: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  creator?: {
    id: number;
    name: string;
  };
  updater?: {
    id: number;
    name: string;
  };
}

interface NursingDiagnosisFormData {
  problem: string;
  etiology: string;
  symptoms: string;
  intervention: string;
  evaluation: string;
  date_identified: string;
  status: string;
}

interface NursingDiagnosisProps {
  patientId: string | number;
  initialData?: NursingDiagnosis[];
}

export default function NursingDiagnosis({ patientId, initialData = [] }: NursingDiagnosisProps) {
  const [diagnoses, setDiagnoses] = useState<NursingDiagnosis[]>(initialData);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedDiagnosis, setSelectedDiagnosis] = useState<NursingDiagnosis | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [evaluationModalOpen, setEvaluationModalOpen] = useState(false);
  const [evaluationText, setEvaluationText] = useState('');
  const [formData, setFormData] = useState<NursingDiagnosisFormData>({
    problem: '',
    etiology: '',
    symptoms: '',
    intervention: '',
    evaluation: '',
    date_identified: new Date().toISOString().split('T')[0],
    status: 'active'
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { props } = usePage();
  const authUser = (props as any).auth?.user;

  useEffect(() => {
    if (!initialData.length) {
      fetchDiagnoses();
    }
  }, [patientId]);

  const fetchDiagnoses = async () => {
    try {
      const response = await Http.get(routes.api.nursingDiagnosis.index.replace('{patientId}', patientId.toString()));
      if (response.data.status) {
        setDiagnoses(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching diagnoses:', error);
      Notiflix.Notify.failure('Failed to load nursing diagnoses');
    }
  };

  const handleInputChange = (field: keyof NursingDiagnosisFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.problem?.trim()) {
      newErrors.problem = 'Problem is required';
    }
    if (!formData.etiology?.trim()) {
      newErrors.etiology = 'Etiology is required';
    }
    if (!formData.intervention?.trim()) {
      newErrors.intervention = 'Intervention is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      let response;

      if (isEditMode && selectedDiagnosis) {
        const updatePayload = {
          problem: formData.problem,
          etiology: formData.etiology,
          symptoms: formData.symptoms || 'none',
          intervention: formData.intervention,
          evaluation: formData.evaluation || 'waiting...',
          date_identified: formData.date_identified,
          status: formData.status,
        };

        response = await Http.put(
          routes.api.nursingDiagnosis.update
            .replace('{patientId}', patientId.toString())
            .replace('{id}', selectedDiagnosis.id.toString()),
          JSON.stringify(updatePayload)
        );
      } else {
        const createPayload = {
          problem: formData.problem,
          etiology: formData.etiology,
          symptoms: formData.symptoms || 'none',
          intervention: formData.intervention,
          evaluation: formData.evaluation || 'waiting...',
          date_identified: formData.date_identified,
          status: formData.status,
          user_id: authUser?.id,
          is_smart: false
        };

        response = await Http.post(
          routes.api.nursingDiagnosis.create.replace('{patientId}', patientId.toString()),
          JSON.stringify(createPayload)
        );
      }

      if (response.data.status) {
        Notiflix.Notify.success(isEditMode ? 'Diagnosis updated successfully!' : 'Diagnosis created successfully!');
        closeModal();
        fetchDiagnoses();
      } else {
        Notiflix.Notify.failure(response.data.message || 'Operation failed');
      }
    } catch (error: any) {
      console.error('Error saving diagnosis:', error);
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      }
      Notiflix.Notify.failure(error.response?.data?.message || 'Failed to save diagnosis');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEvaluate = async (diagnosis: NursingDiagnosis) => {
    if (!evaluationText.trim()) {
      Notiflix.Notify.warning('Please enter evaluation notes');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await Http.put(
        routes.api.nursingDiagnosis.evaluate
          .replace('{patientId}', patientId.toString())
          .replace('{id}', diagnosis.id.toString()),
        JSON.stringify({ evaluation: evaluationText })
      );

      if (response.data.status) {
        Notiflix.Notify.success('Evaluation updated successfully!');
        setEvaluationModalOpen(false);
        setEvaluationText('');
        fetchDiagnoses();
      } else {
        Notiflix.Notify.failure('Failed to update evaluation');
      }
    } catch (error: any) {
      console.error('Error updating evaluation:', error);
      Notiflix.Notify.failure(error.response?.data?.message || 'Failed to update evaluation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (diagnosis: NursingDiagnosis, newStatus: string) => {
    setIsSubmitting(true);
    try {
      const response = await Http.put(
        routes.api.nursingDiagnosis.update
          .replace('{patientId}', patientId.toString())
          .replace('{id}', diagnosis.id.toString()),
        JSON.stringify({ status: newStatus })
      );

      if (response.data.status) {
        Notiflix.Notify.success(`Status updated to ${newStatus}`);
        fetchDiagnoses();
      } else {
        Notiflix.Notify.failure('Failed to update status');
      }
    } catch (error: any) {
      console.error('Error updating status:', error);
      Notiflix.Notify.failure(error.response?.data?.message || 'Failed to update status');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    Notiflix.Confirm.show(
      'Delete Nursing Diagnosis',
      'Are you sure you want to delete this nursing diagnosis? This action cannot be undone.',
      'Delete',
      'Cancel',
      async () => {
        try {
          const response = await Http.delete(
            routes.api.nursingDiagnosis.delete
              .replace('{patientId}', patientId.toString())
              .replace('{id}', id.toString())
          );

          if (response.data.status) {
            Notiflix.Notify.success('Diagnosis deleted successfully!');
            fetchDiagnoses();
          } else {
            Notiflix.Notify.failure('Failed to delete diagnosis');
          }
        } catch (error) {
          console.error('Error deleting diagnosis:', error);
          Notiflix.Notify.failure('Failed to delete diagnosis');
        }
      },
      {
        titleColor: '#dc2626',
        okButtonBackground: '#dc2626',
        borderRadius: '8px',
        okButtonText: 'Delete',
        cancelButtonText: 'Cancel'
      }
    );
  };

  const openCreateModal = () => {
    setIsEditMode(false);
    setSelectedDiagnosis(null);
    setFormData({
      problem: '',
      etiology: '',
      symptoms: '',
      intervention: '',
      evaluation: '',
      date_identified: new Date().toISOString().split('T')[0],
      status: 'active'
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (diagnosis: NursingDiagnosis) => {
    setIsEditMode(true);
    setSelectedDiagnosis(diagnosis);
    setFormData({
      problem: diagnosis.problem || '',
      etiology: diagnosis.etiology || '',
      symptoms: diagnosis.symptoms || '',
      intervention: diagnosis.intervention || '',
      evaluation: diagnosis.evaluation || '',
      date_identified: diagnosis.date_identified?.split('T')[0] || new Date().toISOString().split('T')[0],
      status: diagnosis.status || 'active'
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const openViewModal = (diagnosis: NursingDiagnosis) => {
    setSelectedDiagnosis(diagnosis);
    setViewModalOpen(true);
  };

  const openEvaluationModal = (diagnosis: NursingDiagnosis) => {
    setSelectedDiagnosis(diagnosis);
    setEvaluationText(diagnosis.evaluation || '');
    setEvaluationModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setViewModalOpen(false);
    setEvaluationModalOpen(false);
    setSelectedDiagnosis(null);
    setEvaluationText('');
  };

  const toggleRowExpand = (id: number) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; label: string }> = {
      active: { color: 'bg-yellow-100 text-yellow-800', label: 'Active' },
      'in-progress': { color: 'bg-blue-100 text-blue-800', label: 'In Progress' },
      resolved: { color: 'bg-green-100 text-green-800', label: 'Resolved' },
      'waiting...': { color: 'bg-gray-100 text-gray-800', label: 'Waiting' },
      inactive: { color: 'bg-red-100 text-red-800', label: 'Inactive' }
    };
    const config = statusConfig[status] || statusConfig.active;
    return <span className={`px-2 py-1 text-xs rounded-full ${config.color}`}>{config.label}</span>;
  };

  return (
    <div className="bg-white rounded-xl shadow-lg">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Nursing Diagnosis</h2>
          <p className="text-sm text-gray-500 mt-1">Document patient problems, interventions, and evaluations</p>
        </div>
        <Button onClick={openCreateModal} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Add Nursing Diagnosis
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="w-10 px-4 py-3"></th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Problem
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Etiology
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Intervention
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {diagnoses.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  No nursing diagnoses found. Click "Add Nursing Diagnosis" to create one.
                </td>
              </tr>
            ) : (
              diagnoses.map((diagnosis) => (
                <Fragment key={diagnosis.id}>
                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleRowExpand(diagnosis.id)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {expandedRows.has(diagnosis.id) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900 line-clamp-2">
                        {diagnosis.problem || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-600 line-clamp-2">
                        {diagnosis.etiology || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-600 line-clamp-2">
                        {diagnosis.intervention || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(diagnosis.status)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-500">
                        {diagnosis.date_identified ? new Date(diagnosis.date_identified).toLocaleDateString() : '-'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openViewModal(diagnosis)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(diagnosis)}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openEvaluationModal(diagnosis)}
                          className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Evaluate"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(diagnosis.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Expanded Row */}
                  {expandedRows.has(diagnosis.id) && (
                    <tr className="bg-gray-50">
                      <td colSpan={7} className="px-4 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-white rounded-lg p-4 border border-gray-200">
                            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 border-b pb-2">
                              <Stethoscope className="h-4 w-4 text-red-600" />
                              Problem
                            </h4>
                            <p className="text-sm text-gray-700">{diagnosis.problem || '-'}</p>
                          </div>
                          <div className="bg-white rounded-lg p-4 border border-gray-200">
                            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 border-b pb-2">
                              <AlertCircle className="h-4 w-4 text-orange-600" />
                              Etiology
                            </h4>
                            <p className="text-sm text-gray-700">{diagnosis.etiology || '-'}</p>
                          </div>
                          <div className="bg-white rounded-lg p-4 border border-gray-200">
                            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 border-b pb-2">
                              <ClipboardList className="h-4 w-4 text-purple-600" />
                              Symptoms
                            </h4>
                            <p className="text-sm text-gray-700">{diagnosis.symptoms || '-'}</p>
                          </div>
                          <div className="bg-white rounded-lg p-4 border border-gray-200">
                            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 border-b pb-2">
                              <Target className="h-4 w-4 text-blue-600" />
                              Intervention
                            </h4>
                            <p className="text-sm text-gray-700">{diagnosis.intervention || '-'}</p>
                          </div>
                          {diagnosis.evaluation && diagnosis.evaluation !== 'waiting...' && (
                            <div className="bg-white rounded-lg p-4 border border-gray-200 md:col-span-2">
                              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 border-b pb-2">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                Evaluation
                              </h4>
                              <p className="text-sm text-gray-700">{diagnosis.evaluation}</p>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={closeModal} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-[700px] max-h-[90vh] overflow-y-auto">
              <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center sticky top-0 bg-white">
                <h3 className="text-xl font-semibold">
                  {isEditMode ? 'Edit Nursing Diagnosis' : 'Add New Nursing Diagnosis'}
                </h3>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Problem <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={formData.problem}
                      onChange={(e) => handleInputChange('problem', e.target.value)}
                      rows={2}
                      className={`w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 ${
                        errors.problem ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.problem && <p className="text-sm text-red-500 mt-1">{errors.problem}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date Identified
                    </label>
                    <input
                      type="date"
                      value={formData.date_identified}
                      onChange={(e) => handleInputChange('date_identified', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Etiology <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.etiology}
                    onChange={(e) => handleInputChange('etiology', e.target.value)}
                    rows={2}
                    className={`w-full border rounded-md px-3 py-2 ${
                      errors.etiology ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.etiology && <p className="text-sm text-red-500 mt-1">{errors.etiology}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Symptoms
                  </label>
                  <textarea
                    value={formData.symptoms}
                    onChange={(e) => handleInputChange('symptoms', e.target.value)}
                    rows={2}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="e.g., As evidenced by shortness of breath, oxygen saturation 88%"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Intervention <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.intervention}
                    onChange={(e) => handleInputChange('intervention', e.target.value)}
                    rows={3}
                    className={`w-full border rounded-md px-3 py-2 ${
                      errors.intervention ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="List nursing interventions..."
                  />
                  {errors.intervention && <p className="text-sm text-red-500 mt-1">{errors.intervention}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="active">Active</option>
                    <option value="in-progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="waiting...">Waiting</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Initial Evaluation (Optional)
                  </label>
                  <textarea
                    value={formData.evaluation}
                    onChange={(e) => handleInputChange('evaluation', e.target.value)}
                    rows={2}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
              </div>

              <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
                <Button variant="outline" onClick={closeModal}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-blue-600">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <SaveIcon className="h-4 w-4" />}
                  {isSubmitting ? 'Saving...' : (isEditMode ? 'Update' : 'Save')}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* View Modal */}
      {viewModalOpen && selectedDiagnosis && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={closeModal} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-[700px] max-h-[90vh] overflow-y-auto">
              <div className="border-b p-4 flex justify-between">
                <h3 className="text-xl font-semibold">Diagnosis Details</h3>
                <button onClick={closeModal}><X className="h-5 w-5" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="font-medium">Problem:</label><p>{selectedDiagnosis.problem}</p></div>
                  <div><label className="font-medium">Etiology:</label><p>{selectedDiagnosis.etiology}</p></div>
                  <div><label className="font-medium">Symptoms:</label><p>{selectedDiagnosis.symptoms || '-'}</p></div>
                  <div><label className="font-medium">Status:</label><p>{getStatusBadge(selectedDiagnosis.status)}</p></div>
                  <div className="col-span-2"><label className="font-medium">Intervention:</label><p>{selectedDiagnosis.intervention || '-'}</p></div>
                  {selectedDiagnosis.evaluation && selectedDiagnosis.evaluation !== 'waiting...' && (
                    <div className="col-span-2"><label className="font-medium">Evaluation:</label><p>{selectedDiagnosis.evaluation}</p></div>
                  )}
                </div>
              </div>
              <div className="border-t p-4 flex justify-end">
                <Button onClick={closeModal}>Close</Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Evaluation Modal */}
      {evaluationModalOpen && selectedDiagnosis && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={closeModal} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-[500px]">
              <div className="border-b p-4 flex justify-between">
                <h3 className="text-xl font-semibold">Add Evaluation</h3>
                <button onClick={closeModal}><X className="h-5 w-5" /></button>
              </div>
              <div className="p-6">
                <div className="bg-gray-50 p-3 rounded mb-4">
                  <p className="font-medium">Problem:</p>
                  <p className="text-sm">{selectedDiagnosis.problem}</p>
                </div>
                <textarea
                  value={evaluationText}
                  onChange={(e) => setEvaluationText(e.target.value)}
                  rows={5}
                  className="w-full border rounded-md p-3"
                  placeholder="Document outcome of interventions..."
                />
              </div>
              <div className="border-t p-4 flex justify-end gap-3">
                <Button variant="outline" onClick={closeModal}>Cancel</Button>
                <Button onClick={() => handleEvaluate(selectedDiagnosis)} disabled={isSubmitting} className="bg-purple-600">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                  Save Evaluation
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
