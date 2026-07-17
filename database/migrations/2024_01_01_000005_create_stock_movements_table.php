<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_movements', function (Blueprint $table) {
            $table->id();
            $table->uuid('movement_uuid')->unique();

            $table->foreignId('product_id')->constrained();
            $table->foreignId('bulk_store_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('from_department_id')->nullable()->constrained('departments')->nullOnDelete();
            $table->foreignId('to_department_id')->nullable()->constrained('departments')->nullOnDelete();
            $table->foreignId('supplier_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();

            $table->enum('type', [
                'receiving',    // Inbound from supplier
                'issuing',      // Outbound to department
                'transfer',     // Store-to-store
                'adjustment',   // Manual correction (shrinkage, damage, audit)
                'return',       // Returned from department back to store
            ]);

            $table->integer('quantity');                     // Always positive; direction = type
            $table->string('reference_number')->nullable();  // PO number, GRN number, etc.
            $table->string('batch_number')->nullable();
            $table->date('expiry_date')->nullable();
            $table->decimal('unit_cost', 12, 2)->nullable();

            $table->text('remarks')->nullable();
            $table->timestamp('moved_at')->useCurrent();    // Actual movement time (can differ from created_at)

            $table->timestamps();

            $table->index(['product_id', 'bulk_store_id']);
            $table->index('type');
            $table->index('moved_at');
            $table->index('reference_number');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_movements');
    }
};
