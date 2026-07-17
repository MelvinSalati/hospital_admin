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
        Schema::create('laboratories', function (Blueprint $table) {
            $table->id();
            $table->uuid('lab_uuid')->nullable();
            $table->string('symbol')->nullable();
            $table->text('description')->nullable();
            $table->string('unit')->nullable();
            $table->string('name')->nullable();
            $table->boolean('has_multiple_results')->default(false);
            $table->integer('results_id')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('laboratories');
    }
};
