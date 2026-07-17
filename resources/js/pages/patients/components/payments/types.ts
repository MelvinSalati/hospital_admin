// components/payments/types.ts
export interface Payment {
  id: string;
  patient_id: string;
  patient_name: string;
  amount: number;
  payment_method: 'cash' | 'card' | 'insurance' | 'bank_transfer' | 'mobile_money';
  payment_date: string;
  status: 'completed' | 'pending' | 'failed' | 'refunded';
  invoice_id: string;
  description: string;
  reference_number: string;
  service_type: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  patient_id: string;
  patient_name: string;
  amount: number;
  due_date: string;
  status: 'paid' | 'pending' | 'overdue' | 'cancelled';
  items: InvoiceItem[];
  created_at: string;
  paid_at?: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  type: string;
  code: string;
}

export interface PaymentMethod {
  id: string;
  patient_id: string;
  type: 'insurance' | 'mobile_money' | 'bank_card' | 'bank_account';
  provider: string;
  account_number?: string;
  card_number?: string;
  expiry_date?: string;
  phone_number?: string;
  policy_number?: string;
  scheme_name?: string;
  is_default: boolean;
  created_at: string;
}

export interface InsuranceProvider {
  id: string;
  name: string;
  code: string;
  schemes: InsuranceScheme[];
}

export interface InsuranceScheme {
  id: string;
  name: string;
  provider_id: string;
  coverage_percentage: number;
  max_coverage: number;
}

export interface Patient {
  id: string;
  name: string;
  email: string;
  phone: string;
}