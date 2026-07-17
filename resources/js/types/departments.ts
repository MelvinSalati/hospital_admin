// types/department.ts
export interface Department {
    id: number;
    name: string;
    code: string;
    description: string;
    status: 'active' | 'inactive';
    service_count: number;
    created_at: string;
    updated_at: string;
    services?: Service[];
}

export interface Service {
    id: number;
    service_uuid: number | null;
    provider_id: number | null;
    service_name: string;
    department_id: number;
    cash_price: number | null;
    nhima_price: number | null;
    insurance_price: number | null;
    charity_price: number | null;
    created_at: string;
    updated_at: string;
}

export interface ServiceFormData {
    service_name: string;
    cash_price: string;
    nhima_price: string;
    insurance_price: string;
    charity_price: string;
    service_uuid: string;
    provider_id: string;
}

export const PRICE_CATEGORIES = [
    { id: 'cash', name: 'Cash', field: 'cash_price', icon: '💰', color: 'gray' },
    { id: 'nhima', name: 'NHIMA', field: 'nhima_price', icon: '🏥', color: 'green' },
    { id: 'insurance', name: 'Insurance', field: 'insurance_price', icon: '📋', color: 'purple' },
    { id: 'charity', name: 'Charity', field: 'charity_price', icon: '🤝', color: 'orange' },
];
