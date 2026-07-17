import { useState, useMemo } from "react";
import {
    User, Droplets, Baby, ChevronRight, X, Phone, Mail,
    MapPin, Calendar, Hash, AlertCircle, UserCheck2, Clock,
    CalendarClock, Stethoscope, Building2,
    ArrowBigLeft,
    ArrowLeftRightIcon,
    ArrowLeftCircle,
    Briefcase, Globe, Shield, CreditCard,
    Search, Filter, Users, XCircle
} from "lucide-react";
import Notiflix from "notiflix";
import PatientLayout from "@/layouts/patients/PatientLayout";
import PatientTabs from "./components/PatientTabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import Http from "@/utils/Http";
import useDepartments from "@/global/useDepartments"; // Import the hook
import { toast } from "sonner";
import { Link } from "@inertiajs/react";

export default function Patient({ patient }) {
    const [activeTab, setActiveTab] = useState("overview");
    const [showVisitModal, setShowVisitModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Use the departments hook
    const { 
        departments: departmentsList, 
        loading: departmentsLoading,
        departmentStats,
        activeDepartments,
        usersAssignable: hookStaff, // Rename this to avoid conflict
        refreshDepartments 
    } = useDepartments();

    // Filter states
    const [departmentSearch, setDepartmentSearch] = useState("");
    const [staffSearch, setStaffSearch] = useState("");
    const [departmentFilter, setDepartmentFilter] = useState("all"); // 'all', 'active', 'inactive'

    // Selection states
    const [selectedDepartment, setSelectedDepartment] = useState(null);
    const [selectedServices, setSelectedServices] = useState([]);
    const [selectedStaff, setSelectedStaff] = useState(null); // Changed from array to single value
    const [priority, setPriority] = useState("routine");
    const [notes, setNotes] = useState("");
    const [visitType, setVisitType] = useState(0);
    const [purposeOfVisit, setPurposeOfVisit] = useState("")
    const [queueTo, setQueueTo] = useState("");

    // Enhanced patient data from props
    const patientData = {
        id: patient?.id,
        name: `${patient?.first_name || ''} ${patient?.last_name || ''}`.trim() || 'Unknown',
        patientNumber: patient?.patient_number || '—',
        mrn: patient?.patient_number || '—',
        age: patient?.date_of_birth ? calculateAge(patient.date_of_birth) : '—',
        gender: patient?.gender || '—',
        bloodGroup: patient?.blood_group || '—',
        phone: patient?.phone || 'Not provided',
        email: patient?.email || 'Not provided',
        address: patient?.address || 'Not provided',
        emergencyContact: patient?.emergency_contact || patient?.next_of_kin_name || 'Not provided',
        emergencyPhone: patient?.emergency_phone || patient?.next_of_kin_phone || 'Not provided',
        insuranceProvider: patient?.insurance_provider || 'Not specified',
        insuranceNumber: patient?.insurance_number || 'Not specified',
        idType: patient?.id_type || 'Not specified',
        idNumber: patient?.id_number || 'Not provided',
        occupation: patient?.occupation || 'Not specified',
        nationality: patient?.nationality || 'Not specified',
        maritalStatus: patient?.marital_status || 'Not specified',
        status: patient?.status || 'active',
        avatar: patient?.profile_photo || `https://ui-avatars.com/api/?name=${patient?.first_name || 'User'}&background=3b82f6&color=fff&size=128`
    };

    const handlePurposeOfVisit = (e) => {
        setPurposeOfVisit(e.target.value)
    }
    
    const handleVisitType = (visit) => {
        setVisitType(visit);
    }

    const handleQueue = (queue) => {
        setQueueTo(queue)
    }

    // Age calculation
    function calculateAge(dob) {
        if (!dob) return '—';
        try {
            const birthDate = new Date(dob);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
            return age;
        } catch {
            return '—';
        }
    }

    // Initials
    function getInitials(name) {
        if (!name || name === 'Unknown') return '?';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }

    // Handle service selection
    const toggleService = (serviceId) => {
        setSelectedServices(prev =>
            prev.includes(serviceId)
                ? prev.filter(id => id !== serviceId)
                : [...prev, serviceId]
        );
        setError("");
    };

    // Handle staff selection - changed to radio (single selection)
    const handleStaffSelect = (staffId) => {
        setSelectedStaff(staffId);
        setError("");
    };

    // Handle form submission
    const handleAssign = async () => {
        // Validation
        if (!selectedDepartment) {
            setError("Please select a department");
            toast.error("Please select a department", {
                position: "top-center",
                duration: 4000,
            });
            return;
        }

        setLoading(true);
        setError("");

        const visitData = {
            patient_id: patientData.id,
            patient_number: patientData.patientNumber,
            department_id: selectedDepartment,
            service_ids: selectedServices,
            staff_id: selectedStaff, // Changed from staff_ids to staff_id
            priority: priority,
            notes: notes,
            visit_type: visitType,
            purpose_of_visit: purposeOfVisit,
            scheduled_date: new Date().toISOString(),
            status: 'pending'
        };

        try {
            const response = await Http.post('/patient/create/visit', visitData);
            
            if(response.data.status===301){
                Notiflix.Notify.failure(response.data.message)
            } else {
                // Show success toast BEFORE closing modal
            Notiflix.Notify.success(response.data.message)
            
            // Small delay to ensure toast is visible
            setTimeout(() => {
                // Close modal and reset
                setShowVisitModal(false);
                resetSelections();
                
                // Refresh departments data if needed
                refreshDepartments();
            }, 100);
            }

        } catch (error) {
            const errorMessage = error.message || "Failed to assign visit";
            setError(errorMessage);
            
            toast.error('Assignment Failed', {
                description: errorMessage,
                duration: 5000,
                position: "top-center",
            });
        } finally {
            setLoading(false);
        }
    };

    // Reset selections
    const resetSelections = () => {
        setSelectedDepartment(null);
        setSelectedServices([]);
        setSelectedStaff(null); // Changed to null
        setPriority("routine");
        setNotes("");
        setVisitType(0);
        setPurposeOfVisit("");
        setError("");
        setDepartmentSearch("");
        setStaffSearch("");
        setDepartmentFilter("all");
    };

    // Mock data for services (keeping as is)
    const services = [
        { id: 1, name: "Emergency", color: 'bg-red-600'},
        { id: 2, name: "Routine", color: 'bg-yellow-600'},
        { id: 3, name: "Other", color: 'bg-green-600' },
    ];

    // Filter departments based on search and filter
    const filteredDepartments = useMemo(() => {
        let filtered = activeDepartments || [];
        
        // Apply search filter
        if (departmentSearch) {
            filtered = filtered.filter(dept => 
                dept.department_name?.toLowerCase().includes(departmentSearch.toLowerCase()) ||
                dept.head_of_department?.toLowerCase().includes(departmentSearch.toLowerCase()) ||
                dept.location?.toLowerCase().includes(departmentSearch.toLowerCase())
            );
        }
        
        // Apply status filter
        if (departmentFilter === 'active') {
            filtered = filtered.filter(dept => dept.is_active !== false);
        } else if (departmentFilter === 'inactive') {
            filtered = filtered.filter(dept => dept.is_active === false);
        }
        
        return filtered;
    }, [activeDepartments, departmentSearch, departmentFilter]);

    // Filter staff based ONLY on search - removed all availability filtering
    const filteredStaff = useMemo(() => {
        let filtered = hookStaff || []; // Use hookStaff here
        
        // Apply search filter ONLY
        if (staffSearch) {
            filtered = filtered.filter(person => 
                person.name?.toLowerCase().includes(staffSearch.toLowerCase()) ||
                person.role?.toLowerCase().includes(staffSearch.toLowerCase()) ||
                person.department?.toLowerCase().includes(staffSearch.toLowerCase())
            );
        }
        
        return filtered; // Return all staff, regardless of availability
    }, [hookStaff, staffSearch]);

    // Get department name helper
    const getDepartmentName = (deptId) => {
        const dept = departmentsList?.find(d => d.id === deptId);
        return dept?.department_name || 'Department';
    };

    return (
        <PatientLayout patient={patient} breadcrumbs={[
            {
                title: `Patient`,
                href: ''
            },{
                title: `${patientData.name}`,
                href: ''
            }
        ]}>
            <div className="border-t-r-100 bg-gray-100">
                {/* Main Patient Card */}
                <div className="overflow-hidden ">
                    <CardContent className="p-0 ">
                        {/* Top Bar with Quick Actions */}
                        <div className="flex items-center justify-between p-4 bg-white border-b">
                            <div className="flex items-center gap-2">
                                <Link  href="../reception/registry" className="border-0 flex gap-2 p-1  rounded-lg">
                                    <ArrowLeftCircle className="w-6 h-6 mr-2" />
                                    Registry
                                </Link>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    size="sm"
                                    onClick={() => {
                                        resetSelections();
                                        setShowVisitModal(true);
                                    }}
                                >
                                    <Building2 className="w-4 h-4 mr-2" />
                                    Assign to Department
                                </Button>
                            </div>
                        </div>

                        {/* Patient Header with Avatar and Basic Info */}
                        <div className="p-6 bg-white">
                            <div className="flex gap-6">
                                {/* Avatar Section */}
                                <div className="flex-shrink-0">
                                    <Avatar className="h-18 w-18 border-4 border-blue-100">
                                        <AvatarImage src={patientData.avatar} className="object-cover" />
                                        <AvatarFallback className="bg-blue-400 text-white text-2xl">
                                            {getInitials(patientData.name)}
                                        </AvatarFallback>
                                    </Avatar>
                                </div>

                                {/* Patient Info Grid */}
                                <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {/* Name & ID */}
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">{patientData.name}</p>
                                        <div className="space-y-1 mt-2">
                                            <div className="flex items-center gap-1 text-xs text-gray-500">
                                                <Hash className="w-3 h-3" />
                                                <span>MRN: {patientData.mrn}</span>
                                            </div>
                                            <div className="flex items-center gap-1 text-xs text-gray-500">
                                                <User className="w-3 h-3" />
                                                <span>ID: {patientData.idNumber}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Age & Gender & Nationality */}
                                    <div>
                                        <p className="text-xs text-gray-500 mb-2">Demographics</p>
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <Baby className="w-4 h-4 text-blue-500" />
                                                <span className="text-sm text-gray-700">{patientData.age} years</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <User className="w-4 h-4 text-purple-500" />
                                                <span className="text-sm text-gray-700 capitalize">{patientData.gender}</span>
                                            </div>
                                      
                                           
                                        </div>
                                    </div>

                                    {/* Contact */}
                                    <div>
                                        <p className="text-xs text-gray-500 mb-2">Contact</p>
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <Phone className="w-4 h-4 text-green-500" />
                                                <span className="text-sm text-gray-700">{patientData.phone}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Mail className="w-4 h-4 text-blue-500" />
                                                <span className="text-sm text-gray-700 truncate">{patientData.email}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Medical Info */}
                                    <div>
                                        <p className="text-xs text-gray-500 mb-2">Insurance</p>
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <Shield className="w-4 h-4 text-indigo-500" />
                                                <span className="text-sm text-gray-700">{patientData.insuranceProvider}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Hash className="w-4 h-4 text-yellow-500" />
                                                <span className="text-sm text-gray-700">{patientData.insuranceNumber}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </div>

                {/* Tabs */}
                <PatientTabs activeTab={activeTab} setActiveTab={setActiveTab} patient={patient} />

                {/* Wide Modal with fit-content */}
                <Dialog open={showVisitModal} onOpenChange={setShowVisitModal}>
                    <DialogContent className="w-fit max-w-6xl min-w-[1000px] bg-gray-50 p-0 overflow-hidden">
                        <DialogHeader className="p-6 pb-2">
                            <DialogTitle className="text-xl">Assign to Department</DialogTitle>
                            {/* Show department stats */}
                        </DialogHeader>

                        {/* Error Message */}
                        {error && (
                            <div className="mx-6 mb-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        {/* Modal Content - 3 Columns with selection */}
                        <div className="grid grid-cols-3 gap-4 px-6 py-4 max-h-[70vh] overflow-hidden">
                            {/* Column 1: Departments - With Filter */}
                            <div className="flex flex-col h-full overflow-hidden border-r">
                                <CardContent className="p-4 flex flex-col h-full">
                                    <div className="flex-shrink-0">
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="font-medium">Departments</h3>
                                            <Badge variant="outline">
                                                {departmentsLoading ? 'Loading...' : `${filteredDepartments.length} of ${departmentsList.length}`}
                                            </Badge>
                                        </div>
                                        
                                        {/* Search Input */}
                                        <div className="relative mb-2">
                                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                                            <Input
                                                placeholder="Search departments..."
                                                className="pl-8 h-9 text-sm bg-white"
                                                value={departmentSearch}
                                                onChange={(e) => setDepartmentSearch(e.target.value)}
                                            />
                                            {departmentSearch && (
                                                <XCircle 
                                                    className="absolute right-2 top-2.5 h-4 w-4 text-gray-400 cursor-pointer hover:text-gray-600"
                                                    onClick={() => setDepartmentSearch("")}
                                                />
                                            )}
                                        </div>
                                        
                                        {/* Filter Dropdown */}
                                        <div className="flex items-center gap-2 mb-3">
                                            <Filter className="h-4 w-4 text-gray-400" />
                                            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                                                <SelectTrigger className="h-8 text-xs">
                                                    <SelectValue placeholder="Filter by status" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">All Departments</SelectItem>
                                                    <SelectItem value="active">Active Only</SelectItem>
                                                    <SelectItem value="inactive">Inactive Only</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    
                                    {/* Scrollable Department List */}
                                    <div className="flex-1 overflow-y-auto min-h-0 pr-1">
                                        {departmentsLoading ? (
                                            <div className="flex justify-center py-8">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                            </div>
                                        ) : filteredDepartments.length === 0 ? (
                                            <div className="text-center py-8 text-gray-500">
                                                No departments found
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {filteredDepartments.map(dept => (
                                                    <div
                                                        key={dept.id}
                                                        className={`flex items-start gap-2 p-3 rounded cursor-pointer transition-colors ${
                                                            selectedDepartment === dept.id
                                                                ? 'bg-blue-50 border border-blue-200'
                                                                : dept.is_active !== false
                                                                    ? 'hover:bg-gray-50 border border-transparent'
                                                                    : 'opacity-50 cursor-not-allowed'
                                                        }`}
                                                        onClick={() => {
                                                            if (dept.is_active !== false) {
                                                                setSelectedDepartment(dept.id);
                                                                setError("");
                                                            }
                                                        }}
                                                    >
                                                        <div className={`w-4 h-4 mt-0.5 rounded-full border ${
                                                            selectedDepartment === dept.id
                                                                ? 'border-4 border-blue-600'
                                                                : 'border-2 border-gray-300'
                                                        }`} />
                                                        <div className="flex-1">
                                                            <div className="flex items-center justify-between">
                                                                <p className="text-sm font-medium">{dept.department_name}</p>
                                                                {dept.is_active === false && (
                                                                    <Badge variant="outline" className="bg-gray-50 text-gray-700 text-xs">
                                                                        Inactive
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-gray-500">Head: {dept.head_of_department || 'Not assigned'}</p>
                                                            <p className="text-xs text-gray-400">{dept.location || 'Location not set'}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </div>                      
                          

                            {/* Column 3: Staff - Search Only - No Status Filtering */}
                            <div className="flex flex-col h-full overflow-hidden border-r">
                                <CardContent className="p-4 flex flex-col h-full">
                                    <div className="flex-shrink-0">
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="font-medium">Assign to Staff</h3>
                                            <Badge variant="outline">{selectedStaff ? '1 selected' : '0 selected'}</Badge>
                                        </div>
                                        
                                        {/* Search Input */}
                                        <div className="relative mb-2">
                                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400 bg-white" />
                                            <Input
                                                placeholder="Search staff..."
                                                className="pl-8 h-9 text-sm"
                                                value={staffSearch}
                                                onChange={(e) => setStaffSearch(e.target.value)}
                                            />
                                            {staffSearch && (
                                                <XCircle 
                                                    className="absolute right-2 top-2.5 h-4 w-4 text-gray-400 cursor-pointer hover:text-gray-600"
                                                    onClick={() => setStaffSearch("")}
                                                />
                                            )}
                                        </div>
                                        
                                        {/* Removed all filter options - only showing search */}
                                    </div>
                                    
                                    {/* Scrollable Staff List - Showing ALL staff */}
                                    <div className="flex-1 overflow-y-auto min-h-0 pr-1">
                                        {filteredStaff.length === 0 ? (
                                            <div className="text-center py-8 text-gray-500">
                                                No staff found
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {filteredStaff.map(person => (
                                                    <div
                                                        key={person.id}
                                                        className={`flex items-start gap-2 p-3 rounded cursor-pointer transition-colors ${
                                                            selectedStaff === person.id
                                                                ? 'bg-purple-50 border border-purple-200'
                                                                : 'hover:bg-gray-50 border border-transparent'
                                                        }`}
                                                        onClick={() => handleStaffSelect(person.id)}
                                                    >
                                                        {/* Radio button */}
                                                        <div className={`w-4 h-4 mt-0.5 rounded-full border ${
                                                            selectedStaff === person.id
                                                                ? 'border-4 border-purple-600'
                                                                : 'border-2 border-gray-300'
                                                        }`} />
                                                        <Avatar className="h-8 w-8">
                                                            <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
                                                                {person.initials || person.name?.split(' ').map(n => n[0]).join('')}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="flex-1">
                                                            <div className="flex items-center justify-between">
                                                                <p className="text-sm font-medium">{person.name}</p>
                                                                {/* Show status badge for information only */}
                                                                {person.available ? (
                                                                    <Badge variant="outline" className="bg-green-50 text-green-700 text-xs">
                                                                        Available
                                                                    </Badge>
                                                                ) : (
                                                                    <Badge variant="outline" className="bg-red-50 text-red-700 text-xs">
                                                                        Busy
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-gray-500">{person.role}</p>
                                                            <p className="text-xs text-gray-400">{person.department} • {person.patients} patients</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </div>
                                                        {/* Column 2: Services - Multi-select */}
                            <div className="flex flex-col h-full overflow-hidden">
                                <CardContent className="p-4 flex flex-col h-full">
                                    <div className="flex-shrink-0">
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="font-medium">Additional Details</h3>
                                        </div>
                                    </div>
                                    
                                    <div className="flex-1 overflow-y-auto min-h-0 pr-1 space-y-4">
                                        <div>
                                            <label className="text-sm text-gray-600 block mb-2">Service Type</label>
                                            <div className="flex gap-2 flex-wrap">
                                                {services.map((item) => (
                                                    <Badge 
                                                        key={item.id}
                                                        className={`${item.color} cursor-pointer hover:opacity-80 ${
                                                            selectedServices.includes(item.id) ? 'ring-2 ring-offset-2 ring-blue-500' : ''
                                                        }`}
                                                        onClick={() => toggleService(item.id)}
                                                    >
                                                        {item.name}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                        
                                        <div>
                                            <label className="text-sm text-gray-600 block mb-2">Type of visit</label>
                                            <div className="flex gap-4">
                                                <Badge 
                                                    onClick={() => handleVisitType(1)}
                                                    className={`cursor-pointer ${visitType === 1 ? 'ring-2 ring-offset-2 ring-blue-500' : ''} bg-green-600`}
                                                >
                                                    New Visit
                                                </Badge>
                                                <Badge 
                                                    onClick={() => handleVisitType(2)}
                                                    className={`cursor-pointer ${visitType === 2 ? 'ring-2 ring-offset-2 ring-blue-500' : ''} bg-blue-600`}
                                                >
                                                    Revisit
                                                </Badge>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-sm text-gray-600 block mb-2">Purpose of visit</label>
                                            <textarea 
                                                className="h-20 w-full bg-gray-100 rounded-lg p-2 text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                onChange={handlePurposeOfVisit}
                                                value={purposeOfVisit}
                                                placeholder="Enter purpose of visit..."
                                            ></textarea>
                                        </div>
                                    </div>
                                </CardContent>
                            </div>
                        </div>

                        {/* Additional Options */}
                        <DialogFooter className="gap-2 p-6 pt-2">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setShowVisitModal(false);
                                    resetSelections();
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleAssign}
                                disabled={loading || departmentsLoading}
                            >
                                {loading ? 'Assigning...' : 'Confirm Assignment'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </PatientLayout>
    );
}