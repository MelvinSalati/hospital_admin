<?php

namespace App\Repositories\Payments;

use App\Models\Payments\Payment;
use App\Models\Payments\PaymentMethod;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

class PaymentRepository
{
    protected Payment $paymentModel;
    protected PaymentMethod $paymentMethodModel;

    /**
     * Create a new class instance.
     */
    public function __construct(Payment $paymentModel, PaymentMethod $paymentMethodModel)
    {
        $this->paymentModel = $paymentModel;
        $this->paymentMethodModel = $paymentMethodModel;
    }

    /**
     * Get all payments with optional filters.
     */
    public function getAllPayments(array $filters = []): Collection
    {
        $query = $this->paymentModel->with('patient');

        if (!empty($filters['patient_id'])) {
            $query->where('patient_id', $filters['patient_id']);
        }

        if (!empty($filters['payment_method'])) {
            $query->where('payment_method', $filters['payment_method']);
        }

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (!empty($filters['date_from']) && !empty($filters['date_to'])) {
            $query->whereBetween('payment_date', [$filters['date_from'], $filters['date_to']]);
        }

        if (!empty($filters['search'])) {
            $query->where(function ($q) use ($filters) {
                $q->where('invoice_id', 'like', '%' . $filters['search'] . '%')
                    ->orWhere('reference_number', 'like', '%' . $filters['search'] . '%')
                    ->orWhere('description', 'like', '%' . $filters['search'] . '%');
            });
        }

        return $query->orderBy('payment_date', 'desc')->get();
    }

    /**
     * Get paginated payments.
     */
    public function getPaginatedPayments(int $perPage = 15, array $filters = []): LengthAwarePaginator
    {
        $query = $this->paymentModel->with('patient');

        if (!empty($filters['patient_id'])) {
            $query->where('patient_id', $filters['patient_id']);
        }

        if (!empty($filters['payment_method'])) {
            $query->where('payment_method', $filters['payment_method']);
        }

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        return $query->orderBy('payment_date', 'desc')->paginate($perPage);
    }

    /**
     * Get payment by ID.
     */
    public function findPaymentById(int $id): ?Payment
    {
        return $this->paymentModel->with('patient')->find($id);
    }

    /**
     * Get payments by patient.
     */
    public function getPaymentsByPatient(int $patientId): Collection
    {
        return $this->paymentModel->where('patient_id', $patientId)
            ->orderBy('payment_date', 'desc')
            ->get();
    }

    /**
     * Create a new payment.
     */
    public function createPayment(array $data): Payment
    {
        return $this->paymentModel->create($data);
    }

    /**
     * Update payment status.
     */
    public function updatePaymentStatus(int $id, string $status): bool
    {
        $payment = $this->findPaymentById($id);

        if (!$payment) {
            throw new \Exception('Payment not found');
        }

        return $payment->update(['status' => $status]);
    }

    /**
     * Update payment details.
     */
    public function updatePayment(int $id, array $data): bool
    {
        $payment = $this->findPaymentById($id);

        if (!$payment) {
            throw new \Exception('Payment not found');
        }

        return $payment->update($data);
    }

    /**
     * Delete a payment.
     */
    public function deletePayment(int $id): bool
    {
        $payment = $this->findPaymentById($id);

        if (!$payment) {
            throw new \Exception('Payment not found');
        }

        return $payment->delete();
    }

    /**
     * Get payment statistics.
     */
    public function getPaymentStatistics(?int $patientId = null): array
    {
        $query = $this->paymentModel->where('status', 'completed');

        if ($patientId) {
            $query->where('patient_id', $patientId);
        }

        $totalAmount = $query->sum('amount');
        $totalCount = $query->count();

        $byMethod = [
            'cash' => $query->clone()->where('payment_method', 'cash')->sum('amount'),
            'card' => $query->clone()->where('payment_method', 'card')->sum('amount'),
            'insurance' => $query->clone()->where('payment_method', 'insurance')->sum('amount'),
            'bank_transfer' => $query->clone()->where('payment_method', 'bank_transfer')->sum('amount'),
            'mobile_money' => $query->clone()->where('payment_method', 'mobile_money')->sum('amount'),
        ];

        $byMonth = $query->clone()
            ->select(DB::raw('DATE_FORMAT(payment_date, "%Y-%m") as month'), DB::raw('SUM(amount) as total'))
            ->groupBy('month')
            ->orderBy('month', 'desc')
            ->limit(12)
            ->get();

        return [
            'total_amount' => $totalAmount,
            'total_count' => $totalCount,
            'average_amount' => $totalCount > 0 ? $totalAmount / $totalCount : 0,
            'by_method' => $byMethod,
            'by_month' => $byMonth,
        ];
    }

    /**
     * Get payment methods for a patient.
     */
    public function getPaymentMethodsByPatient(int $patientId): Collection
    {
        return $this->paymentMethodModel->where('patient_id', $patientId)
            ->orderBy('is_default', 'desc')
            ->orderBy('created_at', 'desc')
            ->get();
    }

    /**
     * Get default payment method for a patient.
     */
    public function getDefaultPaymentMethod(int $patientId): ?PaymentMethod
    {
        return $this->paymentMethodModel->where('patient_id', $patientId)
            ->where('is_default', true)
            ->first();
    }

