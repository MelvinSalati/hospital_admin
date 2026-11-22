<?php

namespace App\Models\Services;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Service extends Model
{
    protected $table = 'services';

    protected $fillable = [
        'scheme_type',
        'user_id',
        'service_uuid',
        'product_uuid',
        'department_id',
        'service_name',
        'service_category',
        'has_unit',
        'unit',
        'service_code',
        'description',
        'price',
        'is_active',
    ];

    /**
     * Boot model events.
     *
     * Automatically generates a UUID for every new service.
     */
    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (Service $service) {
            if (empty($service->service_uuid)) {
                $service->service_uuid = (string) Str::uuid();
            }
        });
    }

    /**
     * Scope services by department.
     *
     * @param Builder $query
     * @param int $departmentId
     * @return Builder
     */
    public function scopeDepartment(Builder $query, int $departmentId): Builder
    {
        return $query->where('department_id', $departmentId);
    }

    /**
     * Scope to retrieve active services only.
     *
     * @param Builder $query
     * @return Builder
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope services by category.
     *
     * @param Builder $query
     * @param string $category
     * @return Builder
     */
    public function scopeCategory(Builder $query, string $category): Builder
    {
        return $query->where('service_category', $category);
    }

    /**
     * Scope services by scheme type.
     *
     * @param Builder $query
     * @param int $schemeType
     * @return Builder
     */
    public function scopeSchemeType(Builder $query, int $schemeType): Builder
    {
        return $query->where('scheme_type', $schemeType);
    }

    /**
     * Scope services that have not been soft deleted.
     *
     * Note: Laravel's SoftDeletes trait handles this automatically
     * if the model uses that trait.
     *
     * @param Builder $query
     * @return Builder
     */
    public function scopeAvailable(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }
}
