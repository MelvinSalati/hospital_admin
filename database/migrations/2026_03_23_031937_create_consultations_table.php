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
        Schema::create('consultations', function (Blueprint $table) {
            $table->id();
            $table->uuid('consultation_uuid')->nullable();
            $table->integer('patient_id')->nullable();
            $table->integer('doctors_id')->nullable();
            $table->json('chief_complaints')->nullable();
            $table->json('clinical_analysis')->nullable();
            $table->json('drug_history')->nullable();
            $table->json('health_education')->nullable();
            $table->json('imaging_orders')->nullable();
            $table->json('lab_orders')->nullable();
            $table->json('medical_conditions')->nullable();
            $table->json('physical_exam')->nullable();
            $table->json('prescription')->nullable();
            $table->string('status');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('consultations');
    }
};
