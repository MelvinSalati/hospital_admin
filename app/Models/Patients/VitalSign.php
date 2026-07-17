<?php

namespace App\Models\Patients;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\Patients\Patient;
use App\Models\Visit;
use App\Models\User;

class VitalSign extends Model
{
    use SoftDeletes;

    /**
     * The table associated with the model.
     */
    protected $table = 'vital_signs';

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'visit_token',
        'admission_number',
        'patient_id',
        'visit_id',
        'recorded_by',
        'systolic_bp',
        'diastolic_bp',
        'pulse_rate',
        'respiratory_rate',
        'spO2',
        'height',
        'weight',
        'bmi',
        'temperature',
        'blood_glucose',
        'pain_level',
        'head_circumference',
        'chest_circumference',
        'abdominal_circumference',
        'hip_circumference',
        'waist_circumference',
        'bmi_percentile',
        'growth_percentile',
        'notes',
        'position',
        'cuff_size',
        'arm_used',
        'recorded_at'
    ];

    /**
     * The attributes that should be cast.
     */
    protected $casts = [
        'systolic_bp' => 'integer',
        'diastolic_bp' => 'integer',
        'pulse_rate' => 'integer',
        'respiratory_rate' => 'integer',
        'spO2' => 'decimal:2',
        'height' => 'decimal:2',
        'weight' => 'decimal:2',
        'bmi' => 'decimal:2',
        'temperature' => 'decimal:2',
        'blood_glucose' => 'integer',
        'pain_level' => 'integer',
        'head_circumference' => 'decimal:2',
        'chest_circumference' => 'decimal:2',
        'abdominal_circumference' => 'decimal:2',
        'hip_circumference' => 'decimal:2',
        'waist_circumference' => 'decimal:2',
        'bmi_percentile' => 'decimal:2',
        'growth_percentile' => 'integer',
        'recorded_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime'
    ];

    /**
     * The attributes that should be mutated to dates.
     */
    protected $dates = [
        'recorded_at',
        'created_at',
        'updated_at',
        'deleted_at'
    ];

    /**
     * Default values for attributes
     */
    protected $attributes = [
        'position' => 'sitting',
        'recorded_at' => null // Will be set to current time in boot if null
    ];

    /**
     * Boot the model.
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($vitalSign) {
            // Auto-calculate BMI if height and weight are provided
            if ($vitalSign->height && $vitalSign->weight) {
                $vitalSign->bmi = $vitalSign->calculateBMI();
            }

            // Set recorded_at if not provided
            if (!$vitalSign->recorded_at) {
                $vitalSign->recorded_at = now();
            }
        });

        static::updating(function ($vitalSign) {
            // Recalculate BMI if height or weight changed
            if ($vitalSign->isDirty('height') || $vitalSign->isDirty('weight')) {
                if ($vitalSign->height && $vitalSign->weight) {
                    $vitalSign->bmi = $vitalSign->calculateBMI();
                }
            }
        });
    }

    /**
     * Relationships
     */
    public function patient()
    {
        return $this->belongsTo(Patient::class, 'patient_id');
    }

    public function visit()
    {
        return $this->belongsTo(\App\Models\Visit::class, 'visit_id');
    }

    public function recorder()
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }

    /**
     * Accessors
     */
    public function getBpReadingAttribute(): string
    {
        if ($this->systolic_bp && $this->diastolic_bp) {
            return "{$this->systolic_bp}/{$this->diastolic_bp} mmHg";
        }
        return 'N/A';
    }

    public function getBpStatusAttribute(): string
    {
        if (!$this->systolic_bp || !$this->diastolic_bp) {
            return 'Unknown';
        }

        $systolic = $this->systolic_bp;
        $diastolic = $this->diastolic_bp;

        if ($systolic < 120 && $diastolic < 80) {
            return 'Normal';
        } elseif ($systolic >= 120 && $systolic <= 129 && $diastolic < 80) {
            return 'Elevated';
        } elseif (($systolic >= 130 && $systolic <= 139) || ($diastolic >= 80 && $diastolic <= 89)) {
            return 'Hypertension Stage 1';
        } elseif ($systolic >= 140 || $diastolic >= 90) {
            return 'Hypertension Stage 2';
        } elseif ($systolic > 180 || $diastolic > 120) {
            return 'Hypertensive Crisis';
        }

        return 'Unknown';
    }

    public function getBmiStatusAttribute(): string
    {
        if (!$this->bmi) {
            return 'Unknown';
        }

        $bmi = $this->bmi;

        if ($bmi < 18.5) {
            return 'Underweight';
        } elseif ($bmi >= 18.5 && $bmi < 25) {
            return 'Normal';
        } elseif ($bmi >= 25 && $bmi < 30) {
            return 'Overweight';
        } elseif ($bmi >= 30 && $bmi < 35) {
            return 'Obese Class I';
        } elseif ($bmi >= 35 && $bmi < 40) {
            return 'Obese Class II';
        } elseif ($bmi >= 40) {
            return 'Obese Class III';
        }

        return 'Unknown';
    }

    public function getPulseStatusAttribute(): string
    {
        if (!$this->pulse_rate) {
            return 'Unknown';
        }

        $pulse = $this->pulse_rate;

        if ($pulse < 60) {
            return 'Bradycardia';
        } elseif ($pulse >= 60 && $pulse <= 100) {
            return 'Normal';
        } elseif ($pulse > 100) {
            return 'Tachycardia';
        }

        return 'Unknown';
    }

    public function getSpO2StatusAttribute(): string
    {
        if (!$this->spO2) {
            return 'Unknown';
        }

        $spo2 = $this->spO2;

        if ($spo2 >= 95) {
            return 'Normal';
        } elseif ($spo2 >= 90 && $spo2 < 95) {
            return 'Mild Hypoxemia';
        } elseif ($spo2 < 90) {
            return 'Severe Hypoxemia';
        }

        return 'Unknown';
    }

    public function getTemperatureStatusAttribute(): string
    {
        if (!$this->temperature) {
            return 'Unknown';
        }

        $temp = $this->temperature;

        if ($temp < 35) {
            return 'Hypothermia';
        } elseif ($temp >= 35 && $temp < 37.5) {
            return 'Normal';
        } elseif ($temp >= 37.5 && $temp < 38.5) {
            return 'Low-grade Fever';
        } elseif ($temp >= 38.5 && $temp < 40) {
            return 'Fever';
        } elseif ($temp >= 40) {
            return 'Hyperpyrexia';
        }

        return 'Unknown';
    }

    public function getRespiratoryStatusAttribute(): string
    {
        if (!$this->respiratory_rate) {
            return 'Unknown';
        }

        $rate = $this->respiratory_rate;

        if ($rate < 12) {
            return 'Bradypnea';
        } elseif ($rate >= 12 && $rate <= 20) {
            return 'Normal';
        } elseif ($rate > 20) {
            return 'Tachypnea';
        }

        return 'Unknown';
    }

    /**
     * Calculate BMI
     */
    public function calculateBMI(): ?float
    {
        if (!$this->height || !$this->weight) {
            return null;
        }

        // BMI = weight(kg) / (height(m))^2
        $heightInMeters = $this->height / 100;

        if ($heightInMeters > 0) {
            return round($this->weight / ($heightInMeters * $heightInMeters), 2);
        }

        return null;
    }

    /**
     * Scopes
     */
    public function scopeForPatient($query, $patientId)
    {
        return $query->where('patient_id', $patientId);
    }

    public function scopeForVisit($query, $visitId)
    {
        return $query->where('visit_id', $visitId);
    }

    public function scopeLatestFirst($query)
    {
        return $query->orderBy('recorded_at', 'desc');
    }

    public function scopeWithAbnormalBp($query)
    {
        return $query->where(function ($q) {
            $q->where('systolic_bp', '>=', 130)
                ->orWhere('diastolic_bp', '>=', 80);
        });
    }

    public function scopeWithAbnormalBmi($query)
    {
        return $query->where(function ($q) {
            $q->where('bmi', '<', 18.5)
                ->orWhere('bmi', '>=', 25);
        });
    }

    public function scopeWithLowSpO2($query, $threshold = 95)
    {
        return $query->where('spO2', '<', $threshold);
    }

    public function scopeDateRange($query, $startDate, $endDate)
    {
        return $query->whereBetween('recorded_at', [$startDate, $endDate]);
    }

    /**
     * Get formatted values
     */
    public function getFormattedHeightAttribute(): string
    {
        return $this->height ? $this->height . ' cm' : 'N/A';
    }

    public function getFormattedWeightAttribute(): string
    {
        return $this->weight ? $this->weight . ' kg' : 'N/A';
    }

    public function getFormattedBmiAttribute(): string
    {
        return $this->bmi ? $this->bmi . ' kg/m²' : 'N/A';
    }

    public function getFormattedTemperatureAttribute(): string
    {
        return $this->temperature ? $this->temperature . ' °C' : 'N/A';
    }

    public function getFormattedPulseAttribute(): string
    {
        return $this->pulse_rate ? $this->pulse_rate . ' bpm' : 'N/A';
    }

    public function getFormattedRespiratoryRateAttribute(): string
    {
        return $this->respiratory_rate ? $this->respiratory_rate . ' breaths/min' : 'N/A';
    }

    public function getFormattedSpO2Attribute(): string
    {
        return $this->spO2 ? $this->spO2 . '%' : 'N/A';
    }
}
