<?php

namespace App\Http\Controllers\Patients;

use App\Models\Patients\Patient;
use App\Models\Patients\Prescription;
use App\Models\Payments\Invoice;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\Services\Service;
use App\Http\Controllers\Controller;
use App\Helpers\VisitTokenHelper;

class PrescriptionsController extends Controller
{ 
    public function token($patientId){
        $patient = new VisitTokenHelper();
        return $patient->getActiveToken($patientId);
    }

    public function store(Request $request, $patientId)
    {
        $request->validate([
            'items' => 'required|array',
            'items.*.id' => 'required|exists:services,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.dosage' => 'nullable|string',
            'items.*.frequency' => 'nullable|string',
            'items.*.route' => 'nullable|string',
            'items.*.notes' => 'nullable|string',
            'scheme' => 'required|in:cash,nhima,insurance,charity,mobile_money',
            'admission_number' => 'nullable|string',
        ]);

        $patient = Patient::findOrFail($patientId);
        $visitToken = $this->token($patientId);
        
        DB::beginTransaction();
        
        try {
            // Check if there's an existing active prescription with same visit_token or admission_number
            $existingPrescription = Prescription::where(function($query) use ($visitToken, $request) {
                    $query->where('visit_token', $visitToken)
                          ->orWhere('admission_number', $request->admission_number);
                })
                ->where('status', 'active')
                ->first();
            
            $prescriptionItems = [];
            $invoiceItems = [];
            $total = 0;
            
            // Prepare new items
            foreach ($request->items as $item) {
                $service = Service::find($item['id']);
                $price = $this->getPriceForScheme($service, $request->scheme);
                
                // Prescription item - clinical details
                $prescriptionItems[] = [
                    'visit_token' => $visitToken,
                    'drug_id' => $service->id,
                    'drug_name' => $service->service_name,
                    'dosage' => $item['dosage'] ?? $service->dosage ?? null,
                    'frequency' => $item['frequency'] ?? $service->frequency ?? null,
                    'route' => $item['route'] ?? $service->route ?? null,
                    'quantity' => $item['quantity'],
                    'instructions' => $item['notes'] ?? null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
                
                // Invoice item - billing only
                $invoiceItems[] = [
                    'drug_id' => $service->id,
                    'drug_name' => $service->service_name,
                    'price' => $price,
                    'quantity' => $item['quantity'],
                    'total' => $price * $item['quantity'],
                ];
                
                $total += $price * $item['quantity'];
            }
            
            if ($existingPrescription) {
                // APPEND to existing prescription
                $existingItems = $existingPrescription->items ?? [];
                $mergedItems = array_merge($existingItems, $prescriptionItems);
                
                $existingPrescription->update([
                    'items' => $mergedItems,
                    'updated_at' => now(),
                ]);
                
                // Update existing invoice if it exists
                $invoice = Invoice::where('prescription_id', $existingPrescription->id)
                    ->where('status', 'draft')
                    ->first();
                
                if ($invoice) {
                    $existingInvoiceItems = $invoice->items ?? [];
                    $mergedInvoiceItems = array_merge($existingInvoiceItems, $invoiceItems);
                    $newSubtotal = $invoice->subtotal + $total;
                    
                    $invoice->update([
                        'items' => $mergedInvoiceItems,
                        'subtotal' => $newSubtotal,
                        'total' => $newSubtotal,
                        'due_amount' => $newSubtotal - $invoice->paid_amount,
                        'updated_at' => now(),
                    ]);
                } else {
                    // Create new invoice if none exists
                    $invoice = $this->createInvoice($patient, $existingPrescription, $invoiceItems, $total, $request->scheme);
                }
                
                DB::commit();
                
                return response()->json([
                    'success' => true,
                    'message' => 'Items appended to existing prescription successfully',
                    'prescription' => $existingPrescription->fresh(),
                    'invoice' => $invoice,
                    'appended_items' => count($prescriptionItems),
                    'total_items' => count($mergedItems)
                ]);
                
            } else {
                // CREATE NEW prescription and invoice
                $prescription = Prescription::create([
                    'visit_token' => $visitToken,
                    'patient_id' => $patient->id,
                    'user_id' => auth()->id(),
                    'items' => $prescriptionItems,
                    'status' => 'active',
                    'prescribed_date' => now(),
                    'clinical_notes' => $request->clinical_notes ?? null,
                    'is_admitted' => $request->admitted ?? false,
                    'admission_number' => $request->admission_number ?? null
                ]);
                
                $invoice = $this->createInvoice($patient, $prescription, $invoiceItems, $total, $request->scheme);
                
                // Link prescription to invoice
                $prescription->update(['invoice_id' => $invoice->id]);
                
                DB::commit();
                
                return response()->json([
                    'success' => true,
                    'message' => 'New prescription and invoice created successfully',
                    'prescription' => $prescription,
                    'invoice' => $invoice,
                ]);
            }
            
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to create/update prescription',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    private function createInvoice($patient, $prescription, $invoiceItems, $total, $scheme)
    {
        return Invoice::create([
            'visit_token' => $prescription->visit_token,
            'invoice_number' => Invoice::generateInvoiceNumber(),
            'patient_id' => $patient->id,
            'user_id' => auth()->id(),
            'prescription_id' => $prescription->id,
            'customer_name' => $patient->name,
            'customer_email' => $patient->email,
            'customer_phone' => $patient->phone,
            'subtotal' => $total,
            'tax' => 0,
            'discount' => 0,
            'total' => $total,
            'paid_amount' => 0,
            'due_amount' => $total,
            'currency' => 'ZMW',
            'payment_scheme' => $scheme,
            'items' => $invoiceItems,
            'issue_date' => now(),
            'status' => 'draft',
        ]);
    }
    
    private function getPriceForScheme($service, $scheme)
    {
        $effectiveScheme = $scheme === 'mobile_money' ? 'cash' : $scheme;
        
        switch ($effectiveScheme) {
            case 'cash': return $service->cash_price;
            case 'nhima': return $service->nhima_price;
            case 'insurance': return $service->insurance_price;
            case 'charity': return $service->charity_price;
            default: return $service->cash_price;
        }
    }
}<?php

namespace App\Http\Controllers\Patients;

use App\Models\Patients\Patient;
use App\Models\Patients\Prescription;
use App\Models\Payments\Invoice;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\Services\Service;
use App\Http\Controllers\Controller;
use App\Helpers\VisitTokenHelper;

class PrescriptionsController extends Controller
{ 
    public function token($patientId){
        $patient = new VisitTokenHelper();
        return $patient->getActiveToken($patientId);
    }

    public function store(Request $request, $patientId)
    {
        $request->validate([
            'items' => 'required|array',
            'items.*.id' => 'required|exists:services,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.dosage' => 'nullable|string',
            'items.*.frequency' => 'nullable|string',
            'items.*.route' => 'nullable|string',
            'items.*.notes' => 'nullable|string',
            'scheme' => 'required|in:cash,nhima,insurance,charity,mobile_money',
            'admission_number' => 'nullable|string',
        ]);

        $patient = Patient::findOrFail($patientId);
        $visitToken = $this->token($patientId);
        
        DB::beginTransaction();
        
        try {
            // Check if there's an existing active prescription with same visit_token or admission_number
            $existingPrescription = Prescription::where(function($query) use ($visitToken, $request) {
                    $query->where('visit_token', $visitToken)
                          ->orWhere('admission_number', $request->admission_number);
                })
                ->where('status', 'active')
                ->first();
            
            $prescriptionItems = [];
            $invoiceItems = [];
            $total = 0;
            
            // Prepare new items
            foreach ($request->items as $item) {
                $service = Service::find($item['id']);
                $price = $this->getPriceForScheme($service, $request->scheme);
                
                // Prescription item - clinical details
                $prescriptionItems[] = [
                    'visit_token' => $visitToken,
                    'drug_id' => $service->id,
                    'drug_name' => $service->service_name,
                    'dosage' => $item['dosage'] ?? $service->dosage ?? null,
                    'frequency' => $item['frequency'] ?? $service->frequency ?? null,
                    'route' => $item['route'] ?? $service->route ?? null,
                    'quantity' => $item['quantity'],
                    'instructions' => $item['notes'] ?? null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
                
                // Invoice item - billing only
                $invoiceItems[] = [
                    'drug_id' => $service->id,
                    'drug_name' => $service->service_name,
                    'price' => $price,
                    'quantity' => $item['quantity'],
                    'total' => $price * $item['quantity'],
                ];
                
                $total += $price * $item['quantity'];
            }
            
            if ($existingPrescription) {
                // APPEND to existing prescription
                $existingItems = $existingPrescription->items ?? [];
                $mergedItems = array_merge($existingItems, $prescriptionItems);
                
                $existingPrescription->update([
                    'items' => $mergedItems,
                    'updated_at' => now(),
                ]);
                
                // Update existing invoice if it exists
                $invoice = Invoice::where('prescription_id', $existingPrescription->id)
                    ->where('status', 'draft')
                    ->first();
                
                if ($invoice) {
                    $existingInvoiceItems = $invoice->items ?? [];
                    $mergedInvoiceItems = array_merge($existingInvoiceItems, $invoiceItems);
                    $newSubtotal = $invoice->subtotal + $total;
                    
                    $invoice->update([
                        'items' => $mergedInvoiceItems,
                        'subtotal' => $newSubtotal,
                        'total' => $newSubtotal,
                        'due_amount' => $newSubtotal - $invoice->paid_amount,
                        'updated_at' => now(),
                    ]);
                } else {
                    // Create new invoice if none exists
                    $invoice = $this->createInvoice($patient, $existingPrescription, $invoiceItems, $total, $request->scheme);
                }
                
                DB::commit();
                
                return response()->json([
                    'success' => true,
                    'message' => 'Items appended to existing prescription successfully',
                    'prescription' => $existingPrescription->fresh(),
                    'invoice' => $invoice,
                    'appended_items' => count($prescriptionItems),
                    'total_items' => count($mergedItems)
                ]);
                
            } else {
                // CREATE NEW prescription and invoice
                $prescription = Prescription::create([
                    'visit_token' => $visitToken,
                    'patient_id' => $patient->id,
                    'user_id' => auth()->id(),
                    'items' => $prescriptionItems,
                    'status' => 'active',
                    'prescribed_date' => now(),
                    'clinical_notes' => $request->clinical_notes ?? null,
                    'is_admitted' => $request->admitted ?? false,
                    'admission_number' => $request->admission_number ?? null
                ]);
                
                $invoice = $this->createInvoice($patient, $prescription, $invoiceItems, $total, $request->scheme);
                
                // Link prescription to invoice
                $prescription->update(['invoice_id' => $invoice->id]);
                
                DB::commit();
                
                return response()->json([
                    'success' => true,
                    'message' => 'New prescription and invoice created successfully',
                    'prescription' => $prescription,
                    'invoice' => $invoice,
                ]);
            }
            
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to create/update prescription',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    private function createInvoice($patient, $prescription, $invoiceItems, $total, $scheme)
    {
        return Invoice::create([
            'visit_token' => $prescription->visit_token,
            'invoice_number' => Invoice::generateInvoiceNumber(),
            'patient_id' => $patient->id,
            'user_id' => auth()->id(),
            'prescription_id' => $prescription->id,
            'customer_name' => $patient->name,
            'customer_email' => $patient->email,
            'customer_phone' => $patient->phone,
            'subtotal' => $total,
            'tax' => 0,
            'discount' => 0,
            'total' => $total,
            'paid_amount' => 0,
            'due_amount' => $total,
            'currency' => 'ZMW',
            'payment_scheme' => $scheme,
            'items' => $invoiceItems,
            'issue_date' => now(),
            'status' => 'draft',
        ]);
    }
    
    private function getPriceForScheme($service, $scheme)
    {
        $effectiveScheme = $scheme === 'mobile_money' ? 'cash' : $scheme;
        
        switch ($effectiveScheme) {
            case 'cash': return $service->cash_price;
            case 'nhima': return $service->nhima_price;
            case 'insurance': return $service->insurance_price;
            case 'charity': return $service->charity_price;
            default: return $service->cash_price;
        }
    }
}<?php

namespace App\Http\Controllers\Patients;

use App\Models\Patients\Patient;
use App\Models\Patients\Prescription;
use App\Models\Payments\Invoice;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\Services\Service;
use App\Http\Controllers\Controller;
use App\Helpers\VisitTokenHelper;

class PrescriptionsController extends Controller
{ 
    public function token($patientId){
        $patient = new VisitTokenHelper();
        return $patient->getActiveToken($patientId);
    }

    public function store(Request $request, $patientId)
    {
        $request->validate([
            'items' => 'required|array',
            'items.*.id' => 'required|exists:services,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.dosage' => 'nullable|string',
            'items.*.frequency' => 'nullable|string',
            'items.*.route' => 'nullable|string',
            'items.*.notes' => 'nullable|string',
            'scheme' => 'required|in:cash,nhima,insurance,charity,mobile_money',
            'admission_number' => 'nullable|string',
        ]);

        $patient = Patient::findOrFail($patientId);
        $visitToken = $this->token($patientId);
        
        DB::beginTransaction();
        
        try {
            // Check if there's an existing active prescription with same visit_token or admission_number
            $existingPrescription = Prescription::where(function($query) use ($visitToken, $request) {
                    $query->where('visit_token', $visitToken)
                          ->orWhere('admission_number', $request->admission_number);
                })
                ->where('status', 'active')
                ->first();
            
            $prescriptionItems = [];
            $invoiceItems = [];
            $total = 0;
            
            // Prepare new items
            foreach ($request->items as $item) {
                $service = Service::find($item['id']);
                $price = $this->getPriceForScheme($service, $request->scheme);
                
                // Prescription item - clinical details
                $prescriptionItems[] = [
                    'visit_token' => $visitToken,
                    'drug_id' => $service->id,
                    'drug_name' => $service->service_name,
                    'dosage' => $item['dosage'] ?? $service->dosage ?? null,
                    'frequency' => $item['frequency'] ?? $service->frequency ?? null,
                    'route' => $item['route'] ?? $service->route ?? null,
                    'quantity' => $item['quantity'],
                    'instructions' => $item['notes'] ?? null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
                
                // Invoice item - billing only
                $invoiceItems[] = [
                    'drug_id' => $service->id,
                    'drug_name' => $service->service_name,
                    'price' => $price,
                    'quantity' => $item['quantity'],
                    'total' => $price * $item['quantity'],
                ];
                
                $total += $price * $item['quantity'];
            }
            
            if ($existingPrescription) {
                // APPEND to existing prescription
                $existingItems = $existingPrescription->items ?? [];
                $mergedItems = array_merge($existingItems, $prescriptionItems);
                
                $existingPrescription->update([
                    'items' => $mergedItems,
                    'updated_at' => now(),
                ]);
                
                // Update existing invoice if it exists
                $invoice = Invoice::where('prescription_id', $existingPrescription->id)
                    ->where('status', 'draft')
                    ->first();
                
                if ($invoice) {
                    $existingInvoiceItems = $invoice->items ?? [];
                    $mergedInvoiceItems = array_merge($existingInvoiceItems, $invoiceItems);
                    $newSubtotal = $invoice->subtotal + $total;
                    
                    $invoice->update([
                        'items' => $mergedInvoiceItems,
                        'subtotal' => $newSubtotal,
                        'total' => $newSubtotal,
                        'due_amount' => $newSubtotal - $invoice->paid_amount,
                        'updated_at' => now(),
                    ]);
                } else {
                    // Create new invoice if none exists
                    $invoice = $this->createInvoice($patient, $existingPrescription, $invoiceItems, $total, $request->scheme);
                }
                
                DB::commit();
                
                return response()->json([
                    'success' => true,
                    'message' => 'Items appended to existing prescription successfully',
                    'prescription' => $existingPrescription->fresh(),
                    'invoice' => $invoice,
                    'appended_items' => count($prescriptionItems),
                    'total_items' => count($mergedItems)
                ]);
                
            } else {
                // CREATE NEW prescription and invoice
                $prescription = Prescription::create([
                    'visit_token' => $visitToken,
                    'patient_id' => $patient->id,
                    'user_id' => auth()->id(),
                    'items' => $prescriptionItems,
                    'status' => 'active',
                    'prescribed_date' => now(),
                    'clinical_notes' => $request->clinical_notes ?? null,
                    'is_admitted' => $request->admitted ?? false,
                    'admission_number' => $request->admission_number ?? null
                ]);
                
                $invoice = $this->createInvoice($patient, $prescription, $invoiceItems, $total, $request->scheme);
                
                // Link prescription to invoice
                $prescription->update(['invoice_id' => $invoice->id]);
                
                DB::commit();
                
                return response()->json([
                    'success' => true,
                    'message' => 'New prescription and invoice created successfully',
                    'prescription' => $prescription,
                    'invoice' => $invoice,
                ]);
            }
            
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to create/update prescription',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    private function createInvoice($patient, $prescription, $invoiceItems, $total, $scheme)
    {
        return Invoice::create([
            'visit_token' => $prescription->visit_token,
            'invoice_number' => Invoice::generateInvoiceNumber(),
            'patient_id' => $patient->id,
            'user_id' => auth()->id(),
            'prescription_id' => $prescription->id,
            'customer_name' => $patient->name,
            'customer_email' => $patient->email,
            'customer_phone' => $patient->phone,
            'subtotal' => $total,
            'tax' => 0,
            'discount' => 0,
            'total' => $total,
            'paid_amount' => 0,
            'due_amount' => $total,
            'currency' => 'ZMW',
            'payment_scheme' => $scheme,
            'items' => $invoiceItems,
            'issue_date' => now(),
            'status' => 'draft',
        ]);
    }
    
    private function getPriceForScheme($service, $scheme)
    {
        $effectiveScheme = $scheme === 'mobile_money' ? 'cash' : $scheme;
        
        switch ($effectiveScheme) {
            case 'cash': return $service->cash_price;
            case 'nhima': return $service->nhima_price;
            case 'insurance': return $service->insurance_price;
            case 'charity': return $service->charity_price;
            default: return $service->cash_price;
        }
    }
}<?php

namespace App\Http\Controllers\Patients;

use App\Models\Patients\Patient;
use App\Models\Patients\Prescription;
use App\Models\Payments\Invoice;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\Services\Service;
use App\Http\Controllers\Controller;
use App\Helpers\VisitTokenHelper;

class PrescriptionsController extends Controller
{ 
    public function token($patientId){
        $patient = new VisitTokenHelper();
        return $patient->getActiveToken($patientId);
    }

    public function store(Request $request, $patientId)
    {
        $request->validate([
            'items' => 'required|array',
            'items.*.id' => 'required|exists:services,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.dosage' => 'nullable|string',
            'items.*.frequency' => 'nullable|string',
            'items.*.route' => 'nullable|string',
            'items.*.notes' => 'nullable|string',
            'scheme' => 'required|in:cash,nhima,insurance,charity,mobile_money',
            'admission_number' => 'nullable|string',
        ]);

        $patient = Patient::findOrFail($patientId);
        $visitToken = $this->token($patientId);
        
        DB::beginTransaction();
        
        try {
            // Check if there's an existing active prescription with same visit_token or admission_number
            $existingPrescription = Prescription::where(function($query) use ($visitToken, $request) {
                    $query->where('visit_token', $visitToken)
                          ->orWhere('admission_number', $request->admission_number);
                })
                ->where('status', 'active')
                ->first();
            
            $prescriptionItems = [];
            $invoiceItems = [];
            $total = 0;
            
            // Prepare new items
            foreach ($request->items as $item) {
                $service = Service::find($item['id']);
                $price = $this->getPriceForScheme($service, $request->scheme);
                
                // Prescription item - clinical details
                $prescriptionItems[] = [
                    'visit_token' => $visitToken,
                    'drug_id' => $service->id,
                    'drug_name' => $service->service_name,
                    'dosage' => $item['dosage'] ?? $service->dosage ?? null,
                    'frequency' => $item['frequency'] ?? $service->frequency ?? null,
                    'route' => $item['route'] ?? $service->route ?? null,
                    'quantity' => $item['quantity'],
                    'instructions' => $item['notes'] ?? null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
                
                // Invoice item - billing only
                $invoiceItems[] = [
                    'drug_id' => $service->id,
                    'drug_name' => $service->service_name,
                    'price' => $price,
                    'quantity' => $item['quantity'],
                    'total' => $price * $item['quantity'],
                ];
                
                $total += $price * $item['quantity'];
            }
            
            if ($existingPrescription) {
                // APPEND to existing prescription
                $existingItems = $existingPrescription->items ?? [];
                $mergedItems = array_merge($existingItems, $prescriptionItems);
                
                $existingPrescription->update([
                    'items' => $mergedItems,
                    'updated_at' => now(),
                ]);
                
                // Update existing invoice if it exists
                $invoice = Invoice::where('prescription_id', $existingPrescription->id)
                    ->where('status', 'draft')
                    ->first();
                
                if ($invoice) {
                    $existingInvoiceItems = $invoice->items ?? [];
                    $mergedInvoiceItems = array_merge($existingInvoiceItems, $invoiceItems);
                    $newSubtotal = $invoice->subtotal + $total;
                    
                    $invoice->update([
                        'items' => $mergedInvoiceItems,
                        'subtotal' => $newSubtotal,
                        'total' => $newSubtotal,
                        'due_amount' => $newSubtotal - $invoice->paid_amount,
                        'updated_at' => now(),
                    ]);
                } else {
                    // Create new invoice if none exists
                    $invoice = $this->createInvoice($patient, $existingPrescription, $invoiceItems, $total, $request->scheme);
                }
                
                DB::commit();
                
                return response()->json([
                    'success' => true,
                    'message' => 'Items appended to existing prescription successfully',
                    'prescription' => $existingPrescription->fresh(),
                    'invoice' => $invoice,
                    'appended_items' => count($prescriptionItems),
                    'total_items' => count($mergedItems)
                ]);
                
            } else {
                // CREATE NEW prescription and invoice
                $prescription = Prescription::create([
                    'visit_token' => $visitToken,
                    'patient_id' => $patient->id,
                    'user_id' => auth()->id(),
                    'items' => $prescriptionItems,
                    'status' => 'active',
                    'prescribed_date' => now(),
                    'clinical_notes' => $request->clinical_notes ?? null,
                    'is_admitted' => $request->admitted ?? false,
                    'admission_number' => $request->admission_number ?? null
                ]);
                
                $invoice = $this->createInvoice($patient, $prescription, $invoiceItems, $total, $request->scheme);
                
                // Link prescription to invoice
                $prescription->update(['invoice_id' => $invoice->id]);
                
                DB::commit();
                
                return response()->json([
                    'success' => true,
                    'message' => 'New prescription and invoice created successfully',
                    'prescription' => $prescription,
                    'invoice' => $invoice,
                ]);
            }
            
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to create/update prescription',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    private function createInvoice($patient, $prescription, $invoiceItems, $total, $scheme)
    {
        return Invoice::create([
            'visit_token' => $prescription->visit_token,
            'invoice_number' => Invoice::generateInvoiceNumber(),
            'patient_id' => $patient->id,
            'user_id' => auth()->id(),
            'prescription_id' => $prescription->id,
            'customer_name' => $patient->name,
            'customer_email' => $patient->email,
            'customer_phone' => $patient->phone,
            'subtotal' => $total,
            'tax' => 0,
            'discount' => 0,
            'total' => $total,
            'paid_amount' => 0,
            'due_amount' => $total,
            'currency' => 'ZMW',
            'payment_scheme' => $scheme,
            'items' => $invoiceItems,
            'issue_date' => now(),
            'status' => 'draft',
        ]);
    }
    
    private function getPriceForScheme($service, $scheme)
    {
        $effectiveScheme = $scheme === 'mobile_money' ? 'cash' : $scheme;
        
        switch ($effectiveScheme) {
            case 'cash': return $service->cash_price;
            case 'nhima': return $service->nhima_price;
            case 'insurance': return $service->insurance_price;
            case 'charity': return $service->charity_price;
            default: return $service->cash_price;
        }
    }
}