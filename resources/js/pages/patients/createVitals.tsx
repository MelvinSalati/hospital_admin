import { useState, useEffect } from 'react'
import PatientLayout from "@/layouts/patients/PatientLayout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
    Heart,
    Activity,
    Thermometer,
    Ruler,
    AlertCircle,
    AlertTriangle,
    Info,
    Droplet,
    ArrowLeft,
    Save,
    RefreshCw,
    Calendar,
    XCircle,
    Wind,
    Clock,
    Baby,
    Ruler as RulerIcon,
    Gauge
} from 'lucide-react'
import { usePage, router } from '@inertiajs/react'
import { format } from 'date-fns'
import Notiflix from 'notiflix'
import http from '@/utils/http'

// Configure Notiflix
Notiflix.Notify.init({
    position: 'right-top',
    timeout: 4000,
    clickToClose: true,
    success: { background: '#10b981', textColor: '#fff' },
    failure: { background: '#ef4444', textColor: '#fff' },
    warning: { background: '#f59e0b', textColor: '#fff' },
    info: { background: '#3b82f6', textColor: '#fff' },
})




export default function CreateVitals() {
    // Get patientId from URL
    const { props } = usePage()
    const patientId = props.patientId || window.location.pathname.split('/').pop()

    const [loading, setLoading] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [patient, setPatient] = useState(null)
    const [activeTab, setActiveTab] = useState("bp")
    const [validationErrors, setValidationErrors] = useState({})
    const [abnormalWarnings, setAbnormalWarnings] = useState({})
    const [showWarningSummary, setShowWarningSummary] = useState(false)
    const [bypassWarning, setBypassWarning] = useState(false)
    const [formProgress, setFormProgress] = useState(0)

    const [formData, setFormData] = useState({
        systolic_bp: '', diastolic_bp: '', pulse_rate: '', respiratory_rate: '',
        spO2: '', temperature: '', blood_glucose: '', height: '', weight: '', bmi: '',
        head_circumference: '', chest_circumference: '', abdominal_circumference: '',
        hip_circumference: '', waist_circumference: '', bmi_percentile: '', growth_percentile: '',
        pain_level: '', notes: '', position: 'sitting', cuff_size: 'medium', arm_used: 'left',
        recorded_at: new Date().toISOString().slice(0, 16)
    })

    // Validation thresholds
    const thresholds = {
        systolic_bp: { min: 70, max: 220, normalMin: 90, normalMax: 120, unit: 'mmHg', label: 'Systolic BP' },
        diastolic_bp: { min: 40, max: 130, normalMin: 60, normalMax: 80, unit: 'mmHg', label: 'Diastolic BP' },
        pulse_rate: { min: 40, max: 200, normalMin: 60, normalMax: 100, unit: 'bpm', label: 'Pulse Rate' },
        respiratory_rate: { min: 8, max: 40, normalMin: 12, normalMax: 20, unit: '/min', label: 'Respiratory Rate' },
        spO2: { min: 70, max: 100, normalMin: 95, normalMax: 100, unit: '%', label: 'Oxygen Saturation' },
        temperature: { min: 35, max: 42, normalMin: 36.5, normalMax: 37.5, unit: '°C', label: 'Temperature' },
        blood_glucose: { min: 20, max: 600, normalMin: 70, normalMax: 140, unit: 'mg/dL', label: 'Blood Glucose' },
        bmi: { normalMin: 18.5, normalMax: 24.9, unit: 'kg/m²', label: 'BMI' },
        pain_level: { min: 0, max: 10, label: 'Pain Level' }
    }

    useEffect(() => {
        if (patientId) fetchPatientDetails()
        else Notiflix.Notify.failure('Patient ID not found')
    }, [patientId])

    useEffect(() => {
        const requiredFields = ['systolic_bp', 'diastolic_bp', 'pulse_rate', 'spO2', 'temperature']
        const filledFields = requiredFields.filter(field => formData[field]).length
        setFormProgress((filledFields / requiredFields.length) * 100)
    }, [formData])

    const fetchPatientDetails = async () => {
        try {
            setLoading(true)
            const response = await http.get(`/patients/${patientId}`)
            setPatient(response.data)
            Notiflix.Loading.remove()
        } catch (error) {
            Notiflix.Loading.remove()
            Notiflix.Notify.failure('Failed to load patient details')
        } finally {
            setLoading(false)
        }
    }

    const validateField = (name, value) => {
        if (!value) return { isValid: true, error: '', warning: '' }

        const numValue = parseFloat(value)
        const threshold = thresholds[name]
        if (!threshold) return { isValid: true, error: '', warning: '' }

        if (threshold.min !== undefined && (numValue < threshold.min || numValue > threshold.max)) {
            return {
                isValid: false,
                error: `${threshold.label} must be between ${threshold.min}-${threshold.max} ${threshold.unit || ''}`,
                warning: ''
            }
        }

        if (threshold.normalMin !== undefined && threshold.normalMax !== undefined) {
            if (numValue < threshold.normalMin) {
                return { isValid: true, error: '', warning: `Low (Normal: ${threshold.normalMin}-${threshold.normalMax})` }
            }
            if (numValue > threshold.normalMax) {
                return { isValid: true, error: '', warning: `High (Normal: ${threshold.normalMin}-${threshold.normalMax})` }
            }
        }

        return { isValid: true, error: '', warning: '' }
    }

    const handleInputChange = (e) => {
        const { name, value } = e.target

        const validation = validateField(name, value)
        setValidationErrors(prev => ({ ...prev, [name]: validation.error }))
        setAbnormalWarnings(prev => ({ ...prev, [name]: validation.warning }))

        setFormData(prev => {
            const newData = { ...prev, [name]: value }

            if (name === 'height' || name === 'weight') {
                const height = parseFloat(name === 'height' ? value : prev.height)
                const weight = parseFloat(name === 'weight' ? value : prev.weight)
                if (height && weight && height > 0) {
                    const heightInMeters = height / 100
                    const bmi = (weight / (heightInMeters * heightInMeters)).toFixed(2)
                    newData.bmi = bmi

                    const bmiNum = parseFloat(bmi)
                    if (bmiNum < thresholds.bmi.normalMin) {
                        setAbnormalWarnings(prev => ({ ...prev, bmi: `Underweight: BMI ${bmiNum}` }))
                    } else if (bmiNum > thresholds.bmi.normalMax) {
                        setAbnormalWarnings(prev => ({ ...prev, bmi: `Overweight: BMI ${bmiNum}` }))
                    } else {
                        setAbnormalWarnings(prev => ({ ...prev, bmi: '' }))
                    }
                }
            }
            return newData
        })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        // Check for validation errors
        if (Object.values(validationErrors).some(error => error)) {
            Notiflix.Notify.warning('Please fix validation errors before submitting')
            return
        }

        // Check for abnormal values if not bypassing
        const warnings = Object.values(abnormalWarnings).filter(w => w)
        if (warnings.length > 0 && !bypassWarning) {
            setShowWarningSummary(true)
            window.scrollTo({ top: 0, behavior: 'smooth' })
            return
        }

        // Submit the form
        await submitToApi()
    }

    const submitToApi = async () => {
        try {
            setSubmitting(true)

            const response = await http.post(`/vital-signs/create/${patientId}`, {
                ...formData,
                patient_id: patientId,
                recorded_at: formData.recorded_at || new Date().toISOString()
            })

            if (response.data.status === 201) {

                Notiflix.Notify.success('Vital signs recorded successfully!')
                setTimeout(() => router.visit(`/patients/vital-signs/${patientId}`), 1000)
            }
        } catch (error) {

            if (error.response?.data?.errors) {
                setValidationErrors(error.response.data.errors)
                Notiflix.Notify.failure('Please check the form for errors')
            } else {
                Notiflix.Notify.failure(error.response?.data?.message || 'Failed to record vital signs')
            }
        } finally {
            setSubmitting(false)
            setBypassWarning(false)
        }
    }

    const handleContinueAnyway = () => {
        setBypassWarning(true)
        setShowWarningSummary(false)
        // Submit directly without validation
        submitToApi()
    }

    const resetForm = () => {
        setFormData({
            systolic_bp: '', diastolic_bp: '', pulse_rate: '', respiratory_rate: '',
            spO2: '', temperature: '', blood_glucose: '', height: '', weight: '', bmi: '',
            head_circumference: '', chest_circumference: '', abdominal_circumference: '',
            hip_circumference: '', waist_circumference: '', bmi_percentile: '', growth_percentile: '',
            pain_level: '', notes: '', position: 'sitting', cuff_size: 'medium', arm_used: 'left',
            recorded_at: new Date().toISOString().slice(0, 16)
        })
        setValidationErrors({})
        setAbnormalWarnings({})
        setShowWarningSummary(false)
        setBypassWarning(false)
        Notiflix.Notify.success('Form has been reset')
    }

    const getFieldClassName = (fieldName) => {
        if (validationErrors[fieldName]) return 'border-red-500 focus:ring-red-500'
        if (abnormalWarnings[fieldName]) return 'border-yellow-500 focus:ring-yellow-500'
        if (formData[fieldName]) return 'border-green-500 focus:ring-green-500'
        return 'border-gray-300 focus:ring-blue-500'
    }

    const getBPClassification = (systolic, diastolic) => {
        if (!systolic || !diastolic) return null
        const sys = parseFloat(systolic)
        const dias = parseFloat(diastolic)

        if (sys < 120 && dias < 80) return { text: 'Normal', color: 'text-green-600', bg: 'bg-green-50' }
        if (sys >= 120 && sys < 140 && dias < 90) return { text: 'Elevated', color: 'text-yellow-600', bg: 'bg-yellow-50' }
        if (sys >= 140 || dias >= 90) return { text: 'High', color: 'text-red-600', bg: 'bg-red-50' }
        return null
    }



    return (
        <PatientLayout  breadcrumbs={[{title:'Patient', href:''},{title:'Vital Signs',href:''}]}>
            <div className="min-h-screen ">
            {/* Warning Summary */}
                {showWarningSummary && (
                    <div className="container mx-auto px-4 py-4">
                        <Alert className="border-yellow-500 bg-yellow-50">
                            <AlertTriangle className="h-5 w-5 text-yellow-600" />
                            <AlertTitle className="text-yellow-800 font-semibold">Abnormal Values Detected</AlertTitle>
                            <AlertDescription>
                                <ul className="list-disc list-inside mt-2 space-y-1 text-yellow-700">
                                    {Object.values(abnormalWarnings).filter(w => w).map((warning, index) => (
                                        <li key={index}>{warning}</li>
                                    ))}
                                </ul>
                                <div className="flex gap-3 mt-4">
                                    <Button onClick={handleContinueAnyway} disabled={submitting} className="bg-yellow-600 hover:bg-yellow-700 text-white">
                                        {submitting ? 'Saving...' : 'Continue Anyway'}
                                    </Button>
                                    <Button variant="outline" onClick={() => setShowWarningSummary(false)} className="border-yellow-300 text-yellow-700">
                                        Review Values
                                    </Button>
                                </div>
                            </AlertDescription>
                        </Alert>
                    </div>
                )}

                {/* Main Form */}
                <div className="container mx-auto px-4 py-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Tabs */}
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                            <TabsList className="grid grid-cols-2 md:grid-cols-7 gap-2 bg-transparent h-auto p-0">
                                <TabsTrigger value="bp" className="data-[state=active]:bg-black data-[state=active]:text-white border border-blue-200 text-gray-500 hover:bg-blue-100 font-semibold py-2 rounded-lg">
                                    <Activity className="h-4 w-4 mr-2" /> BP
                                </TabsTrigger>
                                <TabsTrigger value="pulse" className="data-[state=active]:bg-black data-[state=active]:text-white border border-blue-200 text-gray-500 hover:bg-blue-100 font-semibold py-2 rounded-lg">
                                    <Heart className="h-4 w-4 mr-2" /> Pulse & O2
                                </TabsTrigger>
                                <TabsTrigger value="temp" className="data-[state=active]:bg-black data-[state=active]:text-white border border-blue-200 text-gray-500 hover:bg-blue-100 font-semibold py-2 rounded-lg">
                                    <Thermometer className="h-4 w-4 mr-2" /> Temperature
                                </TabsTrigger>
                                <TabsTrigger value="glucose" className="data-[state=active]:bg-black data-[state=active]:text-white border border-blue-200 text-gray-500 hover:bg-blue-100 font-semibold py-2 rounded-lg">
                                    <Droplet className="h-4 w-4 mr-2" /> Glucose
                                </TabsTrigger>
                                <TabsTrigger value="body" className="data-[state=active]:bg-black data-[state=active]:text-white border border-blue-200 text-gray-500 hover:bg-blue-100 font-semibold py-2 rounded-lg">
                                    <Ruler className="h-4 w-4 mr-2" /> Body
                                </TabsTrigger>
                                <TabsTrigger value="circumference" className="data-[state=active]:bg-black data-[state=active]:text-white border border-blue-200 text-gray-500 hover:bg-blue-100 font-semibold py-2 rounded-lg">
                                    <Gauge className="h-4 w-4 mr-2" /> Circumferences
                                </TabsTrigger>
                                <TabsTrigger value="additional" className="data-[state=active]:bg-black data-[state=active]:text-white border border-blue-200 text-gray-500 hover:bg-blue-100 font-semibold py-2 rounded-lg">
                                    <Info className="h-4 w-4 mr-2" /> Additional
                                </TabsTrigger>
                            </TabsList>

                            {/* Body Measurements Tab */}
                            <TabsContent value="body">
                                <Card>

                                    <CardContent className="pt-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <Label>Height (cm)</Label>
                                                <Input
                                                    name="height"
                                                    type="number"
                                                    step="0.1"
                                                    placeholder="170"
                                                    value={formData.height}
                                                    onChange={handleInputChange}
                                                    className={getFieldClassName('height')}
                                                />
                                            </div>
                                            <div>
                                                <Label>Weight (kg)</Label>
                                                <Input
                                                    name="weight"
                                                    type="number"
                                                    step="0.1"
                                                    placeholder="70"
                                                    value={formData.weight}
                                                    onChange={handleInputChange}
                                                    className={getFieldClassName('weight')}
                                                />
                                            </div>
                                            <div>
                                                <Label className="flex items-center justify-between">
                                                    <span>BMI</span>
                                                    <span className="text-xs bg-blue-100 text-gray-500 px-2 py-1 rounded-full">Normal: 18.5-24.9</span>
                                                </Label>
                                                <Input
                                                    name="bmi"
                                                    type="number"
                                                    value={formData.bmi}
                                                    readOnly
                                                    className={`bg-gray-50 ${getFieldClassName('bmi')}`}
                                                />
                                                {abnormalWarnings.bmi && (
                                                    <p className="text-xs text-yellow-600 font-semibold mt-1">{abnormalWarnings.bmi}</p>
                                                )}
                                            </div>
                                            <div>
                                                <Label>BMI Percentile (%) - Pediatrics</Label>
                                                <Input
                                                    name="bmi_percentile"
                                                    type="number"
                                                    min="1"
                                                    max="99"
                                                    placeholder="50"
                                                    value={formData.bmi_percentile}
                                                    onChange={handleInputChange}
                                                />
                                            </div>
                                            <div>
                                                <Label>Growth Percentile (%) - Pediatrics</Label>
                                                <Input
                                                    name="growth_percentile"
                                                    type="number"
                                                    min="1"
                                                    max="99"
                                                    placeholder="50"
                                                    value={formData.growth_percentile}
                                                    onChange={handleInputChange}
                                                />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* Other tabs remain the same - I've omitted them for brevity but keep all other tabs as they were */}
                            {/* Blood Pressure Tab */}
                            <TabsContent value="bp">
                                <Card>

                                    <CardContent className="space-y-6 pt-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <Label htmlFor="systolic_bp" className="flex items-center justify-between">
                                                    <span>Systolic BP (mmHg)</span>
                                                    <span className="text-xs bg-blue-100 text-gray-500 px-2 py-1 rounded-full">Normal: &lt;120</span>
                                                </Label>
                                                <Input
                                                    id="systolic_bp" name="systolic_bp" type="number" placeholder="120"
                                                    value={formData.systolic_bp} onChange={handleInputChange}
                                                    className={getFieldClassName('systolic_bp')}
                                                />
                                                {validationErrors.systolic_bp && <p className="text-xs text-red-500 mt-1">{validationErrors.systolic_bp}</p>}
                                                {abnormalWarnings.systolic_bp && !validationErrors.systolic_bp &&
                                                    <p className="text-xs text-yellow-500 mt-1">{abnormalWarnings.systolic_bp}</p>}
                                            </div>
                                            <div>
                                                <Label htmlFor="diastolic_bp" className="flex items-center justify-between">
                                                    <span>Diastolic BP (mmHg)</span>
                                                    <span className="text-xs bg-blue-100 text-gray-500 px-2 py-1 rounded-full">Normal: &lt;80</span>
                                                </Label>
                                                <Input
                                                    id="diastolic_bp" name="diastolic_bp" type="number" placeholder="80"
                                                    value={formData.diastolic_bp} onChange={handleInputChange}
                                                    className={getFieldClassName('diastolic_bp')}
                                                />
                                                {validationErrors.diastolic_bp && <p className="text-xs text-red-500 mt-1">{validationErrors.diastolic_bp}</p>}
                                                {abnormalWarnings.diastolic_bp && !validationErrors.diastolic_bp &&
                                                    <p className="text-xs text-yellow-500 mt-1">{abnormalWarnings.diastolic_bp}</p>}
                                            </div>
                                        </div>

                                        {formData.systolic_bp && formData.diastolic_bp && (
                                            <div className={`p-4 rounded-lg ${getBPClassification(formData.systolic_bp, formData.diastolic_bp)?.bg || 'bg-gray-50'}`}>
                                                <p className={`text-sm font-medium ${getBPClassification(formData.systolic_bp, formData.diastolic_bp)?.color || 'text-gray-600'}`}>
                                                    Classification: {getBPClassification(formData.systolic_bp, formData.diastolic_bp)?.text || 'Unable to classify'}
                                                </p>
                                            </div>
                                        )}

                                        <Separator className="bg-blue-100" />

                                        <div>
                                            <Label>Patient Position</Label>
                                            <select name="position" value={formData.position} onChange={handleInputChange} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2">
                                                <option value="sitting">Sitting</option>
                                                <option value="standing">Standing</option>
                                                <option value="lying">Lying</option>
                                                <option value="unknown">Unknown</option>
                                            </select>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <Label>Cuff Size</Label>
                                                <select name="cuff_size" value={formData.cuff_size} onChange={handleInputChange} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2">
                                                    <option value="small">Small</option>
                                                    <option value="medium">Medium</option>
                                                    <option value="large">Large</option>
                                                    <option value="extra_large">Extra Large</option>
                                                </select>
                                            </div>
                                            <div>
                                                <Label>Arm Used</Label>
                                                <select name="arm_used" value={formData.arm_used} onChange={handleInputChange} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2">
                                                    <option value="left">Left</option>
                                                    <option value="right">Right</option>
                                                </select>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* Pulse & Oxygen Tab */}
                            <TabsContent value="pulse">
                                <Card>
                                    <CardContent className="pt-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <Label className="flex items-center justify-between">
                                                    <span>Pulse Rate (bpm)</span>
                                                    <span className="text-xs bg-blue-100 text-gray-500 px-2 py-1 rounded-full">Normal: 60-100</span>
                                                </Label>
                                                <Input name="pulse_rate" type="number" placeholder="72" value={formData.pulse_rate} onChange={handleInputChange} className={getFieldClassName('pulse_rate')} />
                                                {validationErrors.pulse_rate && <p className="text-xs text-red-500 mt-1">{validationErrors.pulse_rate}</p>}
                                                {abnormalWarnings.pulse_rate && !validationErrors.pulse_rate &&
                                                    <p className="text-xs text-yellow-500 mt-1">{abnormalWarnings.pulse_rate}</p>}
                                            </div>
                                            <div>
                                                <Label className="flex items-center justify-between">
                                                    <span>Respiratory Rate (/min)</span>
                                                    <span className="text-xs bg-blue-100 text-gray-500 px-2 py-1 rounded-full">Normal: 12-20</span>
                                                </Label>
                                                <Input name="respiratory_rate" type="number" placeholder="16" value={formData.respiratory_rate} onChange={handleInputChange} className={getFieldClassName('respiratory_rate')} />
                                                {validationErrors.respiratory_rate && <p className="text-xs text-red-500 mt-1">{validationErrors.respiratory_rate}</p>}
                                                {abnormalWarnings.respiratory_rate && !validationErrors.respiratory_rate &&
                                                    <p className="text-xs text-yellow-500 mt-1">{abnormalWarnings.respiratory_rate}</p>}
                                            </div>
                                            <div>
                                                <Label className="flex items-center justify-between">
                                                    <span>SpO₂ (%)</span>
                                                    <span className="text-xs bg-blue-100 text-gray-500 px-2 py-1 rounded-full">Normal: ≥95</span>
                                                </Label>
                                                <Input name="spO2" type="number" placeholder="98" value={formData.spO2} onChange={handleInputChange} className={getFieldClassName('spO2')} />
                                                {validationErrors.spO2 && <p className="text-xs text-red-500 mt-1">{validationErrors.spO2}</p>}
                                                {abnormalWarnings.spO2 && !validationErrors.spO2 &&
                                                    <p className="text-xs text-yellow-500 mt-1">{abnormalWarnings.spO2}</p>}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* Temperature Tab */}
                            <TabsContent value="temp">
                                <Card>
                                    <CardContent className="pt-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <Label className="flex items-center justify-between">
                                                    <span>Temperature (°C)</span>
                                                    <span className="text-xs bg-blue-100 text-gray-500 px-2 py-1 rounded-full">Normal: 36.5-37.5</span>
                                                </Label>
                                                <Input name="temperature" type="number" step="0.1" placeholder="36.6" value={formData.temperature} onChange={handleInputChange} className={getFieldClassName('temperature')} />
                                                {validationErrors.temperature && <p className="text-xs text-red-500 mt-1">{validationErrors.temperature}</p>}
                                                {abnormalWarnings.temperature && !validationErrors.temperature &&
                                                    <p className="text-xs text-yellow-500 mt-1">{abnormalWarnings.temperature}</p>}
                                            </div>
                                            <div>
                                                <Label className="flex items-center justify-between">
                                                    <span>Pain Level (0-10)</span>
                                                    <span className="text-xs bg-blue-100 text-gray-500 px-2 py-1 rounded-full">0=No pain, 10=Worst</span>
                                                </Label>
                                                <Input name="pain_level" type="number" min="0" max="10" placeholder="0" value={formData.pain_level} onChange={handleInputChange} className={getFieldClassName('pain_level')} />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* Glucose Tab */}
                            <TabsContent value="glucose">
                                <Card>
                                    <CardContent className="pt-6">
                                        <div className="max-w-md">
                                            <Label className="flex items-center justify-between">
                                                <span>Blood Glucose (mg/dL)</span>
                                                <span className="text-xs bg-blue-100 text-gray-500 px-2 py-1 rounded-full">Normal: 70-140</span>
                                            </Label>
                                            <Input name="blood_glucose" type="number" placeholder="95" value={formData.blood_glucose} onChange={handleInputChange} className={getFieldClassName('blood_glucose')} />
                                            {validationErrors.blood_glucose && <p className="text-xs text-red-500 mt-1">{validationErrors.blood_glucose}</p>}
                                            {abnormalWarnings.blood_glucose && !validationErrors.blood_glucose &&
                                                <p className="text-xs text-yellow-500 mt-1">{abnormalWarnings.blood_glucose}</p>}
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* Circumferences Tab */}
                            <TabsContent value="circumference">
                                <Card>
                                    <CardContent className="pt-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <Label className="flex items-center gap-1">
                                                    <Baby className="h-4 w-4" /> Head Circumference (cm)
                                                </Label>
                                                <Input name="head_circumference" type="number" step="0.1" placeholder="35" value={formData.head_circumference} onChange={handleInputChange} />
                                            </div>
                                            <div>
                                                <Label>Chest Circumference (cm)</Label>
                                                <Input name="chest_circumference" type="number" step="0.1" placeholder="90" value={formData.chest_circumference} onChange={handleInputChange} />
                                            </div>
                                            <div>
                                                <Label>Abdominal Circumference (cm)</Label>
                                                <Input name="abdominal_circumference" type="number" step="0.1" placeholder="85" value={formData.abdominal_circumference} onChange={handleInputChange} />
                                            </div>
                                            <div>
                                                <Label>Waist Circumference (cm)</Label>
                                                <Input name="waist_circumference" type="number" step="0.1" placeholder="80" value={formData.waist_circumference} onChange={handleInputChange} />
                                            </div>
                                            <div>
                                                <Label>Hip Circumference (cm)</Label>
                                                <Input name="hip_circumference" type="number" step="0.1" placeholder="95" value={formData.hip_circumference} onChange={handleInputChange} />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* Additional Tab */}
                            <TabsContent value="additional">
                                <Card>
                                    <CardContent className="pt-6">
                                        <div>
                                            <Label>Clinical Notes</Label>
                                            <textarea name="notes" rows="5" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" placeholder="Additional observations, patient condition, medications..."
                                                value={formData.notes} onChange={handleInputChange} />
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>

                        {/* Form Actions */}
                        <div className="flex justify-end gap-3 pt-6 pb-12">
                            <Button type="button" variant="outline" onClick={resetForm} disabled={submitting} className="w-32">
                                <RefreshCw className="h-4 w-4 mr-2" /> Reset
                            </Button>
                            <Button type="button" variant="outline" onClick={() => router.visit(`/patients/${patientId}/vitals`)} disabled={submitting} className="w-32">
                                Cancel
                            </Button>
                            <Button type="submit" disabled={submitting} className="w-32  ">
                                {submitting ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : <><Save className="h-4 w-4 mr-2" /> Save</>}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </PatientLayout>
    )
}
