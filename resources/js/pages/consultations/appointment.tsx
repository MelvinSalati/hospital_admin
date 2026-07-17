import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import AppLayout from '@/layouts/app-layout'
import { Link, usePage } from '@inertiajs/react'
import {
    ArrowLeft,
    Calendar,
    CalendarDays,
    Clock,
    User,
    Users,
    Plus,
    Eye,
    CheckCircle,
    XCircle,
    AlertCircle,
    Edit,
    Trash2,
    RefreshCw,
    Video,
    MapPin,
    Stethoscope,
    FileText,
    Activity,
    Loader2,
    ChevronLeft,
    ChevronRight
} from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { format } from 'date-fns'

interface Appointment {
    id: number
    patient_id: number
    patient_name: string
    patient_email?: string
    patient_phone?: string
    doctor_id: number
    doctor_name: string
    department?: string
    date: string
    time: string
    duration?: number
    type: 'consultation' | 'follow-up' | 'emergency' | 'check-up'
    status: 'scheduled' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled' | 'no-show'
    priority: 'normal' | 'urgent' | 'emergency'
    notes?: string
    created_at: string
    updated_at: string
}

interface DashboardStats {
    total_appointments: number
    today_appointments: number
    upcoming_appointments: number
    completed_appointments: number
    cancelled_appointments: number
    completion_rate: number
}

