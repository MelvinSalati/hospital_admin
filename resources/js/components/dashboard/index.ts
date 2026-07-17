// ============================================================
// HMIS Dashboard — TypeScript Interfaces
// ============================================================

export interface DashboardStatistics {
    totalPatients: number;
    todayVisits: number;
    revenueToday: number;
    pendingBills: number;
    totalPatientsTrend?: TrendData;
    todayVisitsTrend?: TrendData;
    revenueTodayTrend?: TrendData;
    pendingBillsTrend?: TrendData;
}

export interface TrendData {
    direction: 'up' | 'down' | 'neutral';
    percentage: number;
    label?: string;
}

export interface PaymentMethodAnalytics {
    method: 'Cash' | 'Mobile Money' | 'Card' | 'Insurance' | string;
    amount: number;
}

export interface AgeDistribution {
    label: 'Children' | 'Young Adults' | 'Adults' | 'Elderly' | string;
    range?: string;
    count: number;
}

export interface InvoiceItem {
    description: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
}

export interface Invoice {
    id: number;
    invoiceNumber: string;
    patientId: number;
    patientName: string;
    billDate: string;
    totalAmount: number;
    amountPaid: number;
    balance: number;
    status: 'paid' | 'unpaid' | 'partial';
    items?: InvoiceItem[];
}

export interface PaginatedInvoices {
    data: Invoice[];
    links: PaginationLink[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number;
    to: number;
}

export interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

export interface DashboardProps {
    statistics: DashboardStatistics;
    paymentMethods: PaymentMethodAnalytics[];
    ageDistribution: AgeDistribution[];
    invoices: PaginatedInvoices;
}
