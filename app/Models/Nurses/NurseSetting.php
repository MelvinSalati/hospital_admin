<?php

namespace App\Models\Nurses;

use Illuminate\Database\Eloquent\Model;

class NurseSetting extends Model
{
    protected $fillable = [
        'nurse_id',
        'setting_name',
        'setting_value'
    ];

    protected $table = 'nurse_settings';
}
