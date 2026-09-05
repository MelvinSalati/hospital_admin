<?php

namespace App\Http\Controllers\Patients;

use App\Helpers\VisitTokenHelper;
use App\Http\Controllers\Controller;
use App\Models\Patients\Interaction;
use App\Models\Patients\Patient;
use App\Models\PatientVisit;
use App\Models\Payments\Invoice;
use App\Repositories\Departments\DepartmentRepository;
use App\Services\PatientService;
use App\Services\QueueService;
use App\Models\Services\Service;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class QueueController extends Controller
{
    protected QueueService $queueService;
    protected DepartmentRepository $departmentRepository;
    protected PatientService $patientService;

    public function __construct(QueueService $queueService, DepartmentRepository $departmentRepository, PatientService $patientService)
    {
        $this->queueService = $queueService;
        $this->departmentRepository = $departmentRepository;
        $this->patientService = $patientService;
    }

    public function index()
    {
        return inertia('receptions/queues', $this->getQueues());
    }

    public function token(int $patientId)
    {
        $patient = new VisitTokenHelper();
        return $patient->getActiveToken($patientId);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $getPatientId = $this->patientService->getPatientIdByPatientNumber($request->patient_number);

        try {
            if ($this->queueService->createVisit($request->all())) {
                $interaction = Interaction::create([
                    'patient_id' => $getPatientId->id,
                    'provider_id' => $request->created_by,
                    'type' => 'visit',
                    'description' => "Patient Queued to " . $this->departmentRepository->getDepartmentName($request->department_id) . " ",
                    'status' => 'completed',
                    'reference_number' => $request->visit_token
                ]);

                return response()->json([
                    'message' => "Patient Queued to" . $this->departmentRepository->getDepartmentName($request->department_id),
                    'interaction_id' => $interaction->id,
                    'interaction_uuid' => $interaction->interaction_uuid
                ], 200);
            } else {
                return response()->json([
                    'message' => 'Patient is queued already in the queue!',
                    'status' => 301
                ]);
            }
        } catch (\Exception $e) {
            Log::error('Failed to create interaction', [
                'error' => $e->getMessage(),
                'patient_id' => $getPatientId->id ?? null,
                'patient_number' => $request->patient_number
            ]);

            return response()->json([
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function getQueues()
    {
        // Active queues (status = 0)
        $active = PatientVisit::with(['patient', 'department'])
            ->where('status', 0)
            ->orderByRaw("FIELD(priority, 'emergency', 'high', 'medium', 'low')")
            ->orderBy('created_at', 'asc')
            ->get()
            ->map(function ($visit) {
                return $this->formatVisit($visit);
            });

        // Completed queues (status = 1)
        $completed = PatientVisit::with(['patient', 'department'])
            ->where('status', 1)
            ->orderBy('updated_at', 'desc')
            ->limit(50)
            ->get()
            ->map(function ($visit) {
                return $this->formatVisit($visit);
            });

        return [
            'active' => $active,
            'completed' => $completed,
        ];
    }

    private function formatVisit($visit)
    {
        // Get ALL invoices for this patient (for counting)
        $allInvoices = Invoice::where('patient_id', $visit->patient_id)->get();

        // Get unpaid invoices - where subtotal > 0 AND status is not 'paid'
        $unpaidInvoices = Invoice::where('patient_id', $visit->patient_id)
            ->where(function ($query) {
                $query->where('subtotal', '>', 0)
                    ->where('status', '!=', 'paid')
                    ->where('status', '!=', 'cancelled');
            })
            ->orWhere(function ($query) {
                $query->whereIn('status', ['unpaid', 'partial']);
            })
            ->get();

        // If no invoices found, try getting any with subtotal > 0
        if ($unpaidInvoices->isEmpty()) {
            $unpaidInvoices = Invoice::where('patient_id', $visit->patient_id)
                ->where('subtotal', '>', 0)
                ->where('status', '!=', 'paid')
                ->where('status', '!=', 'cancelled')
                ->get();
        }

        // Calculate total unpaid from subtotal (or balance if available)
        $totalUnpaid = $unpaidInvoices->sum(function ($invoice) {
            return $invoice->balance ?? $invoice->subtotal ?? 0;
        });

        // Get patient name
        $patientName = $visit->patient->name;
        if (empty($patientName)) {
            $patientName = ($visit->patient->first_name ?? '') . ' ' . ($visit->patient->last_name ?? '');
            $patientName = trim($patientName) ?: 'Unknown Patient';
        }

        return [
            'id' => $visit->id,
            'queue_number' => $visit->queue_number ?? 'Q' . str_pad($visit->id, 4, '0', STR_PAD_LEFT),
            'patient' => [
                'id' => $visit->patient->id,
                'name' => $patientName,
                'phone' => $visit->patient->phone ?? null,
                'email' => $visit->patient->email ?? null,
            ],
            'department' => [
                'id' => $visit->department->id,
                'name' => $visit->department->name,
            ],
            'status' => $this->mapStatus($visit->status),
            'priority' => $visit->priority ?? 'medium',
            'arrived_at' => $visit->created_at ? $visit->created_at->toISOString() : now()->toISOString(),
            'started_at' => $visit->started_at?->toISOString(),
            'completed_at' => $visit->updated_at?->toISOString(),
            'estimated_wait_time' => $visit->estimated_wait_time ?? rand(5, 25),
            'notes' => $visit->notes,
            'total_unpaid' => $totalUnpaid,
            'unpaid_invoices' => $unpaidInvoices->map(function ($invoice) {
                return $this->formatInvoice($invoice);
            }),
            'all_invoices_count' => $allInvoices->count(),
        ];
    }

    private function formatInvoice($invoice)
    {
        // Parse items - handle different JSON formats
        $items = [];
        if ($invoice->items) {
            if (is_string($invoice->items)) {
                $decoded = json_decode($invoice->items, true);
                $items = is_array($decoded) ? $decoded : [];
            } elseif (is_array($invoice->items)) {
                $items = $invoice->items;
            }
        }

        // Fetch service details for each item
        $formattedItems = array_map(function ($item) {
            $serviceId = $item['service_id'] ?? $item['drug_id'] ?? null;
            $service = null;

            if ($serviceId) {
                $service = Service::where('id', $serviceId)->first();
            }

            $itemName = $item['name'] ?? $item['category'] ?? 'Item';
            if ($service) {
                $itemName = $service->service_name ?? $service->name ?? $itemName;
            }

            $itemPrice = (float) ($item['price'] ?? 0);
            if ($service && $itemPrice === 0) {
                $itemPrice = (float) ($service->price ?? 0);
            }

            $itemType = $item['type'] ?? $item['category'] ?? 'Service';
            if ($service) {
                $itemType = $service->service_category ?? $service->category ?? $itemType;
            }

            return [
                'id' => $item['id'] ?? null,
                'service_id' => $serviceId,
                'name' => $itemName,
                'price' => $itemPrice,
                'total' => (float) ($item['total'] ?? $itemPrice),
                'quantity' => (int) ($item['quantity'] ?? 1),
                'type' => $itemType,
                'category' => $item['category'] ?? $service->service_category ?? null,
                'service_name' => $service ? ($service->service_name ?? $service->name) : null,
                'service_code' => $service ? ($service->service_code ?? null) : null,
                'description' => $service ? ($service->description ?? null) : null,
                'notes' => $item['notes'] ?? null,
                'dosage' => $item['dosage'] ?? null,
                'route' => $item['route'] ?? null,
                'frequency' => $item['frequency'] ?? null,
                'duration' => $item['duration'] ?? null,
                'drug_id' => $item['drug_id'] ?? null,
                'test_id' => $item['test_id'] ?? null,
            ];
        }, $items);

        // Get customer name
        $customerName = $invoice->customer_name;
        if (empty($customerName)) {
            $customerName = $invoice->patient->name ?? '';
        }

        // Calculate balance if not set
        $balance = $invoice->balance ?? ($invoice->subtotal - ($invoice->paid_amount ?? 0));

        return [
            'id' => $invoice->id,
            'invoice_number' => $invoice->invoice_number,
            'patient_id' => $invoice->patient_id,
            'customer_name' => $customerName,
            'customer_phone' => $invoice->customer_phone ?? '',
            'customer_email' => $invoice->customer_email ?? '',
            'customer_address' => $invoice->customer_address ?? '',
            'subtotal' => (float) ($invoice->subtotal ?? 0),
            'tax' => (float) ($invoice->tax ?? 0),
            'discount' => (float) ($invoice->discount ?? 0),
            'total' => (float) ($invoice->total ?? 0),
            'paid_amount' => (float) ($invoice->paid_amount ?? 0),
            'balance' => (float) $balance,
            'due_amount' => (float) ($invoice->due_amount ?? 0),
            'status' => $invoice->status ?? 'unpaid',
            'payment_scheme' => $invoice->payment_scheme ?? 'cash',
            'issue_date' => $invoice->issue_date,
            'due_date' => $invoice->due_date,
            'paid_date' => $invoice->paid_date,
            'items' => $formattedItems,
            'created_at' => $invoice->created_at?->toISOString(),
            'updated_at' => $invoice->updated_at?->toISOString(),
        ];
    }

    private function mapStatus($status)
    {
        $statusMap = [
            0 => 'waiting',
            1 => 'completed',
            2 => 'cancelled',
            3 => 'no_show',
            4 => 'in_progress',
        ];

        return $statusMap[$status] ?? 'waiting';
    }

    public function startConsultation(PatientVisit $visit)
    {
        $visit->update([
            'status' => 4,
            'started_at' => now(),
        ]);

        return back()->with('success', 'Consultation started successfully');
    }

    public function completeVisit(PatientVisit $visit)
    {
        $visit->update([
            'status' => 1,
            'completed_at' => now(),
        ]);

        return back()->with('success', 'Visit completed successfully');
    }
}
