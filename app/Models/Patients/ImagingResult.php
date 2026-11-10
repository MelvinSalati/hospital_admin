<?php

namespace App\Models\Patients;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ImagingResult extends Model
{
    use SoftDeletes;

    protected $table = 'imaging_results';

    protected $fillable = [
        'imaging_order_id',
        'imaging_order_item_id',
        'visit_token',
        'patient_id',
        'modality',
        'body_part',
        'findings',
        'impression',
        'recommendations',
        'report_content',
        'report_file_path',
        'status',
        'reported_by',
        'reported_date',
        'verified_by',
        'verified_date',
    ];

    protected $casts = [
        'reported_date' => 'datetime',
        'verified_date' => 'datetime',
    ];

    public function order()
    {
        return $this->belongsTo(ImagingOrder::class, 'imaging_order_id');
    }

    public function item()
    {
        return $this->belongsTo(ImagingOrderItem::class, 'imaging_order_item_id');
    }
}
