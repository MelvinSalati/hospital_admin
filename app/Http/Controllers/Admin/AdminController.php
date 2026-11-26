<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Budgets\BudgetAllocation;
use App\Models\Budgets\BudgetTransaction;
use App\Models\BulkStores\PurchaseRequisition;
use App\Models\User;
use App\Models\UserActivityLog;
use App\Policies\ApprovePurchaseRequestPolicy;
use App\Services\Budgets\BudgetService;
use App\Services\UserService;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class AdminController extends Controller
{
    /**
     * Permission key (sent by the React page) => users table column.
     */
    private const PERMISSION_COLUMNS = [
        'approve-purchase-order' => 'approve_requisition',
        'approve-grn'            => 'approve_grn',
        'add-services'           => 'add_service',
        'remove-services'        => 'remove_service',
        'create-budget'          => 'create_budget',
    ];

    protected UserService $userService;
    protected BudgetService $budgetService;
    protected ApprovePurchaseRequestPolicy $policy;

    public function __construct(
        UserService $userService,
        BudgetService $budgetService,
        ApprovePurchaseRequestPolicy $policy
    ) {
        $this->userService = $userService;
        $this->budgetService = $budgetService;
        $this->policy = $policy;
    }

    // ==================================================================
    // USERS & PERMISSIONS
    // ==================================================================

    /**
     * Get all system users
     */
    public function getSystemUsers()
    {
        try {
            $allUsers = $this->withLiveStatus($this->userService->getUsers());
            return response()->json([
                'users' => $allUsers,
                'success' => true
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Adds live status (is_online, last_seen_at, current_activity, ...) to every user row.
     * Reads straight from the users table, so it does not depend on UserService's select list.
     */
    private function withLiveStatus($users): array
    {
        $cutoff = now()->subMinutes(15);

        $live = DB::table('users')
            ->select('id', 'last_login_at', 'last_seen_at', 'current_activity', 'last_activity_at', 'revoked_at')
            ->get()
            ->keyBy('id');

        $iso = fn($value) => $value ? Carbon::parse($value)->toIso8601String() : null;

        return collect($users)->map(function ($user) use ($live, $cutoff, $iso) {
            $row = json_decode(json_encode($user), true) ?? [];
            $status = $live->get($row['id'] ?? null);

            if (!$status) {
                $row['is_online'] = false;
                return $row;
            }

            $seen = $status->last_seen_at ? Carbon::parse($status->last_seen_at) : null;

            $row['is_online']        = $seen !== null && $seen->gte($cutoff) && $status->revoked_at === null;
            $row['last_seen_at']     = $iso($status->last_seen_at);
            $row['last_login_at']    = $iso($status->last_login_at);
            $row['last_activity_at'] = $iso($status->last_activity_at);
            $row['current_activity'] = $status->current_activity;

            return $row;
        })->values()->all();
    }

    /**
     * Update a user's permissions.
     * Payload: { "user_id": 5, "updated_by": 1, "permissions": ["approve-grn", "create-budget"] }
     * Listed keys become true, every other permission becomes false.
     */
    public function updatePermission(Request $request, int $userId): JsonResponse
    {
        $validated = $request->validate([
            'user_id'       => ['nullable', 'integer', Rule::in([$userId])],
            'updated_by'    => ['required', 'integer', 'exists:users,id'],
            'permissions'   => ['present', 'array'],
            'permissions.*' => ['string', Rule::in(array_keys(self::PERMISSION_COLUMNS))],
        ]);

        // Works with or without a logged-in session/token
        $actor = $request->user() ?? User::find($validated['updated_by']);

        abort_unless($actor?->is_admin, 403, 'Only administrators can change permissions.');

        $user = User::findOrFail($userId);

        $columns = [];
        foreach (self::PERMISSION_COLUMNS as $key => $column) {
            $columns[$column] = in_array($key, $validated['permissions'], true);
        }

        $user->forceFill($columns)->save();

        Log::info('User permissions updated', [
            'target_user_id' => $user->id,
            'updated_by'     => $actor->id,
            'permissions'    => $validated['permissions'],
        ]);

        return response()->json([
            'success'     => true,
            'message'     => 'Permissions updated',
            'permissions' => $this->permissionsFor($user),
        ]);
    }

    /**
     * Revoke a user's access: clears every extra permission, removes roles
     * (when a roles package is installed) and marks the account as revoked.
     * Payload: { "user_id": 5, "revoked_by": 1 }
     */
    public function revokePermissions(Request $request, int $userId): JsonResponse
    {
        try {
            $validated = $request->validate([
                'user_id'    => ['nullable', 'integer', Rule::in([$userId])],
                'revoked_by' => ['required', 'integer', 'exists:users,id'],
            ]);

            // Works with or without a logged-in session/token
            $actor = $request->user() ?? User::find($validated['revoked_by']);

            if (!$actor?->is_admin) {
                throw new \DomainException('Only administrators can revoke access.', 403);
            }
            if ((int) $actor->id === $userId) {
                throw new \DomainException('You cannot revoke your own access.', 422);
            }

            DB::beginTransaction();

            $user = User::lockForUpdate()->findOrFail($userId);

            if ($user->revoked_at) {
                throw new \DomainException('Access has already been revoked for this user.', 409);
            }

            // 1) every extra permission off
            $columns = [];
            foreach (self::PERMISSION_COLUMNS as $column) {
                $columns[$column] = false;
            }

            // 2) mark the account as revoked
            $columns['revoked_at'] = now();
            $columns['revoked_by'] = $actor->id;

            $user->forceFill($columns)->save();

            // 3) roles (only if a roles package such as spatie/laravel-permission is installed)
            if (method_exists($user, 'syncRoles')) {
                $user->syncRoles([]);
            }

            DB::commit();

            Log::info('User access revoked', [
                'target_user_id' => $user->id,
                'revoked_by'     => $actor->id,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Access revoked successfully',
                'user'    => ['id' => $user->id, 'revoked_at' => $user->revoked_at],
            ]);
        } catch (\Throwable $e) {
            return $this->failure($e, 'Failed to revoke permissions', ['user_id' => $userId]);
        }
    }

    /**
     * Activity log for one user on one day.
     * GET ?date=YYYY-MM-DD&requested_by=1  =>  { success, logs: [...] }
     */
    public function getUserAuditLogs(Request $request, int $userId): JsonResponse
    {
        $validated = $request->validate([
            'date'         => ['nullable', 'date_format:Y-m-d'],
            'requested_by' => ['nullable', 'integer', 'exists:users,id'],
        ]);

        // Works with or without a logged-in session/token
        $actor = $request->user() ?? User::find($validated['requested_by'] ?? null);

        abort_unless($actor?->is_admin, 403, 'Only administrators can view activity logs.');

        $date = $validated['date'] ?? now()->toDateString();

        $iso = fn($value) => Carbon::parse($value)->toIso8601String();

        // What the user did in the system (page visits, every create / update / delete)
        $activity = UserActivityLog::where('user_id', $userId)
            ->whereDate('created_at', $date)
            ->orderByDesc('created_at')
            ->limit(500)
            ->get(['id', 'action', 'module', 'is_financial', 'severity', 'description', 'ip_address', 'created_at'])
            ->map(fn($l) => [
                'id'           => 'a-' . $l->id,
                'action'       => $l->action,
                'module'       => $l->module,
                'is_financial' => (bool) $l->is_financial,
                'severity'     => $l->severity,
                'description'  => $l->description,
                'ip_address'   => $l->ip_address,
                'created_at'   => $iso($l->created_at),
            ]);

        // Business events already written to audit_logs (e.g. invoice item removed)
        $business = collect();
        if (Schema::hasTable('audit_logs')) {
            $business = DB::table('audit_logs')
                ->where('user_id', $userId)
                ->whereDate('created_at', $date)
                ->orderByDesc('created_at')
                ->limit(500)
                ->get(['id', 'action', 'module', 'summary', 'severity', 'user_ip', 'created_at'])
                ->map(fn($l) => [
                    'id'           => 'b-' . $l->id,
                    'action'       => ucfirst(str_replace('_', ' ', (string) $l->action)),
                    'module'       => $l->module ? ucfirst($l->module) : null,
                    'is_financial' => true,
                    'severity'     => $l->severity ?? 'info',
                    'description'  => $l->summary,
                    'ip_address'   => $l->user_ip,
                    'created_at'   => $iso($l->created_at),
                ]);
        }

        $logs = $activity->concat($business)
            ->sortByDesc(fn($l) => Carbon::parse($l['created_at'])->timestamp)
            ->values()
            ->take(500);

        return response()->json([
            'success' => true,
            'logs'    => $logs,
        ]);
    }

    /**
     * Reverse mapping (columns => keys), useful for pre-ticking checkboxes.
     */
    private function permissionsFor(User $user): array
    {
        return collect(self::PERMISSION_COLUMNS)
            ->filter(fn(string $column) => (bool) $user->{$column})
            ->keys()
            ->values()
            ->all();
    }

    // ==================================================================
    // BUDGETS
    // ==================================================================

    /**
     * Get all active budgets
     */
    public function getBudgets()
    {
        try {
            $budget = $this->budgetService->getAllActiveBudgets();
            return response()->json([
                'budgets' => $budget,
                'success' => true
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    // ==================================================================
    // PURCHASE REQUISITIONS
    // ==================================================================

    /**
     * Get all pending purchase requisitions
     */
    public function getPurchaseRequisitions(Request $request)
    {
        try {
            $query = PurchaseRequisition::query()
                ->with([
                    'department',
                    'requester',
                    'supplier',
                    'budgetAllocation',
                    'items.product',
                ])
                ->where('status', '!=', 'approved');   // only non-approved rows

            // ---- Filters ----
            if ($search = $request->input('search')) {
                $query->where(function ($q) use ($search) {
                    $q->where('pr_number', 'like', "%{$search}%")
                        ->orWhereHas('department', fn($d) =>
                        $d->where('name', 'like', "%{$search}%"))
                        ->orWhereHas('requester', fn($u) =>
                        $u->where('name', 'like', "%{$search}%"));
                });
            }

            if ($status = $request->input('status')) {
                $query->where('status', $status);
            }

            if ($priority = $request->input('priority')) {
                $query->where('priority', $priority);
            }

            if ($department = $request->input('department')) {
                $query->where('department_id', $department);
            }

            // ---- Paginate ----
            $perPage = (int) $request->input('page_size', 10);
            $orders  = $query->latest('created_at')->paginate($perPage)->withQueryString();

            // ---- Stats (same scope: non-approved) ----
            $statsBase = PurchaseRequisition::query()->where('status', '!=', 'approved');

            $stats = [
                'total'               => (clone $statsBase)->count(),
                'pending'             => (clone $statsBase)->where('status', 'pending')->count(),
                'approved'            => 0, // always 0 here: this page excludes approved
                'rejected'            => (clone $statsBase)->where('status', 'rejected')->count(),
                'total_value'         => (float) (clone $statsBase)->sum('estimated_total'),
                'urgent_count'        => (clone $statsBase)->where('priority', 'urgent')->count(),
                'high_priority_count' => (clone $statsBase)->where('priority', 'high')->count(),
                'funds_released'      => (clone $statsBase)->where('funds_released', true)->count(),
            ];

            return Inertia::render('admin/PurchaseRequisitions', [
                'orders'     => $orders->items(),
                'pagination' => [
                    'currentPage' => $orders->currentPage(),
                    'pageSize'    => $orders->perPage(),
                    'totalItems'  => $orders->total(),
                    'totalPages'  => $orders->lastPage(),
                ],
                'filters' => [
                    'search'     => (string) $request->input('search', ''),
                    'status'     => (string) $request->input('status', ''),
                    'priority'   => (string) $request->input('priority', ''),
                    'department' => (string) $request->input('department', ''),
                ],
                'stats' => $stats,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to fetch purchase requisitions: ' . $e->getMessage());

            return Inertia::render('admin/PurchaseRequisitions', [
                'orders'     => [],
                'pagination' => [
                    'currentPage' => 1,
                    'pageSize'    => 10,
                    'totalItems'  => 0,
                    'totalPages'  => 1,
                ],
                'filters' => [
                    'search'     => '',
                    'status'     => '',
                    'priority'   => '',
                    'department' => '',
                ],
                'stats' => [
                    'total'               => 0,
                    'pending'             => 0,
                    'approved'            => 0,
                    'rejected'            => 0,
                    'total_value'         => 0,
                    'urgent_count'        => 0,
                    'high_priority_count' => 0,
                    'funds_released'      => 0,
                ],
                'error' => 'Failed to load purchase requisitions.',
            ]);
        }
    }

    // ==================================================================
    // DEPARTMENT COLLECTIONS
    // ==================================================================

    /**
     * Collections (money actually received) for ONE department.
     *
     * GET /departments/collections/{departmentId}?from=YYYY-MM-DD&to=YYYY-MM-DD
     *
     * A collection = one paid service line (payment_items) of a completed payment,
     * where the service (services.id = payment_items.item_source_id) belongs to the department.
     *
     * Props match resources/js/pages/.../Collections.tsx:
     *   department  { id, name }
     *   collections [{ id, collected_at, patient_name, token, invoice_number, service,
     *                  scheme_type (1 cash | 2 insurance), payment_method, amount, received_by }]
     *   services    [{ id, service_name, times_paid, total_collected }]
     *   filters     { from, to }
     */

    private function resolvedServiceLinesCte(): string
    {
        return <<<'SQL'
    WITH inv_service_lines AS (
        SELECT
            i.id AS invoice_id,
            jt.ord,
            jt.service_id,
            jt.price,
            jt.quantity,
            COALESCE(
                jt.line_total,
                jt.price * COALESCE(jt.quantity, 1),
                jt.price
            ) AS line_total
        FROM invoices i
        CROSS JOIN JSON_TABLE(
            i.items,
            '$[*]'
            COLUMNS (
                ord FOR ORDINALITY,
                service_id BIGINT PATH '$.service_id'
                    NULL ON EMPTY NULL ON ERROR,
                price DECIMAL(12,2) PATH '$.price'
                    NULL ON EMPTY NULL ON ERROR,
                quantity DECIMAL(12,2) PATH '$.quantity'
                    NULL ON EMPTY NULL ON ERROR,
                line_total DECIMAL(12,2) PATH '$.total'
                    NULL ON EMPTY NULL ON ERROR
            )
        ) AS jt
        WHERE i.items IS NOT NULL
          AND jt.service_id IS NOT NULL
    ),

    inv_services AS (
        SELECT
            invoice_id,
            ord,
            service_id,
            price,
            quantity,
            line_total,
            SUM(line_total) OVER (
                PARTITION BY invoice_id
            ) AS invoice_items_total
        FROM inv_service_lines
    ),

    resolved AS (
        SELECT
            p.id,
            p.id AS payment_id,
            i.id AS invoice_id,

            COALESCE(p.patient_id, i.patient_id) AS patient_id,

            i.visit_token,
            pv.id AS patient_visit_id,

            i.invoice_number,
            i.payment_scheme,

            pt.first_name,
            pt.last_name,

            jt.service_id,
            s.service_name,
            s.department_id,

            p.payment_method,
            p.paid_amount,
            p.payment_date AS paid_at,
            p.created_at,

            jt.line_total,

            CASE
                WHEN jt.invoice_items_total > 0
                THEN (
                    p.paid_amount * jt.line_total
                    / jt.invoice_items_total
                )
                ELSE 0
            END AS allocated_amount

        FROM invoices i

        INNER JOIN inv_services jt
            ON jt.invoice_id = i.id

        INNER JOIN services s
            ON s.id = jt.service_id

        INNER JOIN payments p
            ON p.invoice_id = i.id
           AND p.status = 'completed'

        LEFT JOIN patients pt
            ON pt.id = COALESCE(p.patient_id, i.patient_id)

        LEFT JOIN patient_visits pv
            ON pv.token = i.visit_token
    )
    SQL;
    }

private function departmentServices(
    int $departmentId,
    ?string $from,
    ?string $to
): array {
    $dateSql = '';
    $bindings = ['dept' => $departmentId];

    if ($from) {
        $dateSql .= " AND DATE(COALESCE(r.paid_at, r.created_at)) >= :from_date";
        $bindings['from_date'] = $from;
    }

    if ($to) {
        $dateSql .= " AND DATE(COALESCE(r.paid_at, r.created_at)) <= :to_date";
        $bindings['to_date'] = $to;
    }

    $sql = $this->resolvedServiceLinesCte() . "
        SELECT
            s.id,
            s.service_name,

            COUNT(r.id) AS times_paid,

            COALESCE(SUM(r.allocated_amount), 0) AS total_collected

        FROM services s

        LEFT JOIN resolved r
            ON r.service_id = s.id
            {$dateSql}

        WHERE s.department_id = :dept

        GROUP BY
            s.id,
            s.service_name

        ORDER BY s.service_name
    ";

    return collect(DB::select($sql, $bindings))
        ->map(fn ($row) => [
            'id' => (int) $row->id,
            'service_name' => $row->service_name,
            'times_paid' => (int) $row->times_paid,
            'total_collected' => (float) $row->total_collected,
        ])
        ->values()
        ->all();
}

    private function departmentCollections(
        int $departmentId,
        ?string $from,
        ?string $to
    ): array {
        $hasReceivedBy = Schema::hasColumn('payments', 'received_by');

        $collectedAt = 'COALESCE(r.paid_at, r.created_at)';

        $userJoin = $hasReceivedBy
            ? 'LEFT JOIN users u ON u.id = p.received_by'
            : '';

        $receivedBySql = $hasReceivedBy
            ? "COALESCE(u.name, 'N/A')"
            : "'N/A'";

        $dateSql = '';
        $bindings = ['dept' => $departmentId];

        if ($from) {
            $dateSql .= " AND DATE({$collectedAt}) >= :from_date";
            $bindings['from_date'] = $from;
        }

        if ($to) {
            $dateSql .= " AND DATE({$collectedAt}) <= :to_date";
            $bindings['to_date'] = $to;
        }

        $sql = $this->resolvedServiceLinesCte() . "
        SELECT
            r.id,

            {$collectedAt} AS collected_at,

            COALESCE(
                NULLIF(
                    TRIM(CONCAT_WS(' ', r.first_name, r.last_name)),
                    ''
                ),
                'Unknown patient'
            ) AS patient_name,

            r.visit_token AS token,

            COALESCE(
                r.invoice_number,
                CONCAT('INV-', r.invoice_id)
            ) AS invoice_number,

            r.service_name AS service,

            COALESCE(
                r.payment_method,
                r.payment_scheme
            ) AS payment_method,

            r.allocated_amount AS amount,

            {$receivedBySql} AS received_by

        FROM resolved r

        LEFT JOIN payments p
            ON p.id = r.payment_id

        {$userJoin}

        WHERE r.department_id = :dept

        {$dateSql}

        ORDER BY {$collectedAt} DESC
    ";

        $data = collect(DB::select($sql, $bindings))
            ->map(fn($row) => [
                'id' => (int) $row->id,
                'collected_at' => Carbon::parse($row->collected_at)
                    ->toIso8601String(),

                'patient_name' => $row->patient_name,
                'token' => $row->token,
                'invoice_number' => $row->invoice_number,
                'service' => $row->service,

                'scheme_type' => $row->payment_method === 'insurance' ? 2 : 1,

                'payment_method' => Str::headline(
                    (string) $row->payment_method
                ),

                'amount' => (float) $row->amount,
                'received_by' => $row->received_by,
            ])
            ->values()
            ->all();

        Log::info('collections', $data);

        return $data;
    }
    public function getDepartmentCollections(Request $request, int $departmentId)
    {
        $validated = $request->validate([
            'from' => ['nullable', 'date_format:Y-m-d'],
            'to'   => ['nullable', 'date_format:Y-m-d', 'after_or_equal:from'],
        ]);

        $department = DB::table('departments')
            ->select('id', 'name')
            ->where('id', $departmentId)
            ->first();

        abort_if(!$department, 404, 'Department not found.');

        $from = $validated['from'] ?? Carbon::now()->subMonths(6)->format('Y-m-d');
        $to   = $validated['to'] ?? Carbon::now()->format('Y-m-d');

        return Inertia::render('admin/collection', [
            'department'  => $department,
            'collections' => $this->departmentCollections($departmentId, $from, $to),
            'services'    => $this->departmentServices($departmentId, $from, $to),
            'filters'     => ['from' => $from, 'to' => $to],
        ]);
    }

    /**
     * Get all approved purchase requisitions (purchase orders)
     */
    public function getPurchaseOrders()
    {
        try {
            $purchaseRequisition = PurchaseRequisition::with([
                'department',
                'requester',
                'supplier',
                'budgetAllocation',
                'items.product'
            ])->where('status', 'approved')->get();

            return response()->json([
                'orders' => $purchaseRequisition,
                'success' => true
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to fetch purchase requisitions: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    // ------------------------------------------------------------------
    // Check budget (reserves funds, idempotent)
    // ------------------------------------------------------------------
    public function checkBudget(int $requisitionId, Request $request)
    {
        try {
            DB::beginTransaction();

            $requisition = PurchaseRequisition::lockForUpdate()->findOrFail($requisitionId);
            $user = Auth::user();

            if (!$this->policy->approve($user, $requisition)) {
                throw new \DomainException('You do not have permission to approve this requisition. Only admins and supervisors can approve.', 403);
            }
            if (!$requisition->budget_code) {
                throw new \DomainException('No budget code assigned to this requisition.', 400);
            }
            if ($requisition->status !== 'pending') {
                throw new \DomainException('Requisition is not in pending status.', 400);
            }

            $budget = BudgetAllocation::where('budget_code', $requisition->budget_code)
                ->where('status', 'active')
                ->first();

            if (!$budget) {
                throw new \DomainException('Budget allocation not found for the given budget code.', 404);
            }

            $amount = round((float) $requisition->estimated_total, 2);

            // Money this PR already holds + money still free to promise
            $held = max(0, $this->reservedFor($requisition));
            $free = round((float) $budget->uncommitted_amount + $held, 2);
            $hasSufficientFunds = $free >= $amount;

            if ($hasSufficientFunds && !$this->syncReservation($budget, $requisition, $amount)) {
                throw new \DomainException('Failed to reserve budget funds. Please try again.', 409);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'data' => [
                    'budget_check' => [
                        'has_sufficient_funds' => $hasSufficientFunds,
                        'budget_code'          => $budget->budget_code,
                        'available_balance'    => $free,
                        'cash_available'       => (float) $budget->available_amount,
                        'requested_amount'     => $amount,
                        'budget_line'          => $budget->budget_name,
                        'budget_holder'        => $budget->creator->name ?? 'N/A',
                        'currency'             => 'ZMW',
                        'message'              => $hasSufficientFunds
                            ? 'Budget has sufficient funds. You can proceed with approval.'
                            : 'Insufficient budget funds. Available: ' . number_format($free, 2),
                    ],
                ],
            ]);
        } catch (\Throwable $e) {
            return $this->failure($e, 'Failed to check budget', ['requisition_id' => $requisitionId]);
        }
    }

    // ------------------------------------------------------------------
    // Approve (reserved -> committed)
    // ------------------------------------------------------------------
    public function approveRequisition(int $requisitionId, Request $request)
    {
        try {
            $request->validate([
                'approval_code' => 'required|string',
                'comments'      => 'nullable|string',
                'approved_by'   => 'required|integer|exists:users,id',
            ]);

            DB::beginTransaction();

            $requisition = PurchaseRequisition::lockForUpdate()->findOrFail($requisitionId);
            $user = User::findOrFail($request->approved_by);

            if (!$this->policy->approve($user, $requisition)) {
                $message = 'You do not have permission to approve this requisition. ';
                $message .= $this->policy->getUserRole($user) === 'supervisor'
                    ? 'Supervisors can only approve requisitions from their department (Department ID: ' . $user->department_id . ').'
                    : 'Only admins and supervisors can approve.';
                throw new \DomainException($message, 403);
            }

            if ($requisition->status !== 'pending') {
                throw new \DomainException('This requisition is not in pending status. Current status: ' . $requisition->status, 400);
            }
            if (empty($user->approval_code)) {
                throw new \DomainException('User does not have an approval code assigned. Please contact administrator.', 400);
            }
            if (!hash_equals((string) $user->approval_code, (string) $request->approval_code)) {
                throw new \DomainException('Invalid approval code. Please enter the correct approval code.', 400);
            }

            $budget = BudgetAllocation::where('budget_code', $requisition->budget_code)
                ->where('status', 'active')
                ->first();

            if (!$budget) {
                throw new \DomainException('Budget allocation not found or inactive for budget code: ' . $requisition->budget_code, 404);
            }

            $amount = round((float) $requisition->estimated_total, 2);

            // 1) make sure exactly $amount is reserved for this PR (covers "check budget never ran")
            if (!$this->syncReservation($budget, $requisition, $amount)) {
                throw new \DomainException('Insufficient budget to approve this requisition.', 422);
            }

            // 2) reserved -> committed. Abort the whole approval if it fails.
            if (!$budget->commitBudget($amount, 'PR', $requisition->id)) {
                throw new \DomainException('Failed to commit budget funds for this requisition.', 409);
            }

            // 3) only now flip the status
            $requisition->status      = 'approved';
            $requisition->approved_by = $request->approved_by;
            $requisition->approved_at = now();
            $requisition->save();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Requisition approved successfully',
                'data'    => ['requisition' => $requisition, 'budget_allocation' => $budget],
            ]);
        } catch (\Throwable $e) {
            return $this->failure($e, 'Failed to approve requisition', ['requisition_id' => $requisitionId]);
        }
    }

    // ------------------------------------------------------------------
    // Reject (release whatever this PR still holds in reserved)
    // ------------------------------------------------------------------
    public function rejectRequisition(int $requisitionId, Request $request)
    {
        try {
            $request->validate([
                'approval_code'    => 'required|string',
                'rejection_reason' => 'required|string',
                'rejected_by'      => 'required|integer|exists:users,id',
            ]);

            DB::beginTransaction();

            $requisition = PurchaseRequisition::lockForUpdate()->findOrFail($requisitionId);
            $user = User::findOrFail($request->rejected_by);

            if (!$this->policy->approve($user, $requisition)) {
                throw new \DomainException('You do not have permission to reject this requisition.', 403);
            }
            if ($requisition->status !== 'pending') {
                throw new \DomainException('This requisition is not in pending status.', 400);
            }
            if (!hash_equals((string) $user->approval_code, (string) $request->approval_code)) {
                throw new \DomainException('Invalid approval code.', 400);
            }

            $held = $this->reservedFor($requisition);

            if ($held > 0) {
                // no 'active' filter: a frozen budget must still get its reservation back
                $budget = BudgetAllocation::where('budget_code', $requisition->budget_code)->first();

                if (!$budget || !$budget->releaseReservedFunds($held, 'PR', $requisition->id)) {
                    throw new \DomainException('Could not release the reserved funds for this requisition.', 409);
                }
            }

            $requisition->status        = 'rejected';
            $requisition->approved_by   = $request->rejected_by;
            $requisition->approved_at   = now();
            $requisition->justification = ($requisition->justification ? $requisition->justification . "\n\n" : '')
                . 'Rejection Reason: ' . $request->rejection_reason;
            $requisition->save();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Requisition rejected successfully',
                'data'    => ['requisition' => $requisition],
            ]);
        } catch (\Throwable $e) {
            return $this->failure($e, 'Failed to reject requisition', ['requisition_id' => $requisitionId]);
        }
    }

    // ------------------------------------------------------------------
    // Release funds (committed -> actual_spent). ADMIN only.
    // ------------------------------------------------------------------
    public function releaseFunds(int $id, Request $request)
    {
        try {
            $request->validate([
                'approval_code' => 'required|string',
                'comments'      => 'nullable|string',
                'released_by'   => 'required|integer|exists:users,id',
            ]);

            DB::beginTransaction();

            $requisition = PurchaseRequisition::lockForUpdate()->findOrFail($id);
            $user = User::findOrFail($request->released_by);

            if (!$user->is_admin) {
                throw new \DomainException('Only administrators can release funds.', 403);
            }
            if ($requisition->status !== 'approved') {
                throw new \DomainException('This requisition is not approved.', 400);
            }
            if ($requisition->funds_released) {
                throw new \DomainException('Funds have already been released for this requisition.', 400);
            }
            if (!hash_equals((string) $user->approval_code, (string) $request->approval_code)) {
                throw new \DomainException('Invalid approval code.', 400);
            }

            $budget = BudgetAllocation::where('budget_code', $requisition->budget_code)
                ->where('status', 'active')
                ->first();

            if (!$budget) {
                throw new \DomainException('Budget allocation not found or inactive.', 404);
            }

            $amount = round((float) $requisition->estimated_total, 2);

            // Safety net for PRs approved while the old code was silently failing
            if (!$this->ensureCommitted($budget, $requisition, $amount)) {
                throw new \DomainException('Insufficient budget to release these funds.', 422);
            }

            // committed -> actual_spent; the model's saving hook recalculates available + utilization
            if (!$budget->actualizeBudget($amount, 'PR', $requisition->id)) {
                throw new \DomainException('Failed to release funds: committed amount is lower than the requisition total.', 409);
            }

            $requisition->funds_released    = true;
            $requisition->funds_released_at = now();
            $requisition->funds_released_by = $request->released_by;
            $requisition->save();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Funds released successfully',
                'data'    => ['requisition' => $requisition, 'budget_allocation' => $budget],
            ]);
        } catch (\Throwable $e) {
            return $this->failure($e, 'Failed to release funds', ['requisition_id' => $id]);
        }
    }

    /**
     * Get user permissions for requisition actions
     */
    public function getUserPermissions(int $requisitionId)
    {
        try {
            $requisition = PurchaseRequisition::findOrFail($requisitionId);
            $user = request()->user();

            return response()->json([
                'success' => true,
                'data' => [
                    'can_approve'       => $this->policy->approve($user, $requisition),
                    'can_release_funds' => $this->policy->releaseFunds($user, $requisition),
                    'can_authorize'     => $this->policy->authorize($user, $requisition),
                    'can_cancel'        => $this->policy->cancel($user, $requisition),
                    'can_delete'        => $this->policy->delete($user, $requisition),
                    'can_view'          => $this->policy->viewRequisition($user, $requisition),
                    'has_approval_code' => $user->approval_code !== null,
                    'user_role'         => $user->is_admin ? 'admin' : ($user->is_supervisor ? 'supervisor' : 'staff'),
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to get user permissions: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Validate approval code for a user
     */
    public function validateApprovalCode(Request $request)
    {
        try {
            $request->validate([
                'approval_code' => 'required|string',
                'user_id'       => 'required|integer|exists:users,id'
            ]);

            $user = User::findOrFail($request->user_id);

            $isValid = $user->approval_code !== null
                && hash_equals((string) $user->approval_code, (string) $request->approval_code);

            return response()->json([
                'success' => true,
                'data' => [
                    'valid'   => $isValid,
                    'message' => $isValid ? 'Approval code is valid' : 'Invalid approval code'
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    // ==================================================================
    // HELPERS
    // ==================================================================

    /** Sum of budget_transactions of one type for this PR */
    private function txTotal(PurchaseRequisition $pr, string $type): float
    {
        return (float) BudgetTransaction::where('budget_code', $pr->budget_code)
            ->where('reference_type', 'PR')
            ->where('reference_id', $pr->id)
            ->where('transaction_type', $type)
            ->sum('amount');
    }

    /** Money this PR currently holds in reserved_amount (reservations - reversals - commitments) */
    private function reservedFor(PurchaseRequisition $pr): float
    {
        return round(
            $this->txTotal($pr, 'reservation')
                + $this->txTotal($pr, 'reversal')      // stored negative
                - $this->txTotal($pr, 'commitment'),
            2
        );
    }

    /** Make reserved money for this PR equal exactly $amount (idempotent) */
    private function syncReservation(BudgetAllocation $budget, PurchaseRequisition $pr, float $amount): bool
    {
        $diff = round($amount - max(0, $this->reservedFor($pr)), 2);

        if ($diff > 0) return $budget->reserveBudget($diff, 'PR', $pr->id);
        if ($diff < 0) return $budget->releaseReservedFunds(abs($diff), 'PR', $pr->id);

        return true;
    }

    /** Make sure $amount is committed for this PR (repairs rows where commit silently failed) */
    private function ensureCommitted(BudgetAllocation $budget, PurchaseRequisition $pr, float $amount): bool
    {
        $need = round($amount - $this->txTotal($pr, 'commitment'), 2);
        if ($need <= 0) return true;

        $held = max(0, $this->reservedFor($pr));

        if ($held < $need && !$budget->reserveBudget(round($need - $held, 2), 'PR', $pr->id)) {
            return false;
        }

        return $budget->commitBudget($need, 'PR', $pr->id);
    }

    /** Roll back and turn any exception into a JSON response */
    private function failure(\Throwable $e, string $context, array $logContext = [])
    {
        if (DB::transactionLevel() > 0) {
            DB::rollBack();
        }

        if ($e instanceof ValidationException) {
            return response()->json(['success' => false, 'message' => 'Validation failed', 'errors' => $e->errors()], 422);
        }
        if ($e instanceof ModelNotFoundException) {
            return response()->json(['success' => false, 'message' => 'Record not found.'], 404);
        }
        if ($e instanceof \DomainException) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], $e->getCode() ?: 400);
        }

        Log::error("{$context}: " . $e->getMessage(), $logContext + ['trace' => $e->getTraceAsString()]);

        return response()->json(['success' => false, 'message' => "{$context}: " . $e->getMessage()], 500);
    }
}
