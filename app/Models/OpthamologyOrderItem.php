<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Appointment;

class OpthamologyOrderItem extends Model
{
    public function appointment()
    {
        $this->hasMany(Appointment::class, 'department_id');
    }
}
