import { useState, useEffect } from 'react';
import {
    Phone,
    Mail,
    User,
    Cake,
    Shield,
    Hash,
    MapPin,
    HeartPulse,
} from 'lucide-react';

export default function PatientHeader() {
    const [patient, setPatient] = useState(null);

    useEffect(() => {
        try {
            const cached = localStorage.getItem('current_patient');
            if (cached) setPatient(JSON.parse(cached));
        } catch {
            // Malformed JSON — ignore
        }
    }, []);

    const getInitials = (firstName, lastName) => {
        return `${firstName?.charAt(0) ?? ''}${lastName?.charAt(0) ?? ''}`.toUpperCase();
    };

    const calculateAge = (dob) => {
        if (!dob) return '—';
        const today = new Date();
        const birth = new Date(dob);
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
        return age;
    };

    const avatarUrl =
        patient?.profile_photo ||
        `https://ui-avatars.com/api/?name=${patient?.first_name ?? 'User'}&background=3b82f6&color=fff&size=128`;

    const age = patient?.date_of_birth
        ? calculateAge(patient.date_of_birth)
        : (patient?.age ?? '—');

    if (!patient) return null;

    return (
        <div className="mb-4 border-b bg-white px-6 py-5">
            <div className="flex items-start gap-6">
                {/* Avatar */}
                <div className="flex-shrink-0">
                    <img
                        src={avatarUrl}
                        alt={patient.full_name ?? 'Patient'}
                        className="h-20 w-20 rounded-full border-4 border-blue-100 object-cover"
                        onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            if (e.currentTarget.nextSibling) {
                                (
                                    e.currentTarget.nextSibling as HTMLElement
                                ).style.display = 'flex';
                            }
                        }}
                    />
                    <div className="hidden h-20 w-20 items-center justify-center rounded-full border-4 border-blue-100 bg-blue-500 text-2xl font-semibold text-white">
                        {getInitials(patient.first_name, patient.last_name)}
                    </div>
                </div>

                {/* Name & IDs */}
                <div className="min-w-[160px]">
                    <h1 className="text-lg leading-tight font-semibold text-gray-900">
                        {patient.full_name ||
                            `${patient.first_name ?? ''} ${patient.last_name ?? ''}`.trim() ||
                            'Unknown Patient'}
                    </h1>
                    <div className="mt-2 space-y-1">
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Hash className="h-3 w-3" />
                            <span>MRN: {patient.patient_number ?? '—'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <User className="h-3 w-3" />
                            <span>
                                NRC:{' '}
                                {patient.nrc ??
                                    patient.id_number ??
                                    'Not provided'}
                            </span>
                        </div>
                        {patient.status && (
                            <span
                                className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                                    patient.status === 'active'
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-gray-100 text-gray-500'
                                }`}
                            >
                                {patient.status.charAt(0).toUpperCase() +
                                    patient.status.slice(1)}
                            </span>
                        )}
                    </div>
                </div>

                <div className="mx-2 hidden h-16 w-px self-center bg-gray-100 md:block" />

                {/* Demographics */}
                <div className="min-w-[120px]">
                    <h4 className="mb-2 text-xs font-medium tracking-wide text-gray-400 uppercase">
                        Demographics
                    </h4>
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                            <Cake className="h-4 w-4 text-blue-400" />
                            <span>{age !== '—' ? `${age} yrs` : '—'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                            <User className="h-4 w-4 text-purple-400" />
                            <span className="capitalize">
                                {patient.sex ?? patient.gender ?? '—'}
                            </span>
                        </div>
                        {patient.blood_group && (
                            <div className="flex items-center gap-2 text-sm text-gray-700">
                                <HeartPulse className="h-4 w-4 text-red-400" />
                                <span>{patient.blood_group}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="mx-2 hidden h-16 w-px self-center bg-gray-100 md:block" />

                {/* Contact */}
                <div className="min-w-[160px]">
                    <h4 className="mb-2 text-xs font-medium tracking-wide text-gray-400 uppercase">
                        Contact
                    </h4>
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                            <Phone className="h-4 w-4 text-green-500" />
                            <span>
                                {patient.phone_number ??
                                    patient.phone ??
                                    'Not provided'}
                            </span>
                        </div>
                        {patient.email && (
                            <div className="flex items-center gap-2 text-sm text-gray-700">
                                <Mail className="h-4 w-4 text-blue-400" />
                                <span className="max-w-[140px] truncate">
                                    {patient.email}
                                </span>
                            </div>
                        )}
                        {patient.address && (
                            <div className="flex items-center gap-2 text-sm text-gray-700">
                                <MapPin className="h-4 w-4 text-orange-400" />
                                <span className="max-w-[140px] truncate">
                                    {patient.address}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="mx-2 hidden h-16 w-px self-center bg-gray-100 md:block" />

                {/* Insurance */}
                <div className="min-w-[160px]">
                    <h4 className="mb-2 text-xs font-medium tracking-wide text-gray-400 uppercase">
                        Insurance
                    </h4>
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                            <Shield className="h-4 w-4 text-indigo-500" />
                            <span>
                                {patient.insurance_provider ?? 'Not specified'}
                            </span>
                        </div>
                        {patient.insurance_number &&
                            patient.insurance_number !== 'Not specified' && (
                                <div className="flex items-center gap-2 text-sm text-gray-700">
                                    <Hash className="h-4 w-4 text-yellow-500" />
                                    <span>{patient.insurance_number}</span>
                                </div>
                            )}
                    </div>
                </div>
            </div>
        </div>
    );
}