    /**
     * Find payment method by ID.
     */
    public function findPaymentMethodById(int $id): ?PaymentMethod
    {
        return $this->paymentMethodModel->find($id);
    }

    /**
     * Create a new payment method.
     */
    public function createPaymentMethod(array $data): PaymentMethod
    {
        return $this->paymentMethodModel->create($data);
    }

    /**
     * Update payment method.
     */
    public function updatePaymentMethod(int $id, array $data): bool
    {
        $paymentMethod = $this->findPaymentMethodById($id);

        if (!$paymentMethod) {
            throw new \Exception('Payment method not found');
        }

        return $paymentMethod->update($data);
    }

    /**
     * Delete payment method.
     */
    public function deletePaymentMethod(int $id): bool
    {
        $paymentMethod = $this->findPaymentMethodById($id);

        if (!$paymentMethod) {
            throw new \Exception('Payment method not found');
        }

        return $paymentMethod->delete();
    }

    /**
     * Set default payment method.
     */
    public function setDefaultPaymentMethod(int $patientId, int $methodId): bool
    {
        DB::beginTransaction();

        try {
            // Set all payment methods to non-default
            $this->paymentMethodModel->where('patient_id', $patientId)
                ->update(['is_default' => false]);

            // Set the selected method as default
            $method = $this->findPaymentMethodById($methodId);
            if (!$method || $method->patient_id !== $patientId) {
                throw new \Exception('Payment method not found');
            }

            $method->update(['is_default' => true]);

            DB::commit();
            return true;
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Get payment methods by type.
     */
    public function getPaymentMethodsByType(int $patientId, string $type): Collection
    {
        return $this->paymentMethodModel->where('patient_id', $patientId)
            ->where('type', $type)
            ->get();
    }

    /**
     * Check if patient has payment methods.
     */
    public function hasPaymentMethods(int $patientId): bool
    {
        return $this->paymentMethodModel->where('patient_id', $patientId)->exists();
    }

    /**
     * Get payment methods count.
     */
    public function getPaymentMethodsCount(int $patientId): int
    {
        return $this->paymentMethodModel->where('patient_id', $patientId)->count();
    }

    /**
     * Get payment methods with scheme details.
     */
    public function getPaymentMethodsWithScheme(int $patientId): Collection
    {
        return $this->paymentMethodModel->where('patient_id', $patientId)
            ->with('scheme.provider')
            ->orderBy('is_default', 'desc')
            ->get();
    }

    /**
     * Get payments by date range.
     */
    public function getPaymentsByDateRange(string $startDate, string $endDate, ?int $patientId = null): Collection
    {
        $query = $this->paymentModel->whereBetween('payment_date', [$startDate, $endDate]);

        if ($patientId) {
            $query->where('patient_id', $patientId);
        }

        return $query->orderBy('payment_date', 'desc')->get();
    }

    /**
     * Get payments by invoice.
     */
    public function getPaymentsByInvoice(string $invoiceId): Collection
    {
        return $this->paymentModel->where('invoice_id', $invoiceId)
            ->orderBy('payment_date', 'desc')
            ->get();
    }

    /**
     * Get total paid for invoice.
     */
    public function getTotalPaidForInvoice(string $invoiceId): float
    {
        return $this->paymentModel->where('invoice_id', $invoiceId)
            ->where('status', 'completed')
            ->sum('amount');
    }

    /**
     * Get recent payments.
     */
    public function getRecentPayments(int $limit = 10, ?int $patientId = null): Collection
    {
        $query = $this->paymentModel->with('patient')->orderBy('payment_date', 'desc');

        if ($patientId) {
            $query->where('patient_id', $patientId);
        }

        return $query->limit($limit)->get();
    }

    /**
     * Get payment method by provider.
     */
    public function getPaymentMethodsByProvider(int $patientId, string $provider): Collection
    {
        return $this->paymentMethodModel->where('patient_id', $patientId)
            ->where('provider', $provider)
            ->get();
    }

    /**
     * Search payment methods.
     */
    public function searchPaymentMethods(int $patientId, string $searchTerm): Collection
    {
        return $this->paymentMethodModel->where('patient_id', $patientId)
            ->where(function ($query) use ($searchTerm) {
                $query->where('provider', 'like', '%' . $searchTerm . '%')
                    ->orWhere('policy_number', 'like', '%' . $searchTerm . '%')
                    ->orWhere('account_number', 'like', '%' . $searchTerm . '%');
            })
            ->get();
    }

    /**
     * Bulk create payment methods.
     */
    public function bulkCreatePaymentMethods(array $methods): array
    {
        $created = [];
        $errors = [];

        foreach ($methods as $methodData) {
            try {
                $created[] = $this->paymentMethodModel->create($methodData);
            } catch (\Exception $e) {
                $errors[] = [
                    'data' => $methodData,
                    'error' => $e->getMessage(),
                ];
            }
        }

        return [
            'success' => $created,
            'errors' => $errors,
        ];
    }

    /**
     * Get payment summary by payment method.
     */
    public function getPaymentSummaryByMethod(?int $patientId = null): array
    {
        $query = $this->paymentModel->where('status', 'completed');

        if ($patientId) {
            $query->where('patient_id', $patientId);
        }

        return $query->select('payment_method', DB::raw('COUNT(*) as count'), DB::raw('SUM(amount) as total'))
            ->groupBy('payment_method')
            ->get()
            ->toArray();
    }
}
