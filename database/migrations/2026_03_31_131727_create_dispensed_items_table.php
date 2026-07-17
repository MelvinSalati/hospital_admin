<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dispensed_items', function (Blueprint $table) {
            $table->id();
            $table->string('prescription_number');
            $table->unsignedBigInteger('drug_id');
            $table->string('drug_name');
            $table->string('dosage')->nullable();
            $table->string('frequency')->nullable();
            $table->string('route')->nullable();
            $table->integer('quantity_dispensed');
            $table->integer('quantity_prescribed');
            $table->integer('quantity_remaining')->default(0);
            $table->string('status')->default('dispensed'); // dispensed, partially_dispensed, not_dispensed
            $table->text('notes')->nullable();
            $table->text('reason_not_dispensed')->nullable(); // out_of_stock, not_available, etc.
            $table->unsignedBigInteger('dispensed_by')->nullable();
            $table->timestamp('dispensed_at');
            $table->timestamps();

            $table->index('prescription_number');
            $table->index('drug_id');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dispensed_items');
    }
};
