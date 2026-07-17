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
        Schema::create('payment_methods', function (Blueprint $table) {
            $table->id();

            // Public identifier (useful for APIs / integrations)
            $table->uuid('payment_method_uuid')->unique();

            // Core details
            $table->string('name'); // e.g. Cash, Mobile Money, Card
            $table->string('code')->unique(); // e.g. CASH, MTN_MOMO, VISA

            // Classification
            $table->enum('type', [
                'cash',
                'mobile_money',
                'card',
                'bank_transfer',
                'insurance',
                'other'
            ]);

            // Provider details (useful for mobile money / card processors)
            $table->string('provider')->nullable(); // e.g. MTN, Airtel, Visa
            $table->string('account_number')->nullable();
            $table->string('account_name')->nullable();

            // Configuration
            $table->boolean('is_active')->default(true);
            $table->boolean('requires_reference')->default(false); // e.g. transaction ID

            // Fees (optional but important for real systems)
            $table->decimal('charge_percentage', 5, 2)->nullable();
            $table->decimal('charge_fixed', 10, 2)->nullable();

            // UI / ordering
            $table->integer('sort_order')->default(0);

            // Audit
            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index('type');
            $table->index('is_active');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payment_methods');
    }
};
