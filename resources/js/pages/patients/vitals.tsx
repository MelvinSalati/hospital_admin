import { useState, useEffect } from 'react'
import PatientLayout from "@/layouts/patients/PatientLayout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent } from "@/components/ui/card"
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { format } from 'date-fns'
import {
    Heart,
    Activity,
    Thermometer,
    Ruler,
    Search,
    Calendar,
    Download,
    AlertCircle,
    AlertTriangle,
    Info,
    Droplet,
    TrendingUp,
    TrendingDown,
    Minus,
    Gauge,
    Wind,
    BarChart3,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight
} from 'lucide-react'
import axios from 'axios'
import { usePage, router } from '@inertiajs/react'
import { toast } from 'react-hot-toast'

export default function Vitals({ vitals: initialVitals = [], averages: initialAverages = {} }) {
    // Get patientId from props (Inertia方式)
    const { props } = usePage()
    const patientId = props.patientId || window.location.pathname.split('/').pop()

    const [activeTab, setActiveTab] = useState("all")
    const [searchTerm, setSearchTerm] = useState('')
    const [dateFilter, setDateFilter] = useState('all')
    const [showAlerts, setShowAlerts] = useState(true)
    const [vitalAlerts, setVitalAlerts] = useState([])
    const [vitals, setVitals] = useState(initialVitals)
    const [loading, setLoading] = useState(false)
    const [averages, setAverages] = useState({
        systolic_bp: initialAverages.systolic_bp || 0,
        diastolic_bp: initialAverages.diastolic_bp || 0,
        pulse_rate: initialAverages.pulse_rate || 0,
        respiratory_rate: initialAverages.respiratory_rate || 0,
        spO2: initialAverages.spO2 || 0,
        temperature: initialAverages.temperature || 0,
        bmi: initialAverages.bmi || 0,
        glucose: initialAverages.glucose || 0,
        count: initialAverages.count || 0
    })

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage] = useState(5)

    // Modal state
    const [showAveragesModal, setShowAveragesModal] = useState(false)

    // Thresholds for normal ranges
    const thresholds = {
        systolic_bp: { min: 70, max: 220, normalMin: 90, normalMax: 120 },
        diastolic_bp: { min: 40, max: 130, normalMin: 60, normalMax: 80 },
        pulse_rate: { min: 40, max: 200, normalMin: 60, normalMax: 100 },
        respiratory_rate: { min: 8, max: 40, normalMin: 12, normalMax: 20 },
        spO2: { min: 70, max: 100, normalMin: 95, normalMax: 100 },
        temperature: { min: 35, max: 42, normalMin: 36.5, normalMax: 37.5 },
        glucose: { min: 20, max: 600, normalMin: 70, normalMax: 140 },
        bmi: { normalMin: 18.5, normalMax: 24.9 }
    }

    // Fetch vitals on component mount
    useEffect(() => {
        if (patientId) {
            fetchVitals()
        }
    }, [patientId, dateFilter])

    const fetchVitals = async () => {
        try {
            setLoading(true)
            const response = await axios.get(`/api/v1/vital-signs/history/${patientId}`, {
                params: { filter: dateFilter }
            })
            if (response.data.success) {
                setVitals(response.data.data.data || [])
                checkAbnormalValues(response.data.data.data || [])
                setCurrentPage(1) // Reset to first page on new data

                // Update averages from response if available
                if (response.data.averages) {
                    setAverages({
                        systolic_bp: response.data.averages.systolic_bp || 0,
                        diastolic_bp: response.data.averages.diastolic_bp || 0,
                        pulse_rate: response.data.averages.pulse_rate || 0,
                        respiratory_rate: response.data.averages.respiratory_rate || 0,
                        spO2: response.data.averages.spO2 || 0,
                        temperature: response.data.averages.temperature || 0,
                        bmi: response.data.averages.bmi || 0,
                        glucose: response.data.averages.glucose || 0,
                        count: response.data.averages.count || 0
                    })
                }
            }
        } catch (error) {
            console.error('Error fetching vitals:', error)
            toast.error('Failed to fetch vital signs')
        } finally {
            setLoading(false)
        }
    }

    // Get trend icon based on value
    const getTrendIcon = (value, type) => {
        if (!value || value === 0) return <Minus className="h-4 w-4 text-blue-300" />

        const threshold = thresholds[type]
        if (!threshold) return <Minus className="h-4 w-4 text-blue-300" />

        const numValue = parseFloat(value)

        if (numValue < threshold.normalMin) {
            return <TrendingDown className="h-4 w-4 text-blue-300" />
        } else if (numValue > threshold.normalMax) {
            return <TrendingUp className="h-4 w-4 text-orange-300" />
        } else {
            return <Minus className="h-4 w-4 text-green-300" />
        }
    }

    // Get status color for value
    const getValueStatusColor = (value, type) => {
        if (!value || value === 0) return 'text-white'

        const threshold = thresholds[type]
        if (!threshold) return 'text-white'

        const numValue = parseFloat(value)

        if (numValue < threshold.normalMin) {
            return 'text-blue-100'
        } else if (numValue > threshold.normalMax) {
            return 'text-orange-100'
        } else {
            return 'text-green-100'
        }
    }

    // Check for abnormal values and create alerts
    const checkAbnormalValues = (vitalsData) => {
        const alerts = []
        vitalsData.slice(0, 5).forEach(vital => {
            if (vital.systolic_bp >= 140 || vital.diastolic_bp >= 90) {
                alerts.push({
                    type: 'warning',
                    title: 'High Blood Pressure',
                    message: `BP: ${vital.systolic_bp}/${vital.diastolic_bp} mmHg`,
                    date: vital.recorded_at,
                    severity: 'high'
                })
            }
            if (vital.pulse_rate > 100) {
                alerts.push({
                    type: 'warning',
                    title: 'Tachycardia',
                    message: `Pulse: ${vital.pulse_rate} bpm`,
                    date: vital.recorded_at,
                    severity: 'medium'
                })
            }
            if (vital.pulse_rate < 60 && vital.pulse_rate > 0) {
                alerts.push({
                    type: 'info',
                    title: 'Bradycardia',
                    message: `Pulse: ${vital.pulse_rate} bpm`,
                    date: vital.recorded_at,
                    severity: 'low'
                })
            }
            if (vital.spO2 < 95 && vital.spO2 > 0) {
                alerts.push({
                    type: 'warning',
                    title: 'Low Oxygen Saturation',
                    message: `SpO2: ${vital.spO2}%`,
                    date: vital.recorded_at,
                    severity: 'high'
                })
            }
            if (vital.temperature >= 38) {
                alerts.push({
                    type: 'warning',
                    title: 'Fever',
                    message: `Temp: ${vital.temperature}°C`,
                    date: vital.recorded_at,
                    severity: 'medium'
                })
            }
            if (vital.blood_glucose > 180) {
                alerts.push({
                    type: 'warning',
                    title: 'High Blood Glucose',
                    message: `Glucose: ${vital.blood_glucose} mg/dL`,
                    date: vital.recorded_at,
                    severity: 'high'
                })
            }
            if (vital.blood_glucose < 70 && vital.blood_glucose > 0) {
                alerts.push({
                    type: 'warning',
                    title: 'Low Blood Glucose',
                    message: `Glucose: ${vital.blood_glucose} mg/dL`,
                    date: vital.recorded_at,
                    severity: 'high'
                })
            }
        })
        setVitalAlerts(alerts.slice(0, 3))
    }

    // Filter vitals based on search, date, and tab
    const filteredVitals = vitals.filter(vital => {
        const matchesSearch = searchTerm === '' ||
            (vital.recorder?.name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (vital.notes?.toLowerCase().includes(searchTerm.toLowerCase()))

        let matchesDate = true
        const vitalDate = new Date(vital.recorded_at || vital.created_at)
        const today = new Date()

        switch(dateFilter) {
            case 'today':
                matchesDate = vitalDate.toDateString() === today.toDateString()
                break
            case 'week':
                const weekAgo = new Date(today.setDate(today.getDate() - 7))
                matchesDate = vitalDate >= weekAgo
                break
            case 'month':
                const monthAgo = new Date(today.setMonth(today.getMonth() - 1))
                matchesDate = vitalDate >= monthAgo
                break
            default:
                matchesDate = true
        }

        let matchesTab = true
        switch(activeTab) {
            case 'bp':
                matchesTab = vital.systolic_bp && vital.diastolic_bp
                break
            case 'pulse':
                matchesTab = vital.pulse_rate
                break
            case 'temp':
                matchesTab = vital.temperature
                break
            case 'oxygen':
                matchesTab = vital.spO2
                break
            case 'glucose':
                matchesTab = vital.blood_glucose
                break
            case 'body':
                matchesTab = vital.height || vital.weight || vital.bmi
                break
            default:
                matchesTab = true
        }

        return matchesSearch && matchesDate && matchesTab
    })

    // Pagination logic
    const totalPages = Math.ceil(filteredVitals.length / itemsPerPage)
    const indexOfLastItem = currentPage * itemsPerPage
    const indexOfFirstItem = indexOfLastItem - itemsPerPage
    const currentVitals = filteredVitals.slice(indexOfFirstItem, indexOfLastItem)

    // Pagination handlers
    const goToFirstPage = () => setCurrentPage(1)
    const goToLastPage = () => setCurrentPage(totalPages)
    const goToPreviousPage = () => setCurrentPage(prev => Math.max(prev - 1, 1))
    const goToNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages))
    const goToPage = (page) => setCurrentPage(page)

    const getVitalStatus = (vital) => {
        if (vital.systolic_bp && vital.diastolic_bp) {
            const systolic = vital.systolic_bp
            const diastolic = vital.diastolic_bp
            if (systolic >= 140 || diastolic >= 90) return 'text-red-600 font-semibold'
            if (systolic >= 130 || diastolic >= 80) return 'text-yellow-600 font-semibold'
            return 'text-green-600 font-semibold'
        }
        return ''
    }

    const getAlertIcon = (type) => {
        switch(type) {
            case 'warning': return <AlertTriangle className="h-4 w-4 text-red-500" />
            case 'info': return <Info className="h-4 w-4 text-blue-500" />
            default: return <AlertCircle className="h-4 w-4 text-yellow-500" />
        }
    }

    const handleExport = () => {
        const csvData = filteredVitals.map(vital => ({
            'Date': format(new Date(vital.recorded_at || vital.created_at), 'dd/MM/yyyy HH:mm'),
            'BP': vital.systolic_bp && vital.diastolic_bp ? `${vital.systolic_bp}/${vital.diastolic_bp}` : '',
            'Pulse': vital.pulse_rate,
            'Respiratory Rate': vital.respiratory_rate,
            'SpO2': vital.spO2,
            'Temperature': vital.temperature,
            'Glucose': vital.blood_glucose,
            'BMI': vital.bmi,
            'Pain Level': vital.pain_level,
        }))

        const csv = convertToCSV(csvData)
        downloadCSV(csv, `vitals_patient_${patientId}_${format(new Date(), 'yyyyMMdd')}.csv`)
    }

    const convertToCSV = (data) => {
        if (data.length === 0) return ''
        const headers = Object.keys(data[0])
        const rows = data.map(obj => headers.map(header => JSON.stringify(obj[header] || '')).join(','))
        return [headers.join(','), ...rows].join('\n')
    }

    const downloadCSV = (csv, filename) => {
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        a.click()
        window.URL.revokeObjectURL(url)
    }

    const goToCreateVitals = () => {
        router.visit(`vital-signs/create/${patientId}`)
    }

    // Average card configuration for modal
    const averageCards = [
        {
            label: 'SBP/DBP',
            value: `${averages.systolic_bp}/${averages.diastolic_bp}`,
            unit: 'mmHg',
            icon: Activity,
            type: 'bp',
            tooltip: 'Average Systolic/Diastolic Blood Pressure',
            normalRange: '90-120/60-80'
        },
        {
            label: 'Pulse',
            value: averages.pulse_rate,
            unit: 'bpm',
            icon: Heart,
            type: 'pulse_rate',
            tooltip: 'Average Heart Rate',
            normalRange: '60-100'
        },
        {
            label: 'Resp',
            value: averages.respiratory_rate,
            unit: '/min',
            icon: Wind,
            type: 'respiratory_rate',
            tooltip: 'Average Respiratory Rate',
            normalRange: '12-20'
        },
        {
            label: 'SpO₂',
            value: averages.spO2,
            unit: '%',
            icon: Droplet,
            type: 'spO2',
            tooltip: 'Average Oxygen Saturation',
            normalRange: '≥95'
        },
        {
            label: 'Temp',
            value: averages.temperature,
            unit: '°C',
            icon: Thermometer,
            type: 'temperature',
            tooltip: 'Average Body Temperature',
            normalRange: '36.5-37.5'
        },
        {
            label: 'Glucose',
            value: averages.glucose,
            unit: 'mg/dL',
            icon: Droplet,
            type: 'glucose',
            tooltip: 'Average Blood Glucose',
            normalRange: '70-140'
        },
        {
            label: 'BMI',
            value: averages.bmi,
            unit: 'kg/m²',
            icon: Ruler,
            type: 'bmi',
            tooltip: 'Average Body Mass Index',
            normalRange: '18.5-24.9'
        }
    ]

    return (
        <PatientLayout breadcrumbs={[{ title: 'Patient', href: '' }, { title: 'Vital Signs', href: '' }]}>
            <div className="min-h-screen bg-gray-100">
                <div className="container mx-auto px-4 py-6 space-y-6">
                    {/* Alerts Section */}
                    {showAlerts && vitalAlerts.length > 0 && (
                        <Card className="border-l-4 border-red-500 shadow-md">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                        <AlertCircle className="h-5 w-5 text-red-500" />
                                        Recent Alerts ({vitalAlerts.length})
                                    </h3>
                                    <button
                                        onClick={() => setShowAlerts(false)}
                                        className="text-sm text-gray-500 hover:text-gray-700"
                                    >
                                        Dismiss
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {vitalAlerts.map((alert, index) => (
                                        <Alert key={index} variant={alert.type === 'warning' ? 'destructive' : 'default'} className="border-0 bg-gray-50">
                                            <div className="flex items-start gap-2">
                                                {getAlertIcon(alert.type)}
                                                <div>
                                                    <AlertTitle className="font-semibold">{alert.title}</AlertTitle>
                                                    <AlertDescription>
                                                        {alert.message} - {format(new Date(alert.date), 'dd/MM/yyyy HH:mm')}
                                                    </AlertDescription>
                                                </div>
                                            </div>
                                        </Alert>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Filters Section */}
                    <Card>
                        <CardContent className="p-5">
                            <div className="flex flex-col sm:flex-row gap-4">
                                <div className="flex-1 relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                        type="text"
                                        placeholder="Search by recorder or notes..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10 w-full border-gray-200 focus:border-blue-400 focus:ring-blue-400 rounded-lg"
                                    />
                                </div>

                                <div className="relative">
                                    <select
                                        value={dateFilter}
                                        onChange={(e) => setDateFilter(e.target.value)}
                                        className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    >
                                        <option value="all">All Time</option>
                                        <option value="today">Today</option>
                                        <option value="week">Last 7 Days</option>
                                        <option value="month">Last 30 Days</option>
                                        <option value="3months">Last 3 Months</option>
                                    </select>
                                    <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                                </div>

                                <Button
                                    variant="outline"
                                    className="flex items-center gap-2 border-gray-200 hover:bg-gray-50 hover:border-blue-300 transition-colors"
                                    onClick={handleExport}
                                >
                                    <Download className="h-4 w-4" />
                                    Export CSV
                                </Button>
                            </div>

                            {/* Tab Filters */}
                            <div className="flex flex-wrap gap-2 mt-4">
                                {[
                                    { id: 'all', label: 'All', count: vitals.length },
                                    { id: 'bp', label: 'BP' },
                                    { id: 'pulse', label: 'Pulse & O2' },
                                    { id: 'temp', label: 'Temperature' },
                                    { id: 'glucose', label: 'Glucose' },
                                    { id: 'body', label: 'Body' }
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`
                                            px-4 py-2 rounded-full text-sm font-medium transition-all duration-200
                                            ${activeTab === tab.id
                                                ? 'bg-gray-900 text-white shadow-md hover:shadow-lg transform hover:-translate-y-0.5'
                                                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200 hover:border-gray-300'
                                            }
                                        `}
                                    >
                                        {tab.label}
                                        {tab.count !== undefined && (
                                            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                                                activeTab === tab.id
                                                    ? 'bg-white/20 text-white'
                                                    : 'bg-gray-200 text-gray-600'
                                            }`}>
                                                {tab.count}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Vitals Table */}
                    <Card className="overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        {['Date/Time', 'BP (mmHg)', 'Pulse', 'Resp', 'SpO₂ (%)', 'Temp (°C)', 'Glucose', 'BMI'].map((header, index) => (
                                            <th
                                                key={index}
                                                scope="col"
                                                className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
                                            >
                                                {header}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {currentVitals.length > 0 ? (
                                        currentVitals.map((vital, index) => (
                                            <tr
                                                key={vital.id}
                                                className={`hover:bg-gray-50 transition-all duration-200 ${
                                                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                                                }`}
                                            >
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    {format(new Date(vital.recorded_at || vital.created_at), 'dd/MM/yyyy HH:mm')}
                                                </td>
                                                <td className={`px-6 py-4 whitespace-nowrap text-sm ${getVitalStatus(vital)}`}>
                                                    {vital.systolic_bp && vital.diastolic_bp
                                                        ? `${vital.systolic_bp}/${vital.diastolic_bp}`
                                                        : '-'
                                                    }
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    <span className={`px-2 py-1 rounded-full ${
                                                        vital.pulse_rate > 100 || vital.pulse_rate < 60
                                                            ? 'bg-red-100 text-red-700 font-semibold'
                                                            : vital.pulse_rate ? 'bg-green-100 text-green-700' : ''
                                                    }`}>
                                                        {vital.pulse_rate ? `${vital.pulse_rate}` : '-'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    <span className={vital.respiratory_rate > 20 ? 'text-orange-600 font-semibold' : 'text-gray-600'}>
                                                        {vital.respiratory_rate ? `${vital.respiratory_rate}` : '-'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    <span className={`px-2 py-1 rounded-full ${
                                                        vital.spO2 < 95
                                                            ? 'bg-red-100 text-red-700 font-semibold'
                                                            : vital.spO2 ? 'bg-green-100 text-green-700' : ''
                                                    }`}>
                                                        {vital.spO2 ? `${vital.spO2}%` : '-'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    <span className={`px-2 py-1 rounded-full ${
                                                        vital.temperature >= 38
                                                            ? 'bg-orange-100 text-orange-700 font-semibold'
                                                            : vital.temperature ? 'bg-green-100 text-green-700' : ''
                                                    }`}>
                                                        {vital.temperature ? `${vital.temperature}°C` : '-'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    <span className={`px-2 py-1 rounded-full ${
                                                        vital.blood_glucose > 140 || vital.blood_glucose < 70
                                                            ? 'bg-yellow-100 text-yellow-700 font-semibold'
                                                            : vital.blood_glucose ? 'bg-green-100 text-green-700' : ''
                                                    }`}>
                                                        {vital.blood_glucose || '-'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    <span className={`px-2 py-1 rounded-full ${
                                                        vital.bmi >= 25 || (vital.bmi < 18.5 && vital.bmi > 0)
                                                            ? 'bg-yellow-100 text-yellow-700 font-semibold'
                                                            : vital.bmi ? 'bg-green-100 text-green-700' : ''
                                                    }`}>
                                                        {vital.bmi || '-'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={8} className="px-6 py-12 text-center">
                                                <div className="flex flex-col items-center justify-center text-gray-500">
                                                    <Heart className="h-16 w-16 text-gray-300 mb-4" />
                                                    <p className="text-xl font-medium text-gray-400">No vital signs found</p>
                                                    <p className="text-sm mt-2 text-gray-400">
                                                        {searchTerm || dateFilter !== 'all' || activeTab !== 'all'
                                                            ? 'Try adjusting your filters'
                                                            : 'No vital signs recorded for this patient yet'
                                                        }
                                                    </p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>

                    {/* Custom Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 bg-white rounded-lg shadow-sm">
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-700">
                                    Page <span className="font-medium">{currentPage}</span> of <span className="font-medium">{totalPages}</span>
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={goToFirstPage}
                                    disabled={currentPage === 1}
                                    className="hidden sm:flex"
                                >
                                    <ChevronsLeft className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={goToPreviousPage}
                                    disabled={currentPage === 1}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>

                                {/* Page Numbers */}
                                <div className="hidden sm:flex items-center gap-1">
                                    {[...Array(totalPages)].map((_, i) => {
                                        const page = i + 1
                                        // Show current page, first, last, and pages around current
                                        if (
                                            page === 1 ||
                                            page === totalPages ||
                                            (page >= currentPage - 1 && page <= currentPage + 1)
                                        ) {
                                            return (
                                                <Button
                                                    key={page}
                                                    variant={currentPage === page ? "default" : "outline"}
                                                    size="sm"
                                                    onClick={() => goToPage(page)}
                                                    className={currentPage === page ? "bg-gray-600 hover:bg-gray-700" : ""}
                                                >
                                                    {page}
                                                </Button>
                                            )
                                        } else if (
                                            page === currentPage - 2 ||
                                            page === currentPage + 2
                                        ) {
                                            return <span key={page} className="px-2">...</span>
                                        }
                                        return null
                                    })}
                                </div>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={goToNextPage}
                                    disabled={currentPage === totalPages}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={goToLastPage}
                                    disabled={currentPage === totalPages}
                                    className="hidden sm:flex"
                                >
                                    <ChevronsRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Show Alerts Button if hidden */}
                    {!showAlerts && vitalAlerts.length > 0 && (
                        <div className="fixed bottom-6 right-6 animate-bounce">
                            <Button
                                onClick={() => setShowAlerts(true)}
                                className="bg-red-600 hover:bg-red-700 text-white rounded-full p-4 shadow-xl flex items-center gap-2"
                            >
                                <AlertCircle className="h-5 w-5" />
                                <span className="font-semibold">{vitalAlerts.length} Active Alerts</span>
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </PatientLayout>
    )
}