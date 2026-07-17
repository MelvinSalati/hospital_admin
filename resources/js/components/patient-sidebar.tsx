import { Link, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import {
    Users,
    UserPlus,
    CalendarClock,
    Stethoscope,
    HeartPulse,
    Pill,
    FlaskConical,
    Scan,
    Receipt,
    CreditCard,
    FileText,
    Microscope,
    Hospital,
    LogOut,
    UserCircle,
    Settings,
    ChevronDown,
    PlusCircleIcon,
    LayoutGrid,
    Phone,
    Mail,
    Calendar,
    Droplets,
    BabyIcon,
    Scissors,
    Eye,
} from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarGroup,
} from '@/components/ui/sidebar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

import type { NavItem } from '@/types';
import AppLogo from './app-logo';

/*
|--------------------------------------------------------------------------
| Navigation Items (ID at the END of the URL)
|--------------------------------------------------------------------------
*/

const patientNavItems: NavItem[] = [
    { title: 'Dashboard', href: (id) => `/patients/${id}`, icon: LayoutGrid },
    {
        title: 'Admissions',
        href: (id) => `/patients/admissions/${id}`,
        icon: UserPlus,
    },
    {
        title: 'Appointments',
        href: (id) => `/patients/appointments/${id}`,
        icon: CalendarClock,
    },
    {
        title: 'Consultations',
        href: (id) => `/patients/consultations/${id}`,
        icon: Stethoscope,
    },

    {
        title: 'Vitals',
        href: (id) => `/patients/vital-signs/${id}`,
        icon: HeartPulse,
    },
    {
        title: 'Add Vitals',
        href: (id) => `/patients/vital-signs/create/${id}`,
        icon: PlusCircleIcon,
    },
    {
        title: 'Laboratory',
        href: (id) => `/patients/lab/${id}`,
        icon: FlaskConical,
    },
    {
        title: 'Radiology',
        href: (id) => `/patients/radiology/${id}`,
        icon: Scan,
    },
    {
        title: 'Dispensing',
        href: (id) => `/patients/pharmacy/dispense/${id}`,
        icon: Pill,
    },
    {
        title: 'Prescriptions',
        href: (id) => `/patients/pharmacy/prescriptions/${id}`,
        icon: FileText,
    },
    {
        title: 'Billing',
        href: (id) => `/patients/billing/${id}`,
        icon: Receipt,
    },
    {
        title: 'Martenal & Child Health',
        href: (id) => `/patients/mch/${id}`,
        icon: BabyIcon,
    },
    {
        title: 'Theater',
        href: (id) => `/patients/theater/${id}`,
        icon: Scissors,
    },
    {
        title: 'Opthamology',
        href: (id) => `/patients/opthamology/${id}`,
        icon: Eye,
    },
    {
        title: 'Dental',
        href: (id) => `/patients/dental/${id}`,
        icon: Scissors,
    },
    {
        title: 'Payments',
        href: (id) => `/patients/payments/${id}`,
        icon: CreditCard,
    },
];

// Mock patient data - replace with actual data from your backend
const mockPatientData = {
    id: 'P00001',
    name: 'John Doe',
    patient_number: 'P00001',
    age: 45,
    gender: 'Male',
    blood_group: 'O+',
    email: 'john.doe@example.com',
    phone: '+1 (555) 123-4567',
    address: '123 Main St, New York, NY 10001',
    avatar: '/avatars/patient1.jpg',
    admission_status: 'Active',
    ward: 'ICU',
    bed_number: 'ICU-12',
};

export function PatientSidebar({ patient }) {
    const { props } = usePage();
    const [patientId, setPatientId] = useState(null);
    const [patientData, setPatientData] = useState(mockPatientData); // Replace with actual API call

    useEffect(() => {
        // Method 1: Try to get ID from props first
        if (props.patient?.id) {
            setPatientId(props.patient.id);
            // Fetch patient details if you have the data
            if (props.patient) {
                setPatientData(props.patient as any);
            }
        }
        // Method 2: Check if ID is passed directly in props
        else if (props.patientId) {
            setPatientId(props.patientId);
            // Fetch patient details using the ID
            // You can make an API call here to get patient details
        }
        // Method 3: Extract from URL (for /patients/21 pattern)
        else {
            const pathname = window.location.pathname;
            // Extract ID from URL patterns:
            // - /patients/21
            // - /patients/21/
            // - /any/route/21
            const match = pathname.match(/\/(\d+)(\/?$|\/)/);
            if (match) {
                setPatientId(match[1]);
                // Fetch patient details using the ID
            }
        }
    }, [props]);

    // Get initials for avatar fallback
    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((word) => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    // Get gender color
    const getGenderColor = (gender: string) => {
        switch (gender) {
            case 'Male':
                return 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30';
            case 'Female':
                return 'text-pink-600 bg-pink-100 dark:text-pink-400 dark:bg-pink-900/30';
            default:
                return 'text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/30';
        }
    };

    // Don't render links if no patient ID is found
    if (!patientId) {
        return (
            <Sidebar
                collapsible="icon"
                variant="inset"
                className="font-poppins border-r border-gray-200"
            >
                <SidebarHeader className="border-b border-gray-200 p-4">
                    <div className="flex items-center gap-2 text-xl font-semibold">
                        <Hospital className="h-6 w-6 text-primary" />
                        <span>Hospital System</span>
                    </div>
                </SidebarHeader>
                <SidebarContent>
                    <div className="p-4 text-sm text-gray-500">
                        Loading patient data...
                    </div>
                </SidebarContent>
            </Sidebar>
        );
    }

    return (
        <Sidebar
            collapsible="icon"
            variant="inset"
            className="font-poppins border-r border-gray-200"
        >
            <SidebarHeader className="border-b border-gray-200 p-4">
                <AppLogo />
            </SidebarHeader>

            {/* Patient Profile Section */}

            <SidebarContent className="overflow-y-auto">
                <SidebarGroup>
                    <div className="space-y-1 px-3">
                        {patientNavItems.map((item) => {
                            // Generate the href with ID at the END
                            const href =
                                typeof item.href === 'function'
                                    ? item.href(patientId)
                                    : item.href;

                            return (
                                <Link
                                    key={item.title}
                                    href={href}
                                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm !text-gray-600 text-gray-700 !no-underline no-underline transition-all hover:!bg-gray-600 hover:!text-white hover:!no-underline dark:!text-gray-400 dark:hover:!bg-gray-800"
                                >
                                    <item.icon className="h-4 w-4" />
                                    <span>{item.title}</span>
                                </Link>
                            );
                        })}
                    </div>
                </SidebarGroup>
            </SidebarContent>
        </Sidebar>
    );
}
