<?php

namespace App\Policies;

use App\Models\User;
use App\Models\BulkStores\PurchaseRequisition;
use Illuminate\Auth\Access\Response;

class ApprovePurchaseRequestPolicy
{
    /**
     * Create a new policy instance.
     */
    public function __construct()
    {
        //
    }

    /**
     * Determine if the user can approve a purchase requisition.
     * ✅ Admin can approve ANY requisition
     * ✅ Supervisor can approve ONLY their department's requisitions
     * ✅ Staff cannot approve
     */
    public function approve(User $user, PurchaseRequisition $requisition): bool
    {
        // Only pending requisitions can be approved
        if ($requisition->status !== 'pending') {
            return false;
        }

        // Admin can approve any requisition
        if ($user->is_admin === true || $user->is_admin == 1) {
            return true;
        }

        // Supervisor can approve requisitions in their department only
        if (($user->is_supervisor === true || $user->is_supervisor == 1) &&
            $user->department_id === $requisition->department_id
        ) {
            return true;
        }

        // Allow if user has explicit permission
        if ($user->hasPermissionTo('approve-requisitions')) {
            return true;
        }

        return false;
    }

    /**
     * Determine if the user can release funds for a purchase requisition.
     * ✅ ONLY ADMIN can release funds
     * ❌ Supervisors CANNOT release funds
     */
    public function releaseFunds(User $user, PurchaseRequisition $requisition): bool
    {
        // Only approved requisitions can have funds released
        if ($requisition->status !== 'approved') {
            return false;
        }

        // ✅ ONLY ADMIN can release funds
        return ($user->is_admin === true || $user->is_admin == 1);
    }

    /**
     * Determine if the user can authorize a purchase requisition.
     * This is a combined action for admin only
     */
    public function authorize(User $user, PurchaseRequisition $requisition): bool
    {
        // Only pending requisitions can be authorized
        if ($requisition->status !== 'pending') {
            return false;
        }

        // ✅ ONLY ADMIN can authorize (approve + release funds)
        return ($user->is_admin === true || $user->is_admin == 1);
    }

    /**
     * Determine if the user can cancel a purchase requisition.
     */
    public function cancel(User $user, PurchaseRequisition $requisition): bool
    {
        // Cannot cancel completed or already cancelled requisitions
        if (in_array($requisition->status, ['completed', 'cancelled'])) {
            return false;
        }

        // Admin can cancel any
        if ($user->is_admin === true || $user->is_admin == 1) {
            return true;
        }

        // Supervisor can cancel requisitions in their department
        if (($user->is_supervisor === true || $user->is_supervisor == 1) &&
            $user->department_id === $requisition->department_id
        ) {
            return true;
        }

        // User can cancel their own draft/pending requisitions
        return $user->id === $requisition->requested_by && in_array($requisition->status, ['draft', 'pending']);
    }

    /**
     * Determine if the user can delete a purchase requisition.
     */
    public function delete(User $user, PurchaseRequisition $requisition): bool
    {
        // Only draft or cancelled requisitions can be deleted
        if (!in_array($requisition->status, ['draft', 'cancelled'])) {
            return false;
        }

        // Admin can delete any
        if ($user->is_admin === true || $user->is_admin == 1) {
            return true;
        }

        // User can delete their own draft/cancelled requisitions
        return $user->id === $requisition->requested_by;
    }

    /**
     * Determine if the user can view a purchase requisition.
     */
    public function viewRequisition(User $user, PurchaseRequisition $requisition): bool
    {
        // Admin can view all
        if ($user->is_admin === true || $user->is_admin == 1) {
            return true;
        }

        // Supervisor can view their department's requisitions
        if (($user->is_supervisor === true || $user->is_supervisor == 1) &&
            $user->department_id === $requisition->department_id
        ) {
            return true;
        }

        // Users can view their own requisitions
        return $user->id === $requisition->requested_by;
    }

    /**
     * Validate the user's approval code.
     */
    public function validateApprovalCode(User $user, string $code): bool
    {
        \Illuminate\Support\Facades\Log::info('approval_code', [$user->approval_code, $code]);
        return $user->approval_code !== null && $user->approval_code === $code;
        
    }

    /**
     * Check if user is admin
     */
    public function isAdmin(User $user): bool
    {
        return ($user->is_admin === true || $user->is_admin == 1);
    }

    /**
     * Check if user is supervisor
     */
    public function isSupervisor(User $user): bool
    {
        return ($user->is_supervisor === true || $user->is_supervisor == 1);
    }

    /**
     * Get the user's role
     */
    public function getUserRole(User $user): string
    {
        if ($user->is_admin === true || $user->is_admin == 1) {
            return 'admin';
        }
        if ($user->is_supervisor === true || $user->is_supervisor == 1) {
            return 'supervisor';
        }
        return 'staff';
    }
}
