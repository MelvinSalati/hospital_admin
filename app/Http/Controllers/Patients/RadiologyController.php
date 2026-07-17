<?php

namespace App\Http\Controllers\Patients;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Services\Service;
use App\Models\Patients\ImagingOrder;
use App\Models\Patients\Patient;
use App\Models\Patients\Admission;
use App\Helpers\VisitTokenHelper;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class RadiologyController extends Controller
{
    protected $imagingOrderController;
    protected $visitTokenHelper;

    public function __construct()
    {
        $this->imagingOrderController = new ImagingOrderController();
        $this->visitTokenHelper = new VisitTokenHelper();
    }

    /**
     * Display a listing of the resource.
     */
    public function index($patientId)
    {
        try {
            // Get active visit token for payment scheme
            $activeToken = $this->visitTokenHelper->getActiveTokenArray($patientId);
            $paymentMethod = $activeToken['payment_method'] ?? 'cash';

            // Get imaging/radiology services with correct pricing based on payment scheme
            $radiologyServices = Service::where('service_category', 'Imaging')
                ->where('is_active', 1)
                ->select(
                    'id',
                    'service_name',
                    'service_category',
                    'cash_price',
                    'nhima_price',
                    'insurance_price',
                    'charity_price',
                    'description'
                )
                ->get()
                ->map(function ($service) use ($paymentMethod) {
                    // Add the appropriate price based on payment scheme
                    $service->price = match ($paymentMethod) {
                        'nhima' => $service->nhima_price,
                        'insurance' => $service->insurance_price,
                        'charity' => $service->charity_price,
                        default => $service->cash_price,
                    };
                    return [
                        'id' => $service->id,
                        'service_name' => $service->service_name,
                        'service_category' => $service->service_category,
                        'price' => $service->price,
                        'description' => $service->description,
                    ];
                });

            // Get existing imaging orders formatted for PreviousOrdersTable
            $imagingOrders = ImagingOrder::where('patient_id', $patientId)
                ->get()
                ->map(function ($order) {
                    return [
                        'id' => $order->id,
                        'order_number' => $order->order_number,
                        'service_name' => $order->items->first()->service_name ?? 'Imaging Service',
                        'service_category' => 'Imaging',
                        'quantity' => $order->quantity,
                        'unit_price' => $order->total_amount / ($order->quantity ?: 1),
                        'total_price' => $order->total_amount,
                        'status' => $order->status,
                        'priority' => $order->priority,
                        'modality' => $order->modality,
                        'body_part' => $order->body_part,
                        'created_at' => $order->created_at?->toDateTimeString(),
                    ];
                });

            // Get admission number if patient is admitted
            $admission = Admission::where('patient_id', $patientId)
                ->where('status', 'active')
                ->first();

            $patient = Patient::find($patientId);

            return Inertia::render('patients/radiology', [
                'patientId' => $patientId,
                'services' => $radiologyServices,
                'previousOrders' => $imagingOrders,
            ]);
        } catch (\Exception $e) {
            Log::error('Radiology Index Error: ' . $e->getMessage());

            return Inertia::render('patients/radiology', [
                'patientId' => $patientId,
                'services' => [],
                'previousOrders' => [],
                'patient' => null,
                'admissionNumber' => null,
                'error' => 'Unable to load radiology data. Please try again.',
            ]);
        }
    }

    /**
     * Store a newly created imaging order.
     * Matches the endpoint expected by ImagingTab
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'patient_id' => 'required|exists:patients,id',
            'services' => 'required|array|min:1',
            'services.*.id' => 'required|exists:services,id',
            'services.*.service_name' => 'required|string',
            'services.*.service_category' => 'required|string',
            'services.*.price' => 'required|numeric|min:0',
            'services.*.quantity' => 'sometimes|integer|min:1',
            'services.*.notes' => 'nullable|string',
            'services.*.priority' => 'sometimes|in:routine,urgent,emergency,stat',
            'services.*.modality' => 'nullable|string',
            'services.*.body_part' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 422,
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $patientId = $request->input('patient_id');
        $services = $request->input('services');

        // Create orders for each service
        $results = [];

        foreach ($services as $service) {
            // Prepare request for ImagingOrderController
            $imagingRequest = new Request([
                'service_id' => $service['id'],
                'service_name' => $service['service_name'],
                'modality' => $service['modality'] ?? 'General',
                'body_part' => $service['body_part'] ?? 'General',
                'priority' => $service['priority'] ?? 'routine',
                'clinical_indication' => $service['notes'] ?? 'Clinical evaluation',
                'price' => $service['price'],
                'total_amount' => $service['price'] * ($service['quantity'] ?? 1),
                'quantity' => $service['quantity'] ?? 1,
                'admission_number' => $request->input('admission_number'),
                'notes' => $service['notes'],
                'scheme' => $request->input('scheme', 'cash'),
            ]);

            $result = $this->imagingOrderController->store($imagingRequest, $patientId);
            $results[] = json_decode($result->getContent(), true);
        }

        $success = !empty($results);
        $message = $success ? count($services) . ' imaging service(s) ordered successfully.' : 'Failed to order imaging services.';

        return response()->json([
            'success' => $success,
            'message' => $message,
            'data' => $results
        ], $success ? 201 : 500);
    }

    /**
     * Update order status
     */
    public function updateStatus(Request $request, $id)
    {
        return $this->imagingOrderController->updateStatus($request, $id);
    }

    /**
     * Cancel an order
     */
    public function cancel($id, Request $request)
    {
        return $this->imagingOrderController->cancel($id, $request);
    }

    /**
     * Get order details
     */
    public function show($id)
    {
        try {
            $order = ImagingOrder::with(['items', 'invoice', 'patient'])
                ->findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $order
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Order not found'
            ], 404);
        }
    }

    /**
     * Get orders by visit token
     */
    public function getByVisitToken($visitToken)
    {
        return $this->imagingOrderController->getByVisitToken($visitToken);
    }

    /**
     * Get summary statistics for radiology
     */
    public function getSummary($patientId)
    {
        try {
            $summary = [
                'total_orders' => ImagingOrder::where('patient_id', $patientId)->count(),
                'pending_orders' => ImagingOrder::where('patient_id', $patientId)
                    ->whereIn('status', ['pending', 'scheduled'])
                    ->count(),
                'completed_orders' => ImagingOrder::where('patient_id', $patientId)
                    ->where('status', 'completed')
                    ->count(),
                'cancelled_orders' => ImagingOrder::where('patient_id', $patientId)
                    ->where('status', 'cancelled')
                    ->count(),
                'total_amount' => ImagingOrder::where('patient_id', $patientId)
                    ->where('status', '!=', 'cancelled')
                    ->sum('total_amount'),
            ];

            return response()->json([
                'success' => true,
                'data' => $summary
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch summary'
            ], 500);
        }
    }

    /**
     * Get available modalities
     */
    public function getModalities()
    {
        $modalities = [
            'X-Ray',
            'Ultrasound',
            'CT Scan',
            'MRI',
            'Mammogram',
            'Fluoroscopy',
            'PET Scan',
            'Nuclear Medicine',
            'DEXA Scan',
            'Angiography'
        ];

        return response()->json([
            'success' => true,
            'data' => $modalities
        ], 200);
    }

    /**
     * Get body parts for imaging
     */
    public function getBodyParts()
    {
        $bodyParts = [
            'Head',
            'Neck',
            'Chest',
            'Abdomen',
            'Pelvis',
            'Spine',
            'Upper Extremity',
            'Lower Extremity',
            'Knee',
            'Shoulder',
            'Hip',
            'Ankle',
            'Wrist',
            'Elbow'
        ];

        return response()->json([
            'success' => true,
            'data' => $bodyParts
        ], 200);
    }
}
