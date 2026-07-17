<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('purchase_orders', function (Blueprint $table) {
            $table->id();
            $table->uuid('po_uuid')->unique();
            $table->string('po_number')->unique()->comment('Human-readable PO ref e.g. PO-2024-00001');

            $table->foreignId('supplier_id')->constrained();
            $table->foreignId('bulk_store_id')->constrained();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();

            $table->date('order_date');
            $table->date('expected_delivery_date')->nullable();
            $table->date('received_date')->nullable();

            $table->decimal('total_amount', 12, 2)->default(0);

            $table->enum('status', ['draft', 'pending', 'approved', 'partially_received', 'received', 'cancelled'])
                  ->default('draft');

            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('status');
            $table->index('order_date');
        });

        Schema::create('purchase_order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('purchase_order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained();

            $table->integer('ordered_quantity');
            $table->integer('received_quantity')->default(0);
            $table->decimal('unit_price', 12, 2);
            $table->decimal('total_price', 12, 2)->storedAs('ordered_quantity * unit_price');

            $table->string('batch_number')->nullable();
            $table->date('expiry_date')->nullable();

            $table->timestamps();

            $table->index(['purchase_order_id', 'product_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('purchase_order_items');
        Schema::dropIfExists('purchase_orders');
    }
};
