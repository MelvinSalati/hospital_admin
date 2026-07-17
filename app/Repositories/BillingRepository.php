<?php
// app/Repositories/BillingRepository.php

namespace App\Repositories;

use Illuminate\Support\Facades\DB;

class BillingRepository extends BaseRepository
{
    protected function setTable(): void
    {
        $this->table = 'bills';
    }

    /**
     * Get bills list with filters
     */
    public function getBillsList(array $filters = [], $perPage = 15)
    {
        $query = DB::table('bills as b')
            ->join('patients as p', 'b.patient_id', '=', 'p.id')
            ->leftJoin('users as u', 'b.created_by', '=', 'u.id')
            ->whereNull('b.deleted_at')
            ->whereNull('p.deleted_at')
            ->select(
                'b.*',
                'p.id as patient_id',
                'p.patient_number',
                'p.first_name as patient_first_name',
                'p.last_name as patient_last_name',
                'p.email as patient_email',
                'p.phone as patient_phone',
                'p.profile_image as patient_image',
                'u.first_name as created_by_first_name',
                'u.last_name as created_by_last_name'
            );

        // Apply filters
        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('b.bill_number', 'like', "%{$search}%")
                    ->orWhere('p.first_name', 'like', "%{$search}%")
                    ->orWhere('p.last_name', 'like', "%{$search}%")
                    ->orWhere('p.patient_number', 'like', "%{$search}%");
            });
        }

        if (!empty($filters['patient_id'])) {
            $query->where('b.patient_id', $filters['patient_id']);
        }

        if (!empty($filters['payment_status'])) {
            $query->where('b.payment_status', $filters['payment_status']);
        }

        if (!empty($filters['payment_mode'])) {
            $query->where('b.payment_mode', $filters['payment_mode']);
        }

        if (!empty($filters['date_from'])) {
            $query->whereDate('b.bill_date', '>=', $filters['date_from']);
        }

        if (!empty($filters['date_to'])) {
            $query->whereDate('b.bill_date', '<=', $filters['date_to']);
        }

        // Order by
        $orderBy = $filters['order_by'] ?? 'b.bill_date';
        $orderDir = $filters['order_dir'] ?? 'desc';
        $query->orderBy($orderBy, $orderDir);

        // Paginate
        $page = request()->get('page', 1);
        $offset = ($page - 1) * $perPage;

        $total = $query->count();

        $data = $query->offset($offset)
            ->limit($perPage)
            ->get();

        // Format data
        $formattedData = $data->map(function ($item) {
            $items = $this->getBillItems($item->id);

            return [
                'id' => $item->id,
                'bill_number' => $item->bill_number,
                'bill_date' => $item->bill_date,
                'formatted_date' => date('d M Y', strtotime($item->bill_date)),
                'patient' => [
                    'id' => $item->patient_id,
                    'patient_number' => $item->patient_number,
                    'name' => trim($item->patient_first_name . ' ' . $item->patient_last_name),
                    'email' => $item->patient_email,
                    'phone' => $item->patient_phone,
                    'image' => $this->getProfileImageUrl($item->patient_image, $item->patient_first_name, $item->patient_last_name),
                    'initials' => $this->getInitials($item->patient_first_name, $item->patient_last_name)
                ],
                'billable_type' => $item->billable_type,
                'billable_id' => $item->billable_id,
                'subtotal' => $item->subtotal,
                'discount_amount' => $item->discount_amount,
                'total_amount' => $item->total_amount,
                'paid_amount' => $item->paid_amount,
                'due_amount' => $item->due_amount,
                'formatted_total' => '$' . number_format($item->total_amount, 2),
                'formatted_paid' => '$' . number_format($item->paid_amount, 2),
                'formatted_due' => '$' . number_format($item->due_amount, 2),
                'payment_status' => $item->payment_status,
                'status_badge' => $this->getPaymentStatusBadge($item->payment_status),
                'payment_mode' => $item->payment_mode,
                'payment_progress' => $item->total_amount > 0
                    ? round(($item->paid_amount / $item->total_amount) * 100, 2)
                    : 0,
                'items_count' => $items->count(),
                'items' => $items,
                'notes' => $item->notes,
                'created_by' => trim(($item->created_by_first_name ?? '') . ' ' . ($item->created_by_last_name ?? '')),
                'created_at' => $item->created_at,
                'actions' => [
                    'view' => "/bills/{$item->id}",
                    'edit' => "/bills/{$item->id}/edit",
                    'delete' => "/bills/{$item->id}",
                    'print' => "/bills/{$item->id}/print",
                    'payment' => "/bills/{$item->id}/payments"
                ]
            ];
        });

        return [
            'data' => $formattedData,
            'pagination' => [
                'total' => $total,
                'per_page' => $perPage,
                'current_page' => (int)$page,
                'last_page' => ceil($total / $perPage),
                'from' => $offset + 1,
                'to' => min($offset + $perPage, $total)
            ]
        ];
    }

    /**
     * Get bill details with items
     */
    public function getBillDetails($id)
    {
        $bill = DB::table('bills')
            ->where('id', $id)
            ->whereNull('deleted_at')
            ->first();

        if (!$bill) {
            return null;
        }

        $patient = DB::table('patients')->find($bill->patient_id);
        $items = $this->getBillItems($id);
        $payments = $this->getBillPayments($id);

        // Get billable details
        $billable = null;
        if ($bill->billable_type && $bill->billable_id) {
            $billable = DB::table($bill->billable_type . 's')
                ->where('id', $bill->billable_id)
                ->first();
        }

        return [
            'bill' => [
                'id' => $bill->id,
                'bill_number' => $bill->bill_number,
                'bill_date' => $bill->bill_date,
                'bill_time' => $bill->bill_time,
                'due_date' => $bill->due_date,
                'bill_type' => $bill->bill_type,
                'subtotal' => $bill->subtotal,
                'discount_type' => $bill->discount_type,
                'discount_value' => $bill->discount_value,
                'discount_amount' => $bill->discount_amount,
                'tax_type' => $bill->tax_type,
                'tax_value' => $bill->tax_value,
                'tax_amount' => $bill->tax_amount,
                'other_charges' => $bill->other_charges,
                'other_charges_description' => $bill->other_charges_description,
                'total_amount' => $bill->total_amount,
                'paid_amount' => $bill->paid_amount,
                'due_amount' => $bill->due_amount,
                'payment_status' => $bill->payment_status,
                'payment_mode' => $bill->payment_mode,
                'insurance_provider' => $bill->insurance_provider,
                'insurance_approval_code' => $bill->insurance_approval_code,
                'insurance_coverage' => $bill->insurance_coverage,
                'reference_number' => $bill->reference_number,
                'notes' => $bill->notes,
                'terms_conditions' => $bill->terms_conditions
            ],
            'patient' => [
                'id' => $patient->id,
                'patient_number' => $patient->patient_number,
                'name' => trim($patient->first_name . ' ' . $patient->last_name),
                'email' => $patient->email,
                'phone' => $patient->phone,
                'address' => $patient->address,
                'image' => $this->getProfileImageUrl($patient->profile_image, $patient->first_name, $patient->last_name)
            ],
            'billable' => $billable,
            'items' => $items,
            'payments' => $payments,
            'summary' => [
                'subtotal' => $bill->subtotal,
                'discount' => $bill->discount_amount,
                'tax' => $bill->tax_amount,
                'other' => $bill->other_charges,
                'total' => $bill->total_amount,
                'paid' => $bill->paid_amount,
                'due' => $bill->due_amount
            ]
        ];
    }

    /**
     * Create new bill
     */
    public function createBill(array $data)
    {
        try {
            $this->beginTransaction();

            $billNumber = $this->generateBillNumber();

            $billData = [
                'bill_number' => $billNumber,
                'patient_id' => $data['patient_id'],
                'billable_type' => $data['billable_type'] ?? null,
                'billable_id' => $data['billable_id'] ?? null,
                'bill_date' => $data['bill_date'] ?? today(),
                'bill_time' => $data['bill_time'] ?? now()->format('H:i:s'),
                'due_date' => $data['due_date'] ?? today()->addDays(7),
                'bill_type' => $data['bill_type'] ?? 'opd',
                'subtotal' => $data['subtotal'],
                'discount_type' => $data['discount_type'] ?? 'fixed',
                'discount_value' => $data['discount_value'] ?? 0,
                'discount_amount' => $data['discount_amount'] ?? 0,
                'tax_type' => $data['tax_type'] ?? 'percentage',
                'tax_value' => $data['tax_value'] ?? 0,
                'tax_amount' => $data['tax_amount'] ?? 0,
                'other_charges' => $data['other_charges'] ?? 0,
                'other_charges_description' => $data['other_charges_description'] ?? null,
                'total_amount' => $data['total_amount'],
                'paid_amount' => $data['paid_amount'] ?? 0,
                'due_amount' => $data['total_amount'] - ($data['paid_amount'] ?? 0),
                'payment_status' => $this->determinePaymentStatus($data),
                'payment_mode' => $data['payment_mode'] ?? 'cash',
                'insurance_provider' => $data['insurance_provider'] ?? null,
                'insurance_approval_code' => $data['insurance_approval_code'] ?? null,
                'insurance_coverage' => $data['insurance_coverage'] ?? 0,
                'reference_number' => $data['reference_number'] ?? null,
                'notes' => $data['notes'] ?? null,
                'terms_conditions' => $data['terms_conditions'] ?? null,
                'created_by' => auth()->id(),
                'created_at' => now(),
                'updated_at' => now()
            ];

            $billId = DB::table('bills')->insertGetId($billData);

            // Add items
            if (!empty($data['items'])) {
                foreach ($data['items'] as $item) {
                    $this->addBillItem($billId, $item);
                }
            }

            // Add payment if any
            if (($data['paid_amount'] ?? 0) > 0) {
                $this->addPayment($billId, $data);
            }

            $this->commit();

            return $this->find($billId);
        } catch (\Exception $e) {
            $this->rollback();
            throw $e;
        }
    }

    /**
     * Add item to bill
     */
    public function addBillItem($billId, array $itemData)
    {
        return DB::table('bill_items')->insert([
            'bill_id' => $billId,
            'itemable_type' => $itemData['itemable_type'] ?? null,
            'itemable_id' => $itemData['itemable_id'] ?? null,
            'item_code' => $itemData['item_code'] ?? null,
            'item_name' => $itemData['item_name'],
            'description' => $itemData['description'] ?? null,
            'quantity' => $itemData['quantity'] ?? 1,
            'unit_price' => $itemData['unit_price'],
            'discount_type' => $itemData['discount_type'] ?? 'fixed',
            'discount_value' => $itemData['discount_value'] ?? 0,
            'discount_amount' => $itemData['discount_amount'] ?? 0,
            'tax_type' => $itemData['tax_type'] ?? 'percentage',
            'tax_value' => $itemData['tax_value'] ?? 0,
            'tax_amount' => $itemData['tax_amount'] ?? 0,
            'total' => $itemData['total'],
            'notes' => $itemData['notes'] ?? null,
            'created_at' => now(),
            'updated_at' => now()
        ]);
    }

    /**
     * Add payment to bill
     */
    public function addPayment($billId, array $paymentData)
    {
        $paymentNumber = 'PAY' . date('Ymd') . str_pad(DB::table('payments')->count() + 1, 4, '0', STR_PAD_LEFT);

        return DB::table('payments')->insert([
            'payment_number' => $paymentNumber,
            'bill_id' => $billId,
            'patient_id' => $paymentData['patient_id'],
            'payment_date' => $paymentData['payment_date'] ?? today(),
            'payment_time' => $paymentData['payment_time'] ?? now()->format('H:i:s'),
            'amount' => $paymentData['paid_amount'],
            'payment_method' => $paymentData['payment_mode'] ?? 'cash',
            'transaction_id' => $paymentData['transaction_id'] ?? null,
            'reference_number' => $paymentData['reference_number'] ?? null,
            'notes' => $paymentData['payment_notes'] ?? null,
            'status' => 'completed',
            'received_by' => auth()->id(),
            'created_at' => now(),
            'updated_at' => now()
        ]);
    }

    /**
     * Process payment for bill
     */
    public function processPayment($billId, array $paymentData)
    {
        try {
            $this->beginTransaction();

            $bill = DB::table('bills')->where('id', $billId)->first();

            if (!$bill) {
                throw new \Exception('Bill not found');
            }

            // Add payment
            $paymentNumber = 'PAY' . date('Ymd') . str_pad(DB::table('payments')->count() + 1, 4, '0', STR_PAD_LEFT);

            DB::table('payments')->insert([
                'payment_number' => $paymentNumber,
                'bill_id' => $billId,
                'patient_id' => $bill->patient_id,
                'payment_date' => $paymentData['payment_date'] ?? today(),
                'payment_time' => $paymentData['payment_time'] ?? now()->format('H:i:s'),
                'amount' => $paymentData['amount'],
                'payment_method' => $paymentData['payment_method'],
                'transaction_id' => $paymentData['transaction_id'] ?? null,
                'cheque_number' => $paymentData['cheque_number'] ?? null,
                'cheque_date' => $paymentData['cheque_date'] ?? null,
                'bank_name' => $paymentData['bank_name'] ?? null,
                'mobile_money_number' => $paymentData['mobile_money_number'] ?? null,
                'mobile_money_provider' => $paymentData['mobile_money_provider'] ?? null,
                'notes' => $paymentData['notes'] ?? null,
                'status' => 'completed',
                'received_by' => auth()->id(),
                'created_at' => now(),
                'updated_at' => now()
            ]);

            // Update bill paid amount
            $newPaid = $bill->paid_amount + $paymentData['amount'];
            $newDue = $bill->total_amount - $newPaid;
            $newStatus = $this->determinePaymentStatus(['paid_amount' => $newPaid, 'total_amount' => $bill->total_amount]);

            DB::table('bills')
                ->where('id', $billId)
                ->update([
                    'paid_amount' => $newPaid,
                    'due_amount' => $newDue,
                    'payment_status' => $newStatus,
                    'updated_at' => now()
                ]);

            $this->commit();

            return $this->getBillDetails($billId);
        } catch (\Exception $e) {
            $this->rollback();
            throw $e;
        }
    }

    /**
     * Get revenue report
     */
    public function getRevenueReport($fromDate, $toDate, $groupBy = 'day')
    {
        $query = DB::table('payments')
            ->join('bills', 'payments.bill_id', '=', 'bills.id')
            ->whereBetween('payments.payment_date', [$fromDate, $toDate])
            ->where('payments.status', 'completed');

        switch ($groupBy) {
            case 'day':
                $query->select(
                    DB::raw('DATE(payments.payment_date) as period'),
                    DB::raw('COUNT(*) as count'),
                    DB::raw('SUM(payments.amount) as total'),
                    DB::raw('AVG(payments.amount) as average')
                )->groupBy(DB::raw('DATE(payments.payment_date)'));
                break;

            case 'month':
                $query->select(
                    DB::raw('DATE_FORMAT(payments.payment_date, "%Y-%m") as period'),
                    DB::raw('COUNT(*) as count'),
                    DB::raw('SUM(payments.amount) as total'),
                    DB::raw('AVG(payments.amount) as average')
                )->groupBy(DB::raw('DATE_FORMAT(payments.payment_date, "%Y-%m")'));
                break;

            case 'payment_method':
                $query->select(
                    'payments.payment_method as period',
                    DB::raw('COUNT(*) as count'),
                    DB::raw('SUM(payments.amount) as total')
                )->groupBy('payments.payment_method');
                break;
        }

        return $query->get();
    }

    /**
     * Get outstanding bills
     */
    public function getOutstandingBills()
    {
        return DB::table('bills')
            ->join('patients', 'bills.patient_id', '=', 'patients.id')
            ->whereIn('bills.payment_status', ['pending', 'partial'])
            ->whereNull('bills.deleted_at')
            ->select(
                'bills.*',
                'patients.patient_number',
                'patients.first_name as patient_first_name',
                'patients.last_name as patient_last_name',
                'patients.phone as patient_phone'
            )
            ->orderBy('bills.due_date')
            ->get();
    }

    /**
     * Get bill items
     */
    private function getBillItems($billId)
    {
        return DB::table('bill_items')
            ->where('bill_id', $billId)
            ->get();
    }

    /**
     * Get bill payments
     */
    private function getBillPayments($billId)
    {
        return DB::table('payments')
            ->where('bill_id', $billId)
            ->orderBy('payment_date', 'desc')
            ->get();
    }

    /**
     * Generate unique bill number
     */
    private function generateBillNumber(): string
    {
        $prefix = 'BILL';
        $year = date('Y');
        $month = date('m');

        $lastBill = DB::table('bills')
            ->whereYear('created_at', $year)
            ->whereMonth('created_at', $month)
            ->orderBy('id', 'desc')
            ->first();

        if ($lastBill) {
            $lastNumber = intval(substr($lastBill->bill_number, -4));
            $newNumber = str_pad($lastNumber + 1, 4, '0', STR_PAD_LEFT);
        } else {
            $newNumber = '0001';
        }

        return $prefix . $year . $month . $newNumber;
    }

    /**
     * Determine payment status
     */
    private function determinePaymentStatus($data): string
    {
        $paid = $data['paid_amount'] ?? 0;
        $total = $data['total_amount'];

        if ($paid >= $total) {
            return 'paid';
        } elseif ($paid > 0) {
            return 'partial';
        }
        return 'pending';
    }

    /**
     * Get payment status badge
     */
    private function getPaymentStatusBadge($status): array
    {
        $badges = [
            'pending' => ['label' => 'Pending', 'color' => 'yellow'],
            'partial' => ['label' => 'Partial', 'color' => 'blue'],
            'paid' => ['label' => 'Paid', 'color' => 'green'],
            'overdue' => ['label' => 'Overdue', 'color' => 'red'],
            'cancelled' => ['label' => 'Cancelled', 'color' => 'gray'],
            'refunded' => ['label' => 'Refunded', 'color' => 'purple']
        ];

        return $badges[$status] ?? ['label' => ucfirst($status), 'color' => 'gray'];
    }

    /**
     * Get profile image URL
     */
    private function getProfileImageUrl($image, $firstName, $lastName): string
    {
        if ($image) {
            return asset('storage/' . $image);
        }

        $name = urlencode(trim($firstName . ' ' . $lastName));
        return "https://ui-avatars.com/api/?name={$name}&background=4f46e5&color=fff";
    }

    /**
     * Get initials from name
     */
    private function getInitials($firstName, $lastName): string
    {
        if ($lastName) {
            return strtoupper(substr($firstName, 0, 1) . substr($lastName, 0, 1));
        }
        return strtoupper(substr($firstName, 0, 2));
    }
}
