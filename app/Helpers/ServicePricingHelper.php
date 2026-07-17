<?php

namespace App\Helpers;

use App\Models\Services\Service;
use Illuminate\Support\Collection;

class ServicePricingHelper
{
    /**
     * Get services by category using patient's cached payment method
     *
     * @param int $patientId
     * @param string $category
     * @return Collection
     */
    public static function getServices(int $patientId, string $category): Collection
    {
        // Get cached payment method from VisitTokenHelper
        $token = VisitTokenHelper::getActiveTokenArray($patientId);
        $paymentMethod = $token['payment_method'] ?? 'cash';

        // Map payment method to database column
        $priceColumn = match ($paymentMethod) {
            'nhima' => 'nhima_price',
            'insurance' => 'insurance_price',
            'charity' => 'charity_price',
            'cash' => 'cash_price',
            default => 'cash_price'
        };

        // Fetch services with the correct price column
        return Service::where('is_active', 1)
            ->where('service_category', $category)
            ->select('id', 'service_name', 'service_category', $priceColumn . ' as price')
            ->orderBy('service_name')
            ->get()
            ->map(function ($service) {
                $service->price = (float) $service->price;
                return $service;
            });
    }

    /**
     * Get drugs
     */
    public static function getDrugs(int $patientId): Collection
    {
        return self::getServices($patientId, 'drugs');
    }

    /**
     * Get laboratory services
     */
    public static function getLaboratory(int $patientId): Collection
    {
        return self::getServices($patientId, 'Laboratory');
    }

    public static function getMCH(int $patientId): Collection
    {
        return self::getServices($patientId, 'Others');
    }
    /**
     * Get imaging services
     */
    public static function getImaging(int $patientId): Collection
    {
        return self::getServices($patientId, 'Imaging');
    }

    /**
     * Get procedures
     */
    public static function getProcedures(int $patientId): Collection
    {
        return self::getServices($patientId, 'Procedures');
    }
    public static function getDental(int $patientId): Collection
    {
        return self::getServices($patientId, 'Procedures');
    } 

     public static function getTheater(int $patientId): Collection
    {
        return self::getServices($patientId, 'Procedures');
    }

    public static function getOpthamology(int $patientId): Collection
    {
        return self::getServices($patientId, 'Procedures');
    }
    
}
