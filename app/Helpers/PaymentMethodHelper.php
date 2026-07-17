<?php

namespace App\Helpers;

use App\Helpers\VisitTokenHelper;

class PaymentMethodHelper
{
    public $tokenHelper;
    public $patientId;
    public $paymentMethod;
    public $servicePricingHelper;

    /**
     * Create a new class instance.
     */
    public function __construct($patientId)
    {
        $this->tokenHelper = new VisitTokenHelper();
        $this->patientId = $patientId;
        $this->paymentMethod = $this->getPaymentMethod();
        $this->servicePricingHelper = new ServicePricingHelper($this->paymentMethod);
    }

    /**
     * Get patient's active token
     */
    private function getPatientActiveToken($patientId)
    {
        $patient = $this->tokenHelper->getActiveToken($patientId);
        return $patient ? $patient->visit_token : null;
    }

    /**
     * Get payment method for the patient
     */
    public function getPaymentMethod()
    {
        try {
            $payment = VisitTokenHelper::getActiveTokenArray($this->patientId);

            if ($payment && isset($payment['payment_method'])) {
                return $payment['payment_method'];
            }

            return 'cash'; // Default to cash
        } catch (\Exception $e) {
            return 'cash';
        }
    }

    /**
     * Get the price column name based on payment method
     */
    public function getPriceColumn()
    {
        // return $this->servicePricingHelper->getPriceColumn();
    }

    /**
     * Get services by department with correct pricing
     */
    public function getDepartmentServices($departmentId)
    {
        return $this->servicePricingHelper->getServicesByDepartment($departmentId);
    }

    /**
     * Get all drugs with correct pricing
     */
    public function getDrugs($patientId)
    {
        return $this->servicePricingHelper->getDrugs($patientId);
    }

    /**
     * Get laboratory services with correct pricing
     */
    public function getLaboratoryServices()
    {
        return $this->servicePricingHelper->getLaboratoryServices();
    }

    /**
     * Get imaging services with correct pricing
     */
    public function getImagingServices()
    {
        return $this->servicePricingHelper->getImagingServices();
    }

    /**
     * Get procedures with correct pricing
     */
    public function getProcedures()
    {
        return $this->servicePricingHelper->getProcedures();
    }

    /**
     * Get price for a specific service
     */
    public function getServicePrice($serviceId)
    {
        return $this->servicePricingHelper->getServicePrice($serviceId);
    }

    /**
     * Get service with price included
     */
    public function getServiceWithPrice($serviceId)
    {
        return $this->servicePricingHelper->getServiceWithPrice($serviceId);
    }

    /**
     * Get multiple services with their prices
     */
    public function getServicesWithPrices(array $serviceIds)
    {
        return $this->servicePricingHelper->getServicesWithPrices($serviceIds);
    }

    /**
     * Calculate total for selected services
     */
    public function calculateTotal(array $serviceIds)
    {
        return $this->servicePricingHelper->calculateTotal($serviceIds);
    }

    /**
     * Calculate total with quantities
     */
    public function calculateTotalWithQuantities(array $items)
    {
        return $this->servicePricingHelper->calculateTotalWithQuantities($items);
    }

    /**
     * Get current payment method details
     */
    public function getPaymentMethodDetails()
    {
        return [
            'method' => $this->paymentMethod,
            'price_column' => $this->getPriceColumn(),
            'label' => $this->getPaymentMethodLabel()
        ];
    }

    /**
     * Get human-readable payment method label
     */
    public function getPaymentMethodLabel()
    {
        return match ($this->paymentMethod) {
            'nhima' => 'NHIMA',
            'insurance' => 'Insurance',
            'charity' => 'Charity',
            'cash' => 'Cash',
            default => 'Cash'
        };
    }

    /**
     * Check if payment method is NHIMA
     */
    public function isNhima()
    {
        return $this->paymentMethod === 'nhima';
    }

    /**
     * Check if payment method is Insurance
     */
    public function isInsurance()
    {
        return $this->paymentMethod === 'insurance';
    }

    /**
     * Check if payment method is Charity
     */
    public function isCharity()
    {
        return $this->paymentMethod === 'charity';
    }

    /**
     * Check if payment method is Cash
     */
    public function isCash()
    {
        return $this->paymentMethod === 'cash';
    }

    /**
     * Get original payment method (useful for NHIMA where it might differ)
     */
    public function getOriginalPaymentMethod()
    {
        try {
            $token = VisitTokenHelper::getActiveToken($this->patientId);

            if ($token && isset($token->original_payment_method)) {
                return $token->original_payment_method;
            }

            return null;
        } catch (\Exception $e) {
            return null;
        }
    }

    /**
     * Check if service has valid price for current payment method
     */
    public function hasValidPrice($serviceId)
    {
        return $this->servicePricingHelper->hasValidPrice($serviceId);
    }

    /**
     * Get price comparison for a service
     */
    public function getPriceComparison($serviceId)
    {
        return ServicePricingHelper::getPriceComparison($serviceId);
    }
}
