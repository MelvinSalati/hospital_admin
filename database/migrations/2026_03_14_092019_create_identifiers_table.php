<?php
// database/migrations/xxxx_xx_xx_xxxxxx_create_patient_identifiers_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('identifiers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_id');
            $table->enum('use', ['usual', 'official', 'temp', 'secondary', 'old'])->default('official');
            $table->string('type_code', 50); // e.g., NN, PPN, DL
            $table->string('type_system')->nullable(); // e.g., http://terminology.hl7.org/CodeSystem/v2-0203
            $table->string('type_display')->nullable(); // e.g., National Number
            $table->string('system')->nullable(); // e.g., urn:identity:national-id
            $table->string('value');
            $table->date('period_start')->nullable();
            $table->date('period_end')->nullable();
            $table->string('assigner_display')->nullable(); // Issuing authority
            $table->timestamps();

            $table->unique(['type_code', 'value']); // Prevent duplicates
            $table->index(['patient_id', 'type_code']);
            $table->index('value');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('identifiers');
    }
};
