<?php

namespace App\Policies;

use App\Models\User;
use App\Models\StockMovement;
use Illuminate\Auth\Access\HandlesAuthorization;

class StockAdjustmentPolicy
{
    use HandlesAuthorization;

    /**
     * Create a new policy instance.
     */
    public function __construct()
    {
        //
    }

    /**
     * Determine if the user can request an adjustment.
     */
    public function request(User $user): bool
    {
        // Any authenticated user can request an adjustment
        return true;
    }

    /**
     * Determine if the user can update an adjustment.
     * ✅ ONLY SUPERVISORS CAN UPDATE
     */
    public function update(User $user, StockMovement $adjustment): bool
    {
        // Only supervisors can update adjustments
        return $user->is_supervisor === true;
    }

    /**
     * Determine if the user can approve an adjustment.
     */
    public function approve(User $user, StockMovement $adjustment): bool
    {
        // Supervisors and admins can approve
        return $user->is_supervisor === true || $user->hasRole('admin');
    }

    /**
     * Determine if the user can reject an adjustment.
     */
    public function reject(User $user, StockMovement $adjustment): bool
    {
        // Supervisors and admins can reject
        return $user->is_supervisor === true || $user->hasRole('admin');
    }

    /**
     * Determine if the user can delete an adjustment.
     */
    public function delete(User $user, StockMovement $adjustment): bool
    {
        // Only supervisors can delete
        return $user->is_supervisor === true;
    }

    /**
     * Determine if the user can view the adjustment.
     */
    public function view(User $user, StockMovement $adjustment): bool
    {
        // Users can view their own adjustments
        if ($user->id === $adjustment->requested_by || $user->id === $adjustment->created_by) {
            return true;
        }

        // Users can view their department's adjustments
        if ($user->department_id === $adjustment->department_id) {
            return true;
        }

        // Supervisors can view all
        if ($user->is_supervisor === true) {
            return true;
        }

        // Admins can view all
        if ($user->hasRole('admin') || $user->hasRole('super_admin')) {
            return true;
        }

        return false;
    }

    /**
     * Determine if the user can view pending approvals.
     */
    public function viewPending(User $user): bool
    {
        // Supervisors, admins, and managers can view pending approvals
        return $user->is_supervisor === true || 
               $user->hasRole('admin') || 
               $user->hasRole('super_admin') ||
               $user->hasRole('manager');
    }

    /**
     * Determine if the user can apply an adjustment.
     */
    public function apply(User $user, StockMovement $adjustment): bool
    {
        // Only supervisors and admins can apply adjustments
        return $user->is_supervisor === true || 
               $user->hasRole('admin') || 
               $user->hasRole('super_admin');
    }

    /**
     * Determine if the user can cancel an adjustment.
     */
    public function cancel(User $user, StockMovement $adjustment): bool
    {
        // The user who created it OR supervisor can cancel
        if ($user->id === $adjustment->created_by || $user->id === $adjustment->requested_by) {
            return true;
        }

        return $user->is_supervisor === true;
    }

    /**
     * Determine if the user can view history.
     */
    public function viewHistory(User $user): bool
    {
        // Supervisors and admins can view history
        return $user->is_supervisor === true || 
               $user->hasRole('admin') || 
               $user->hasRole('super_admin');
    }

    /**
     * Determine if the user can bulk delete.
     */
    public function bulkDelete(User $user): bool
    {
        // Only supervisors can bulk delete
        return $user->is_supervisor === true;
    }

    /**
     * Determine if the user can export adjustments.
     */
    public function export(User $user): bool
    {
        // Supervisors and admins can export
        return $user->is_supervisor === true || 
               $user->hasRole('admin') || 
               $user->hasRole('super_admin');
    }

    /**
     * Determine if the user can print adjustment.
     */
    public function print(User $user, StockMovement $adjustment): bool
    {
        // Any authenticated user can print their own adjustments
        if ($user->id === $adjustment->created_by || $user->id === $adjustment->requested_by) {
            return true;
        }

        return $user->is_supervisor === true;
    }
}