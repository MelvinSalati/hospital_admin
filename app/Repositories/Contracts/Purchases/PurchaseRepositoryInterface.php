<?php

namespace App\Repositories\Contracts\Purchases;

interface PurchaseRepositoryInterface
{
    public function createPurchaseRequisition(array $requisitionDetails);
    public function getRequisitionById(int $id);
    public function getRequisitionByNumber(string $prNumber);
    public function getRequisitions();
    public function updateRequisitionStatus(int $id, string $status);
    public function approveRequisition(int $id, int $approvedBy);
    public function rejectRequisition(int $id, string $reason = null);
    public function cancelRequisition(int $id, string $reason = null);
    public function convertToPurchaseOrder(int $id, array $purchaseOrderDetails);
    public function updateRequisitionItems(int $requisitionId, array $items);
    public function deleteRequisition(int $id);
    public function getRequisitionStats();
    public function getRequisitionsByDateRange(string $from, string $to);
}