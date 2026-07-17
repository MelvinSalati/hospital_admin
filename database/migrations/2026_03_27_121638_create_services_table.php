// database/migrations/2024_01_01_000002_create_services_table.php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('services', function (Blueprint $table) {
            $table->id();
            $table->integer('service_uuid')->nullable();
            $table->integer('provider_id')->nullable();
            $table->string('service_name');
            $table->foreignId('department_id')->nullable()->constrained('departments')->onDelete('cascade');
            $table->decimal('cash_price', 10, 2)->nullable();
            $table->decimal('nhima_price', 10, 2)->nullable();
            $table->decimal('insurance_price', 10, 2)->nullable();
            $table->decimal('charity_price', 10, 2)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('services');
    }
};
