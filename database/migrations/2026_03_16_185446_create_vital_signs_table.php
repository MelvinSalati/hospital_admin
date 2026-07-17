<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('vital_signs', function (Blueprint $table) {
            $table->id();
            $table->uuid('vital_sign_uuid');
            $table->enum('vitals_type',['opd','admission'])->nullable();
            $table->integer('recorded_by')->nullable();
            $table->integer('systolic_bp')->nullable(); // Systolic Blood Pressure (mmHg)
            $table->integer('diastolic_bp')->nullable(); // Diastolic Blood Pressure (mmHg)
            $table->integer('pulse_rate')->nullable(); // Pulse Rate (beats per minute)
            $table->integer('respiratory_rate')->nullable(); // Respirations (breaths per minute)
            $table->decimal('spO2', 5, 2)->nullable(); // Oxygen Saturation (%)

            // Body Measurements
            $table->decimal('height', 5, 2)->nullable(); // Height (cm)
            $table->decimal('weight', 5, 2)->nullable(); // Weight (kg)
            $table->decimal('bmi', 5, 2)->nullable(); // BMI (calculated)

            // Temperature
            $table->decimal('temperature', 4, 2)->nullable(); // Temperature (°C)

            // Additional Vitals
            $table->integer('blood_glucose')->nullable(); // Blood Glucose (mg/dL)
            $table->integer('pain_level')->nullable(); // Pain Scale (0-10)

            // Body Measurements - Additional
            $table->decimal('head_circumference', 5, 2)->nullable(); // Head Circumference (cm) - for pediatrics
            $table->decimal('chest_circumference', 5, 2)->nullable(); // Chest Circumference (cm)
            $table->decimal('abdominal_circumference', 5, 2)->nullable(); // Abdominal Circumference (cm)
            $table->decimal('hip_circumference', 5, 2)->nullable(); // Hip Circumference (cm)
            $table->decimal('waist_circumference', 5, 2)->nullable(); // Waist Circumference (cm)
            $table->decimal('bmi_percentile', 5, 2)->nullable(); // BMI Percentile (for pediatrics)
            $table->integer('growth_percentile')->nullable(); // Growth Percentile

            // Metadata
            $table->text('notes')->nullable();
            $table->enum('position', ['sitting', 'standing', 'lying', 'unknown'])->default('sitting');
            $table->enum('cuff_size', ['small', 'medium', 'large', 'extra_large'])->nullable();
            $table->enum('arm_used', ['left', 'right'])->nullable();
            $table->timestamp('recorded_at')->useCurrent();

            $table->timestamps();
            $table->softDeletes(); // For audit purposes

            // Indexes for better query performance

        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('vital_signs');
    }
};
