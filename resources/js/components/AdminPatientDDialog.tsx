import { useState } from 'react';
import { useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon, Loader2, UserPlus } from 'lucide-react';
import Notiflix from 'notiflix';
import Http from '@/utils/Http';
import routes from '@/constants/routes';

interface AdmitPatientFormData {
  patient_id: string;
  admission_date: Date;
  admission_time: string;
  ward: string;
  bed_number: string;
  admitting_diagnosis: string;
  attending_doctor: string;
  package_name: string;
  insurance_provider: string;
  policy_number: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  notes: string;
}

interface AdmitPatientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const defaultFormValues: AdmitPatientFormData = {
  patient_id: '',
  admission_date: new Date(),
  admission_time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  ward: '',
  bed_number: '',
  admitting_diagnosis: '',
  attending_doctor: '',
  package_name: '',
  insurance_provider: '',
  policy_number: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  notes: '',
};

const patients = [
  { id: 'P00001', name: 'John Doe', age: 45, gender: 'Male', blood_group: 'O+' },
  { id: 'P00002', name: 'Jane Smith', age: 32, gender: 'Female', blood_group: 'A+' },
  { id: 'P00003', name: 'Robert Johnson', age: 58, gender: 'Male', blood_group: 'B+' },
  { id: 'P00004', name: 'Mary Davis', age: 28, gender: 'Female', blood_group: 'AB-' },
  { id: 'P00005', name: 'William Brown', age: 62, gender: 'Male', blood_group: 'O-' },
];

const wards = [
  { id: 'ICU', name: 'ICU', beds: 15, available: 3 },
  { id: 'CCU', name: 'CCU', beds: 10, available: 2 },
  { id: 'General Ward', name: 'General Ward', beds: 50, available: 12 },
  { id: 'Maternity', name: 'Maternity Ward', beds: 20, available: 5 },
  { id: 'Surgical Ward', name: 'Surgical Ward', beds: 25, available: 6 },
];

const doctors = [
  { id: 'dr_smith', name: 'Dr. Sarah Smith', specialty: 'Cardiology' },
  { id: 'dr_johnson', name: 'Dr. Michael Johnson', specialty: 'Internal Medicine' },
  { id: 'dr_williams', name: 'Dr. Emily Williams', specialty: 'General Surgery' },
  { id: 'dr_brown', name: 'Dr. James Brown', specialty: 'Pulmonology' },
];

const packages = [
  { id: 'basic', name: 'Basic Care', price: '₹500/day' },
  { id: 'standard', name: 'Standard Care', price: '₹1000/day' },
  { id: 'premium', name: 'Premium Care', price: '₹2000/day' },
  { id: 'cardiac', name: 'Cardiac Care Package', price: '₹3000/day' },
  { id: 'maternity', name: 'Maternity Package', price: '₹2500/day' },
];

