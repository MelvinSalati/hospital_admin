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
        Schema::create('patient_visits', function (Blueprint $table) {
            $table->id();
            $table->uuid('visit_uuid')->unique();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->enum('visit_type', ['new','revisit']);
            $table->unsignedBigInteger('department_id')->nullable();
            $table->string('token')->nullable()->unique();
            $table->string('to_queue')->nullable();
            $table->enum('priority', ['routine', 'urgent', 'emergency'])->default('routine');
            $table->integer('status')->default(1);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('patient_visits');
    }
};
