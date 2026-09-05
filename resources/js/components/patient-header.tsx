import {
    Phone,
    Mail,
    User,
    Cake,
    Shield,
    Hash,
    MapPin,
    HeartPulse,
    Calendar,
    Bed,
    Hospital,
    Building2,
    CreditCard,
    FileText,
    UserCircle,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import profile from './default.png';

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

    if (!patient) return null;

    const age = patient?.date_of_birth
        ? calculateAge(patient.date_of_birth)
        : (patient?.age ?? '—');

    const fullName =
        patient.full_name ||
        `${patient.first_name ?? ''} ${patient.last_name ?? ''}`.trim() ||
        'Unknown Patient';

    const initials = getInitials(patient.first_name, patient.last_name);
    const avatarUrl =
        patient?.profile_photo ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=3b82f6&color=fff&size=128`;

    // Status badge color mapping
    const statusColors = {
        active: 'bg-emerald-600 text-white',
        stable: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        discharged: 'bg-gray-50 text-gray-600 border-gray-200',
        admitted: 'bg-blue-50 text-blue-700 border-blue-200',
        pending: 'bg-amber-50 text-amber-700 border-amber-200',
    };

    const statusColor =
        statusColors[patient?.status?.toLowerCase()] ||
        'bg-gray-50 text-gray-600 border-gray-200';

    return (
        <div className="border-b bg-white">
            <div className="px-6 py-5">
                {/* Top Row: Avatar + Name + Status + Quick Info */}
                <div className="flex items-start gap-6">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                        <Avatar className="h-16 w-16 border-2 border-blue-100 shadow-sm">
                            <AvatarImage src={profile} alt={fullName} />
                            <AvatarFallback className="bg-blue-600 text-lg font-semibold text-white">
                                {initials || '?'}
                            </AvatarFallback>
                        </Avatar>
                    </div>

                    {/* Name & Basic Info */}
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3">
                            <h1 className="truncate text-xl font-semibold text-gray-900">
                                {fullName}
                            </h1>
                            <Badge
                                className={`${statusColor} border text-xs font-medium capitalize`}
                            >
                                {patient.status || 'Active'}
                            </Badge>
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                            <span className="flex items-center gap-1.5">
                                <Hash className="h-3.5 w-3.5 text-gray-400" />
                                <span>
                                    MRN: {patient.patient_number ?? '—'}
                                </span>
                            </span>
                            <span className="flex items-center gap-1.5">
                                <UserCircle className="h-3.5 w-3.5 text-gray-400" />
                                <span>
                                    NRC:{' '}
                                    {patient.nrc ??
                                        patient.id_number ??
                                        'Not provided'}
                                </span>
                            </span>
                            {patient.room && (
                                <span className="flex items-center gap-1.5">
                                    <Bed className="h-3.5 w-3.5 text-gray-400" />
                                    <span>Room: {patient.room}</span>
                                </span>
                            )}
                            {patient.ward && (
                                <span className="flex items-center gap-1.5">
                                    <Hospital className="h-3.5 w-3.5 text-gray-400" />
                                    <span>Ward: {patient.ward}</span>
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Admission Date - Right Aligned */}
                    {patient.admission_date && (
                        <div className="flex-shrink-0 text-right">
                            <span className="flex items-center gap-1.5 text-sm text-gray-500">
                                <Calendar className="h-3.5 w-3.5 text-gray-400" />
                                <span>
                                    Admitted:{' '}
                                    {new Date(
                                        patient.admission_date,
                                    ).toLocaleDateString()}
                                </span>
                            </span>
                        </div>
                    )}
                </div>

                {/* Divider */}
                <div className="my-3 border-t border-gray-100" />

                {/* Bottom Row: Demographics | Contact | Insurance | Address */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {/* Demographics */}
                    <div className="space-y-1.5">
                        <h4 className="text-xs font-medium tracking-wider text-gray-400 uppercase">
                            Demographics
                        </h4>
                        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
                            <span className="flex items-center gap-1.5 text-gray-700">
                                <Cake className="h-3.5 w-3.5 text-blue-400" />
                                {age !== '—' ? `${age} yrs` : '—'}
                            </span>
                            <span className="flex items-center gap-1.5 text-gray-700">
                                <User className="h-3.5 w-3.5 text-purple-400" />
                                <span className="capitalize">
                                    {patient.sex ?? patient.gender ?? '—'}
                                </span>
                            </span>
                            {patient.blood_group && (
                                <span className="flex items-center gap-1.5 text-gray-700">
                                    <HeartPulse className="h-3.5 w-3.5 text-red-400" />
                                    <span className="font-medium">
                                        {patient.blood_group}
                                    </span>
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Contact */}
                    <div className="space-y-1.5">
                        <h4 className="text-xs font-medium tracking-wider text-gray-400 uppercase">
                            Contact
                        </h4>
                        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
                            <span className="flex items-center gap-1.5 text-gray-700">
                                <Phone className="h-3.5 w-3.5 text-green-500" />
                                {patient.phone_number ??
                                    patient.phone ??
                                    'Not provided'}
                            </span>
                            {patient.email && (
                                <span className="flex items-center gap-1.5 text-gray-700">
                                    <Mail className="h-3.5 w-3.5 text-blue-400" />
                                    <span className="max-w-[150px] truncate">
                                        {patient.email}
                                    </span>
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Insurance */}
                    <div className="space-y-1.5">
                        <h4 className="text-xs font-medium tracking-wider text-gray-400 uppercase">
                            Insurance
                        </h4>
                        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
                            <span className="flex items-center gap-1.5 text-gray-700">
                                <Shield className="h-3.5 w-3.5 text-indigo-500" />
                                {patient.insurance_provider ?? 'Not specified'}
                            </span>
                            {patient.insurance_number &&
                                patient.insurance_number !==
                                    'Not specified' && (
                                    <span className="flex items-center gap-1.5 text-gray-700">
                                        <CreditCard className="h-3.5 w-3.5 text-amber-500" />
                                        <span className="font-mono text-xs">
                                            {patient.insurance_number}
                                        </span>
                                    </span>
                                )}
                        </div>
                    </div>

                    {/* Address */}
                    <div className="space-y-1.5">
                        <h4 className="text-xs font-medium tracking-wider text-gray-400 uppercase">
                            Address
                        </h4>
                        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
                            <span className="flex items-center gap-1.5 text-gray-700">
                                <MapPin className="h-3.5 w-3.5 text-orange-400" />
                                <span className="max-w-[200px] truncate">
                                    {patient.address ??
                                        patient.location ??
                                        'Not provided'}
                                </span>
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