export function AdmitPatientDialog({ open, onOpenChange, onSuccess }: AdmitPatientDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [availableBeds, setAvailableBeds] = useState(0);

  const { data, setData, errors, clearErrors, reset } = useForm<AdmitPatientFormData>(defaultFormValues);

  const resetForm = () => {
    reset(defaultFormValues);
    setSelectedPatient(null);
    setAvailableBeds(0);
    clearErrors();
  };

  const handleWardChange = (wardId: string) => {
    const selectedWard = wards.find(w => w.id === wardId);
    setData('ward', wardId);
    setAvailableBeds(selectedWard?.available || 0);
  };

  const handlePatientSelect = (patientId: string) => {
    const patient = patients.find(p => p.id === patientId);
    setSelectedPatient(patient || null);
    setData('patient_id', patientId);
  };

  const handleSubmit = async () => {
    if (!data.patient_id) {
      Notiflix.Notify.warning('Please select a patient');
      return;
    }
    if (!data.ward) {
      Notiflix.Notify.warning('Please select a ward');
      return;
    }
    if (!data.admitting_diagnosis) {
      Notiflix.Notify.warning('Please enter admitting diagnosis');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await Http.post(routes.api.admissions.create, {
        ...data,
        admission_date: format(data.admission_date, 'yyyy-MM-dd'),
      });

      if (response.data.status) {
        Notiflix.Notify.success(response.data.message || 'Patient admitted successfully');
        resetForm();
        onOpenChange(false);
        onSuccess?.();
      } else {
        Notiflix.Notify.failure(response.data.message || 'Failed to admit patient');
      }
    } catch (error) {
      Notiflix.Notify.failure('An error occurred while admitting patient');
      console.error('Admission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Admit Patient</DialogTitle>
          <DialogDescription>
            Fill in the admission details to admit a patient to the hospital.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Patient Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900">Patient Information</h3>
            <div className="space-y-2">
              <Label>Select Patient *</Label>
              <Select onValueChange={handlePatientSelect} value={data.patient_id}>
                <SelectTrigger className={errors.patient_id ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Search or select patient" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {patient.name} - {patient.age}y, {patient.gender} - {patient.blood_group}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.patient_id && (
                <p className="text-sm text-red-500">{errors.patient_id}</p>
              )}
            </div>

            {selectedPatient && (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">{selectedPatient.name}</h4>
                    <p className="text-sm text-gray-500 mt-1">
                      {selectedPatient.age} years • {selectedPatient.gender} • Blood Group: {selectedPatient.blood_group}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Admission Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900">Admission Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Admission Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(data.admission_date, 'PPP')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={data.admission_date}
                      onSelect={(date) => date && setData('admission_date', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Admission Time</Label>
                <Input
                  type="time"
                  value={data.admission_time}
                  onChange={(e) => setData('admission_time', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Ward *</Label>
                <Select onValueChange={handleWardChange} value={data.ward}>
                  <SelectTrigger className={errors.ward ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select ward" />
                  </SelectTrigger>
                  <SelectContent>
                    {wards.map((ward) => (
                      <SelectItem key={ward.id} value={ward.id}>
                        {ward.name} ({ward.available} beds available)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.ward && <p className="text-sm text-red-500">{errors.ward}</p>}
              </div>

              <div className="space-y-2">
                <Label>Bed Number</Label>
                <Input
                  placeholder="e.g., ICU-12"
                  value={data.bed_number}
                  onChange={(e) => setData('bed_number', e.target.value)}
                />
                {availableBeds > 0 && (
                  <p className="text-xs text-green-600">{availableBeds} beds available in this ward</p>
                )}
              </div>

              <div className="col-span-2 space-y-2">
                <Label>Admitting Diagnosis *</Label>
                <Textarea
                  placeholder="Enter primary diagnosis for admission"
                  value={data.admitting_diagnosis}
                  onChange={(e) => setData('admitting_diagnosis', e.target.value)}
                  rows={2}
                  className={errors.admitting_diagnosis ? 'border-red-500' : ''}
                />
                {errors.admitting_diagnosis && (
                  <p className="text-sm text-red-500">{errors.admitting_diagnosis}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Attending Doctor</Label>
                <Select onValueChange={(value) => setData('attending_doctor', value)} value={data.attending_doctor}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select doctor" />
                  </SelectTrigger>
                  <SelectContent>
                    {doctors.map((doctor) => (
                      <SelectItem key={doctor.id} value={doctor.name}>
                        {doctor.name} - {doctor.specialty}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Package</Label>
                <Select onValueChange={(value) => setData('package_name', value)} value={data.package_name}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select package" />
                  </SelectTrigger>
                  <SelectContent>
                    {packages.map((pkg) => (
                      <SelectItem key={pkg.id} value={pkg.name}>
                        {pkg.name} ({pkg.price})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Insurance & Emergency Contact */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900">Insurance & Emergency Contact</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Insurance Provider</Label>
                <Input
                  placeholder="Insurance company name"
                  value={data.insurance_provider}
                  onChange={(e) => setData('insurance_provider', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Policy Number</Label>
                <Input
                  placeholder="Insurance policy number"
                  value={data.policy_number}
                  onChange={(e) => setData('policy_number', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Emergency Contact Name</Label>
                <Input
                  placeholder="Name of emergency contact"
                  value={data.emergency_contact_name}
                  onChange={(e) => setData('emergency_contact_name', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Emergency Contact Phone</Label>
                <Input
                  placeholder="Phone number"
                  value={data.emergency_contact_phone}
                  onChange={(e) => setData('emergency_contact_phone', e.target.value)}
                />
              </div>

              <div className="col-span-2 space-y-2">
                <Label>Additional Notes</Label>
                <Textarea
                  placeholder="Any special instructions or notes"
                  value={data.notes}
                  onChange={(e) => setData('notes', e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-gray-900 hover:bg-gray-800"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Admitting...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                Admit Patient
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}