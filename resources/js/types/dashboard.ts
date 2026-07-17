// types/dashboard.ts
export interface DashboardMetrics {
    // Common metrics
    todayPatients: number;
    todayRevenue: number;
    activeVisits: number;

    // Admin specific
    totalStaff?: number;
    bedOccupancy?: number;
    pendingAdmissions?: number;
    lowStockItems?: number;
    departmentPerformance?: DepartmentPerformance[];
    revenueTrend?: RevenueTrendData[];
    patientDemographics?: PatientDemographicsData;

    // Doctor specific
    myAppointments?: number;
    pendingConsultations?: number;
    myPatients?: number;
    pendingLabReviews?: number;
    pendingRadiologyReviews?: number;
    appointmentDistribution?: AppointmentDistribution[];

    // Nurse specific
    pendingVitals?: number;
    assignedPatients?: number;
    pendingTasks?: number;
    medicationSchedule?: MedicationTask[];
    vitalsTrend?: VitalsTrendData[];

    // Cashier specific
    pendingPayments?: number;
    todayCollections?: number;
    outstandingBills?: number;
    paymentQueue?: PaymentItem[];
    paymentMethodBreakdown?: PaymentMethodData[];

    // Pharmacist specific
    expiringDrugs?: number;
    todaysDispensations?: number;
    pendingPrescriptions?: number;
    lowStockAlerts?: StockAlert[];
    medicationCategories?: MedicationCategoryData[];

    // Lab Technician specific
    pendingLabTests?: number;
    completedToday?: number;
    criticalResults?: number;
    labQueue?: LabTestItem[];
    testTypeBreakdown?: TestTypeData[];

    // Radiologist specific
    pendingScans?: number;
    completedScans?: number;
    urgentReadings?: number;
    radiologyQueue?: RadiologyItem[];
    modalityBreakdown?: ModalityData[];

    // Accountant specific
    monthlyRevenue?: number;
    pendingInvoices?: number;
    insuranceClaims?: number;
    departmentRevenue?: DepartmentRevenue[];
    revenueByDepartment?: RevenueByDepartmentData[];
}

// Chart Data Types
export interface RevenueTrendData {
    month: string;
    revenue: number;
    expenses?: number;
    profit?: number;
}

export interface PatientDemographicsData {
    ageGroups: { range: string; count: number }[];
    gender: { male: number; female: number; other: number };
    insurance: { insured: number; uninsured: number };
}

export interface AppointmentDistribution {
    type: string;
    count: number;
    color: string;
}

export interface PaymentMethodData {
    method: string;
    amount: number;
    count: number;
    percentage: number;
    color: string;
}

export interface MedicationCategoryData {
    category: string;
    quantity: number;
    value: number;
}

export interface TestTypeData {
    type: string;
    count: number;
    turnaroundTime: number;
}

export interface ModalityData {
    modality: string;
    count: number;
    utilization: number;
}

export interface RevenueByDepartmentData {
    department: string;
    revenue: number;
    target: number;
    variance: number;
}

export interface VitalsTrendData {
    time: string;
    systolic?: number;
    diastolic?: number;
    heartRate?: number;
    temperature?: number;
}

// Existing Types
export interface DepartmentPerformance {
    name: string;
    patients: number;
    revenue: number;
    status: 'optimal' | 'normal' | 'busy';
}

export interface MedicationTask {
    patient: string;
    room: string;
    medication: string;
    time: string;
    status: 'due' | 'overdue' | 'administered';
}

export interface StockAlert {
    drug: string;
    current: number;
    reorder: number;
    unit: string;
}

export interface LabTestItem {
    patient: string;
    test: string;
    priority: 'routine' | 'urgent' | 'stat';
    orderedAt: string;
}

export interface RadiologyItem {
    patient: string;
    procedure: string;
    modality: string;
    priority: 'routine' | 'urgent' | 'stat';
}

export interface DepartmentRevenue {
    department: string;
    today: number;
    month: number;
    trend: number;
}

export interface PaymentItem {
    patient: string;
    billNumber: string;
    amount: number;
    services: string[];
}

export interface User {
    id: number;
    name: string;
    email: string;
    roles: string[];
    permissions: string[];
    department?: string;
}

export const DepartmentIcons = {
    admin: '🏥',
    doctor: '👨‍⚕️',
    nurse: '👩‍⚕️',
    cashier: '💰',
    pharmacist: '💊',
    lab: '🔬',
    radiology: '📷',
    accountant: '📊',
    reception: '📋',
    inventory: '📦'
} as const;