export default function Appointments() {
    const { props } = usePage()
    const appointments: Appointment[] = props.appointments || []
    const authUser = props.auth?.user
    console.log(appointments);
    const [activeTab, setActiveTab] = useState<'upcoming' | 'today' | 'past' | 'cancelled'>('upcoming')
    const [appointmentModal, setAppointmentModal] = useState(false)
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
    const [viewModal, setViewModal] = useState(false)
    const [loading, setLoading] = useState(false)
    const [date, setDate] = useState<Date>(new Date())
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 4

    // Form state for new appointment
    const [formData, setFormData] = useState({
        patient_id: '',
        date: '',
        time: '',
        type: 'consultation',
        priority: 'normal',
        notes: ''
    })

    const tabs = [
        { id: 'upcoming', label: 'Upcoming', icon: CalendarDays },
        { id: 'today', label: 'Today', icon: Calendar },
        { id: 'past', label: 'Past', icon: Clock },
        { id: 'cancelled', label: 'Cancelled', icon: XCircle }
    ]

    // Calculate statistics from appointments
    const calculateStats = (): DashboardStats => {
        const today = new Date().toISOString().split('T')[0]
        const total = appointments.length
        const todayCount = appointments.filter(a => a.date === today && a.status !== 'cancelled').length
        const upcomingCount = appointments.filter(a => a.date > today && a.status !== 'cancelled').length
        const completedCount = appointments.filter(a => a.status === 'completed').length
        const cancelledCount = appointments.filter(a => a.status === 'cancelled').length
        const completionRate = total > 0 ? (completedCount / total) * 100 : 0

        return {
            total_appointments: total,
            today_appointments: todayCount,
            upcoming_appointments: upcomingCount,
            completed_appointments: completedCount,
            cancelled_appointments: cancelledCount,
            completion_rate: Math.round(completionRate)
        }
    }

    const stats = calculateStats()

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'scheduled':
                return 'bg-blue-100 text-blue-800'
            case 'confirmed':
                return 'bg-green-100 text-green-800'
            case 'in-progress':
                return 'bg-yellow-100 text-yellow-800'
            case 'completed':
                return 'bg-emerald-100 text-emerald-800'
            case 'cancelled':
                return 'bg-red-100 text-red-800'
            case 'no-show':
                return 'bg-gray-100 text-gray-800'
            default:
                return 'bg-gray-100 text-gray-800'
        }
    }

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'consultation':
                return 'bg-purple-100 text-purple-800'
            case 'follow-up':
                return 'bg-indigo-100 text-indigo-800'
            case 'emergency':
                return 'bg-red-100 text-red-800'
            case 'check-up':
                return 'bg-teal-100 text-teal-800'
            default:
                return 'bg-gray-100 text-gray-800'
        }
    }

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'emergency':
                return 'bg-red-100 text-red-800'
            case 'urgent':
                return 'bg-orange-100 text-orange-800'
            default:
                return 'bg-gray-100 text-gray-800'
        }
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'scheduled':
                return <Clock className="h-3 w-3" />
            case 'confirmed':
                return <CheckCircle className="h-3 w-3" />
            case 'in-progress':
                return <Activity className="h-3 w-3" />
            case 'completed':
                return <CheckCircle className="h-3 w-3" />
            case 'cancelled':
                return <XCircle className="h-3 w-3" />
            default:
                return null
        }
    }

    const handleNewAppointment = () => {
        setFormData({
            patient_id: '',
            date: '',
            time: '',
            type: 'consultation',
            priority: 'normal',
            notes: ''
        })
        setAppointmentModal(true)
    }

    const handleSubmitAppointment = async () => {
        setLoading(true)
        try {
            // This will be handled by Inertia form submission
            // For now, just close the modal
            setTimeout(() => {
                setLoading(false)
                setAppointmentModal(false)
                // You can add a success message here
            }, 1000)
        } catch (error) {
            console.error('Error saving appointment:', error)
            setLoading(false)
        }
    }

    const handleCancelAppointment = (id: number) => {
        if (confirm('Are you sure you want to cancel this appointment?')) {
            // This will be handled by Inertia
            console.log('Cancel appointment:', id)
        }
    }

    const filteredAppointments = appointments.filter(appointment => {
        const today = new Date().toISOString().split('T')[0]
        const appointmentDate = appointment.date

        switch (activeTab) {
            case 'upcoming':
                return appointmentDate > today && appointment.status !== 'cancelled'
            case 'today':
                return appointmentDate === today && appointment.status !== 'cancelled'
            case 'past':
                return appointmentDate < today && appointment.status !== 'cancelled'
            case 'cancelled':
                return appointment.status === 'cancelled'
            default:
                return true
        }
    })

    // Pagination logic
    const totalPages = Math.ceil(filteredAppointments.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const currentAppointments = filteredAppointments.slice(startIndex, endIndex)

    const handlePageChange = (page: number) => {
        setCurrentPage(page)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const AppointmentCard = ({ appointment }: { appointment: Appointment }) => (
        <div className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white">
            <div className="flex justify-between items-start mb-3">
                <div className="flex flex-wrap gap-2">
                    <Badge className={getStatusColor(appointment.status)}>
                        <span className="flex items-center gap-1">
                            {getStatusIcon(appointment.status)}
                            {appointment.status}
                        </span>
                    </Badge>
                    <Badge className={getTypeColor(appointment.type)}>
                        {appointment.type}
                    </Badge>
                    {appointment.priority !== 'normal' && (
                        <Badge className={getPriorityColor(appointment.priority)}>
                            {appointment.priority}
                        </Badge>
                    )}
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            setSelectedAppointment(appointment)
                            setViewModal(true)
                        }}
                    >
                        <Eye className="h-3 w-3" />
                    </Button>
                    {appointment.status !== 'completed' && appointment.status !== 'cancelled' && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancelAppointment(appointment.id)}
                        >
                            <Trash2 className="h-3 w-3 text-red-500" />
                        </Button>
                    )}
                </div>
            </div>

            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="font-medium">{appointment.patient_name}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Stethoscope className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">Dr. {appointment.doctor_name}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{appointment.date}</span>
                    <Clock className="h-4 w-4 text-gray-400 ml-2" />
                    <span className="text-sm text-gray-600">{appointment.time}</span>
                </div>
                {appointment.notes && (
                    <div className="flex items-start gap-2">
                        <FileText className="h-4 w-4 text-gray-400 mt-0.5" />
                        <p className="text-sm text-gray-500 line-clamp-2">{appointment.notes}</p>
                    </div>
                )}
            </div>
        </div>
    )

    return (
        <AppLayout
            breadcrumbs={[
                { href: '', title: 'Clinical' },
                { href: '', title: 'Appointments' },
            ]}
        >
            <div className="p-6 space-y-6">

                {/* Header - Title and Button on same line */}
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <Button variant="outline" size="icon" asChild>
                            <Link href="/dashboard">
                                <ArrowLeft size={16} />
                            </Link>
                        </Button>
                        <div>
                            <h1 className="text-xl font-semibold flex items-center gap-2">
                                <Calendar className="h-5 w-5" />
                                My Appointments
                            </h1>
                            <p className="text-sm text-gray-500">
                                Manage your patient appointments and schedule
                            </p>
                        </div>
                    </div>
                    <Button onClick={handleNewAppointment} className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="h-4 w-4 mr-2" />
                        Schedule Appointment
                    </Button>
                </div>

                {/* Tabs */}
                <div className="flex gap-4 border-b">
                    {tabs.map((tab) => {
                        const Icon = tab.icon
                        return (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    setActiveTab(tab.id as any)
                                    setCurrentPage(1) // Reset to first page when changing tabs
                                }}
                                className={`pb-2 text-sm font-medium transition-colors flex items-center gap-2 ${
                                    activeTab === tab.id
                                        ? 'border-b-2 border-blue-600 text-blue-600'
                                        : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                <Icon className="h-4 w-4" />
                                {tab.label}
                                {tab.id === 'today' && stats.today_appointments > 0 && (
                                    <span className="ml-1 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                                        {stats.today_appointments}
                                    </span>
                                )}
                            </button>
                        )
                    })}
                </div>

                {/* Info Banner */}
                <div className="bg-blue-50 p-4 rounded-xl text-sm text-gray-600 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {activeTab === 'upcoming' && "📅 View and manage your upcoming appointments"}
                        {activeTab === 'today' && `🕒 Today's schedule - You have ${stats.today_appointments} appointment(s) today`}
                        {activeTab === 'past' && "📋 Past appointments history"}
                        {activeTab === 'cancelled' && "❌ Cancelled appointments"}
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                        <Link href="/consultations/appointments">
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Refresh
                        </Link>
                    </Button>
                </div>

                {/* Appointments Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {currentAppointments.length > 0 ? (
                        currentAppointments.map((appointment) => (
                            <AppointmentCard key={appointment.id} appointment={appointment} />
                        ))
                    ) : (
                        <div className="col-span-full text-center py-12">
                            <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500">No {activeTab} appointments found</p>
                            <Button
                                variant="link"
                                onClick={handleNewAppointment}
                                className="mt-2"
                            >
                                Schedule an appointment
                            </Button>
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-2 pt-4">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="gap-1"
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Previous
                        </Button>

                        <div className="flex gap-1">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                <Button
                                    key={page}
                                    variant={currentPage === page ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => handlePageChange(page)}
                                    className={currentPage === page ? "bg-blue-600 hover:bg-blue-700" : ""}
                                >
                                    {page}
                                </Button>
                            ))}
                        </div>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="gap-1"
                        >
                            Next
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                )}

                {/* Showing results info */}
                {filteredAppointments.length > 0 && (
                    <div className="text-center text-sm text-gray-500">
                        Showing {startIndex + 1} to {Math.min(endIndex, filteredAppointments.length)} of {filteredAppointments.length} appointments
                    </div>
                )}

                {/* New Appointment Modal */}
                <Dialog open={appointmentModal} onOpenChange={setAppointmentModal}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Schedule New Appointment</DialogTitle>
                        </DialogHeader>

                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="patient">Patient *</Label>
                                <Select
                                    value={formData.patient_id}
                                    onValueChange={(value) => setFormData({...formData, patient_id: value})}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select patient" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">John Doe</SelectItem>
                                        <SelectItem value="2">Jane Smith</SelectItem>
                                        <SelectItem value="3">Bob Johnson</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="date">Date *</Label>
                                    <Input
                                        id="date"
                                        type="date"
                                        value={formData.date}
                                        onChange={(e) => setFormData({...formData, date: e.target.value})}
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="time">Time *</Label>
                                    <Select
                                        value={formData.time}
                                        onValueChange={(value) => setFormData({...formData, time: value})}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select time" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {['09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
                                              '12:00', '13:00', '13:30', '14:00', '14:30', '15:00',
                                              '15:30', '16:00', '16:30'].map((time) => (
                                                <SelectItem key={time} value={time}>
                                                    {time}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="type">Appointment Type</Label>
                                    <Select
                                        value={formData.type}
                                        onValueChange={(value) => setFormData({...formData, type: value})}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="consultation">Consultation</SelectItem>
                                            <SelectItem value="follow-up">Follow-up</SelectItem>
                                            <SelectItem value="check-up">Check-up</SelectItem>
                                            <SelectItem value="emergency">Emergency</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <Label htmlFor="priority">Priority</Label>
                                    <Select
                                        value={formData.priority}
                                        onValueChange={(value) => setFormData({...formData, priority: value})}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="normal">Normal</SelectItem>
                                            <SelectItem value="urgent">Urgent</SelectItem>
                                            <SelectItem value="emergency">Emergency</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="notes">Notes (Optional)</Label>
                                <Textarea
                                    id="notes"
                                    placeholder="Add any additional notes..."
                                    rows={3}
                                    value={formData.notes}
                                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setAppointmentModal(false)}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSubmitAppointment}
                                disabled={loading}
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Schedule Appointment
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* View Appointment Modal */}
                <Dialog open={viewModal} onOpenChange={setViewModal}>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Appointment Details</DialogTitle>
                        </DialogHeader>

                        {selectedAppointment && (
                            <div className="space-y-4">
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        <Badge className={getStatusColor(selectedAppointment.status)}>
                                            {selectedAppointment.status}
                                        </Badge>
                                        <Badge className={getTypeColor(selectedAppointment.type)}>
                                            {selectedAppointment.type}
                                        </Badge>
                                        {selectedAppointment.priority !== 'normal' && (
                                            <Badge className={getPriorityColor(selectedAppointment.priority)}>
                                                {selectedAppointment.priority}
                                            </Badge>
                                        )}
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <User className="h-4 w-4 text-gray-400" />
                                            <div>
                                                <p className="font-medium">{selectedAppointment.patient_name}</p>
                                                {selectedAppointment.patient_email && (
                                                    <p className="text-xs text-gray-500">{selectedAppointment.patient_email}</p>
                                                )}
                                                {selectedAppointment.patient_phone && (
                                                    <p className="text-xs text-gray-500">{selectedAppointment.patient_phone}</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Stethoscope className="h-4 w-4 text-gray-400" />
                                            <p className="text-sm">Dr. {selectedAppointment.doctor_name}</p>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4 text-gray-400" />
                                            <p className="text-sm">{selectedAppointment.date} at {selectedAppointment.time}</p>
                                        </div>

                                        {selectedAppointment.notes && (
                                            <div className="flex items-start gap-2">
                                                <FileText className="h-4 w-4 text-gray-400 mt-0.5" />
                                                <div>
                                                    <p className="text-xs font-medium text-gray-600">Notes:</p>
                                                    <p className="text-sm text-gray-600">{selectedAppointment.notes}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    {selectedAppointment.status !== 'completed' && selectedAppointment.status !== 'cancelled' && (
                                        <Button
                                            className="flex-1 bg-blue-600 hover:bg-blue-700"
                                            asChild
                                        >
                                            <Link href={`/consultations/${selectedAppointment.id}`}>
                                                Start Consultation
                                            </Link>
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setViewModal(false)}>
                                Close
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    )
}
