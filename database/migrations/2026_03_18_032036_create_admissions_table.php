<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('admissions', function (Blueprint $table) {
            $table->id();
            $table->uuid('admission_uuid')->unique();
            $table->string('admission_id')->unique();       // custom admission ID
            $table->unsignedBigInteger('patient_id');      // FK to patients
            $table->unsignedBigInteger('doctor_id');       // FK to doctors
            $table->time('admission_time')->nullable();
            $table->date('admission_date');
            $table->date('discharge_date')->nullable();
            $table->string('package_name')->nullable();
            $table->string('insurance')->nullable();
            $table->string('policy_no')->nullable();
            $table->enum('status', ['Active', 'Deactive'])->default('Active');
            $table->timestamps();

            // Foreign key constraints (optional)
            $table->foreign('patient_id')->references('id')->on('patients')->onDelete('cascade');
            $table->foreign('doctor_id')->references('id')->on('users')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('admissions');
    }
};
