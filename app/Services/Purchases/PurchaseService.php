<?php

namespace App\Services\Purchases;

use App\Repositories\Purchases\PurchaseRepository as PurchaseRequisitionRepository;

class PurchaseService
{
    protected $purchaseRequisitionRepository;
   
    public function __construct(PurchaseRequisitionRepository $purchaseRequisition)
    {
        $this->purchaseRequisitionRepository = $purchaseRequisition;
    } 

    public function createPurchaseRequisition($requisitionDetails)
    {
        return $this->purchaseRequisitionRepository->createPurchaseRequisition($requisitionDetails);
    }

    /**
     * Get requisitions with filters
     */
    public function getRequisitions()
    {
        return $this->purchaseRequisitionRepository->getRequisitions();
    }

    /**
     * Get a single requisition by ID
     */
    public function getRequisitionById(int $id)
    {
        return $this->purchaseRequisitionRepository->getRequisitionById($id);
    }

    /**
     * Get requisition by PR number
     */
    public function getRequisitionByNumber(string $prNumber)
    {
        return $this->purchaseRequisitionRepository->getRequisitionByNumber($prNumber);
    }

    /**
     * Update requisition
     */
    public function updateRequisition(int $id, array $data)
    {
        return $this->purchaseRequisitionRepository->updateRequisition($id, $data);
    }

    /**
     * Update requisition status
     */
    public function updateRequisitionStatus(int $id, string $status)
    {
        return $this->purchaseRequisitionRepository->updateRequisitionStatus($id, $status);
    }

    /**
     * Approve requisition
     */
    public function approveRequisition(int $id, int $approvedBy)
    {
        return $this->purchaseRequisitionRepository->approveRequisition($id, $approvedBy);
    }

    /**
     * Reject requisition
     */
    public function rejectRequisition(int $id, ?string $reason = null)
    {
        return $this->purchaseRequisitionRepository->rejectRequisition($id, $reason);
    }

    /**
     * Cancel requisition
     */
    public function cancelRequisition(int $id, ?string $reason = null)
    {
        return $this->purchaseRequisitionRepository->cancelRequisition($id, $reason);
    }

    /**
     * Delete requisition (soft delete)
     */
    public function deleteRequisition(int $id)
    {
        return $this->purchaseRequisitionRepository->deleteRequisition($id);
    }

    /**
     * Update requisition items
     */
    public function updateRequisitionItems(int $requisitionId, array $items)
    {
        return $this->purchaseRequisitionRepository->updateRequisitionItems($requisitionId, $items);
    }

    /**
     * Get requisition statistics
     */
    public function getRequisitionStats()
    {
        return $this->purchaseRequisitionRepository->getRequisitionStats();
    }

    /**
     * Get requisitions by date range
     */
    public function getRequisitionsByDateRange(string $from, string $to)
    {
        return $this->purchaseRequisitionRepository->getRequisitionsByDateRange($from, $to);
    }

    /**
     * Convert requisition to purchase order
     */
    public function convertToPurchaseOrder(int $id, array $purchaseOrderDetails)
    {
        return $this->purchaseRequisitionRepository->convertToPurchaseOrder($id, $purchaseOrderDetails);
    }
}