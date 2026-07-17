<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('telecoms', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_id')->constrained('patients')->onDelete('cascade');
            $table->enum('system', ['phone', 'email', 'fax', 'pager', 'url', 'sms', 'other']);
            $table->string('value');
            $table->enum('use', ['home', 'work', 'temp', 'old', 'mobile'])->default('mobile');
            $table->integer('rank')->default(1);
            $table->date('period_start')->nullable();
            $table->date('period_end')->nullable();
            $table->timestamps();

            $table->index(['patient_id', 'system', 'use']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('patient_telecom');
    }
};
