<?php

namespace App\Models\Laboratories;

use Illuminate\Database\Eloquent\Model;

class Laboratory extends Model
{
    protected $table = 'laboratories';

    protected $fillable = [
        'lab_uuid',
        'symbol',
        'description',
        'unit',
        'name',
        'has_multiple_results',
        'results_id',
    ];
}
