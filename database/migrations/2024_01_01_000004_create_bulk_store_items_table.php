<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bulk_store_items', function (Blueprint $table) {
            $table->id();
            $table->uuid('item_uuid')->unique();

            $table->foreignId('bulk_store_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();

            $table->integer('quantity')->default(0);
            $table->integer('reorder_level')->default(0)->comment('Alert threshold');
            $table->date('expiry_date')->nullable();
            $table->string('batch_number')->nullable();
            $table->decimal('unit_cost', 12, 2)->nullable()->comment('Cost at time of receipt');

            $table->timestamps();
            $table->softDeletes();

            // A product+batch combination is unique per store
            $table->unique(['bulk_store_id', 'product_id', 'batch_number'], 'unique_store_product_batch');

            $table->index(['bulk_store_id', 'product_id']);
            $table->index('expiry_date');
            $table->index('batch_number');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bulk_store_items');
    }
};
