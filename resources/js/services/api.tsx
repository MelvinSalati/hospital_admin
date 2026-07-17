// services/api.ts
import Http from '@/utils/Http';

// Department APIs
export const departmentAPI = {
    getAll: () => Http.get('/departments'),
    getById: (id: number) => Http.get(`/departments/${id}`),
    create: (data: any) => Http.post('/departments', data),
    update: (id: number, data: any) => Http.put(`/departments/${id}`, data),
    delete: (id: number) => Http.delete(`/departments/${id}`),
};

// Service APIs
export const serviceAPI = {
    getAll: () => Http.get('/services'),
    getByDepartment: (departmentId: number) => Http.get(`/departments/${departmentId}/services`),
    create: (data: any) => Http.post('/services', data),
    update: (id: number, data: any) => Http.put(`/services/${id}`, data),
    delete: (id: number) => Http.delete(`/services/${id}`),
}; 

// process payment APIs
export const processPaymentAPI = {
    processPayment: (patientId:number, paymentData:JSON) => Http.post(`/patients/${patientId}/payment`, paymentData),
};

export const admission = {
    discharge: (admissionId:number) => Http.post(`admissions/${admissionId}/discharge`),
};

// Dispensation APIs
export const dispensationAPI = {
    /**
     * Dispense prescription items
     * @param patientId - The patient ID
     * @param prescriptionNumber - The prescription number
     * @param data - Dispensation data
     */
    dispense: (prescriptionNumber: string, data: any) => 
        Http.post(`patients/dispense/${prescriptionNumber}`, data),
    
    /**
     * Get dispensation history for a prescription
     * @param patientId - The patient ID
     * @param prescriptionNumber - The prescription number
     */
    getDispensationHistory: (patientId: number, prescriptionNumber: string) => 
        Http.get(`patients/${patientId}/dispense/${prescriptionNumber}/history`),
    
    /**
     * Get dispensed items by prescription
     * @param patientId - The patient ID
     * @param prescriptionNumber - The prescription number
     */
    getDispensedItems: (patientId: number, prescriptionNumber: string) => 
        Http.get(`patients/${patientId}/dispense/${prescriptionNumber}/items`),
};

// Admission APIs
export const admissionAPI = {
    /**
     * Get all admissions
     * @param params - Optional query parameters (filters, pagination)
     */
    getAll: (params?: any) => Http.get('/admissions', { params }),
    
    /**
     * Get admission by UUID
     * @param uuid - Admission UUID
     */
    getByUuid: (uuid: string) => Http.get(`/admissions/${uuid}`),
    
    /**
     * Get admissions by patient ID
     * @param patientId - Patient ID
     */
    getByPatient: (patientId: number) => Http.get(`/patients/${patientId}/admissions`),
    
    /**
     * Get active admissions (patients currently admitted)
     * @param params - Optional query parameters
     */
    getActive: (params?: any) => Http.get('/admissions/active', { params }),
    
    /**
     * Create a new admission
     * @param data - Admission data
     */
    create: (data: any) => Http.post('/admissions', data),
    
    /**
     * Update admission diagnosis on discharge
     * @param uuid - Admission UUID
     * @param data - Update data (diagnosis_on_discharge, etc.)
     */
    updateDischarge: (uuid: string, data: any) => Http.put(`/admissions/${uuid}/discharge`, data),
    
    /**
     * Update admission details
     * @param uuid - Admission UUID
     * @param data - Update data
     */
    update: (uuid: string, data: any) => Http.put(`/admissions/${uuid}`, data),
    
    /**
     * Discharge a patient (complete admission)
     * @param uuid - Admission UUID
     * @param data - Discharge data (diagnosis_on_discharge, discharge_notes, etc.)
     */
    discharge: (uuid: string, data: any) => Http.post(`/admissions/${uuid}/discharge`, data),
    
    /**
     * Delete an admission
     * @param uuid - Admission UUID
     */
    delete: (uuid: string) => Http.delete(`/admissions/${uuid}`),
    
    /**
     * Get admission statistics
     * @param params - Date range and filters
     */
    getStats: (params?: any) => Http.get('/admissions/stats', { params }),
};

// Imaging Order APIs
export const imagingOrderAPI = {
    /**
     * Get all imaging orders for a patient
     * @param patientId - Patient ID
     * @param params - Optional query parameters (filters, pagination)
     */
    getByPatient: (patientId: number, params?: any) => 
        Http.get(`/patients/${patientId}/imaging-orders`, { params }),
    
    /**
     * Get a specific imaging order by ID
     * @param orderId - Imaging order ID
     */
    getById: (orderId: number) => Http.get(`/imaging-orders/${orderId}`),
    
    /**
     * Create a new imaging order
     * @param patientId - Patient ID
     * @param data - Imaging order data
     */
    create: (patientId: number, data: any) => 
        Http.post(`/patients/${patientId}/imaging-orders`, data),
    
    /**
     * Update imaging order status
     * @param orderId - Imaging order ID
     * @param data - Status update data
     */
    updateStatus: (orderId: number, data: any) => 
        Http.put(`/imaging-orders/${orderId}/status`, data),
    
    /**
     * Get invoice for an imaging order
     * @param orderId - Imaging order ID
     */
    getInvoice: (orderId: number) => Http.get(`/imaging-orders/${orderId}/invoice`),
    
    /**
     * Get report for an imaging order
     * @param orderId - Imaging order ID
     */
    getReport: (orderId: number) => Http.get(`/imaging-orders/${orderId}/report`),
    
    /**
     * Cancel an imaging order
     * @param orderId - Imaging order ID
     * @param reason - Cancellation reason
     */
    cancel: (orderId: number, reason: string) => 
        Http.post(`/imaging-orders/${orderId}/cancel`, { reason }),
    
    /**
     * Update imaging order report
     * @param orderId - Imaging order ID
     * @param data - Report data (findings, impression, recommendations, etc.)
     */
    updateReport: (orderId: number, data: any) => 
        Http.put(`/imaging-orders/${orderId}/report`, data),
    
    /**
     * Get all available imaging modalities (services)
     * @param params - Optional query parameters
     */
    getAvailableModalities: (params?: any) => 
        Http.get('/imaging/modalities', { params }),
};

// Export all APIs as a single object for convenience
const api = {
    department: departmentAPI,
    service: serviceAPI,
    dispensation: dispensationAPI,
    admission: admission,
    admissionAPI: admissionAPI,
    processPayment: processPaymentAPI,
    imagingOrder: imagingOrderAPI,
};

export default api;