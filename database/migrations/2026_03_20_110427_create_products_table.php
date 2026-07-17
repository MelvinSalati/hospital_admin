<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->uuid('product_uuid')->nullable();
            $table->text('description')->nullable();
            $table->string('product_name')->nullable();
            $table->string('product_code')->nullable();
            $table->integer('category_id')->nullable();
            $table->string('strength')->nullable();
            $table->string('unit')->nullable();
            $table->enum('form',['tablet','capsule','cream','powder','suspension','injection','inhaler','ointments','pessaries','supository','enema','other'])->nullable();
            $table->string('quantity')->nullable();
            $table->date('expiry_date')->nullable();
            $table->enum('transaction_type',['issuing','receiving']);
            $table->integer('from_deparment_id')->nullable();
            $table->integer('to_department_id')->nullable();
            $table->integer('supplier_id')->nullable();
            $table->integer('created_by')->nullable();
            $table->timestamps();
        });
     
        }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
