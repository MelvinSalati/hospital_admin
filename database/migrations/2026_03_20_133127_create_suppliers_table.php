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
        // Schema::create('suppliers_1', function (Blueprint $table) {
        //     $table->id(); // Creates an auto-incrementing primary key column 'id'
        //     $table->string('name'); // Adds a string column 'name'
        //     $table->string('email')->unique(); // Adds a unique string column 'email'
        //     $table->string('phone')->nullable(); // Adds a nullable string column 'phone'
        //     $table->text('address')->nullable(); // Adds a nullable text column 'address'
        //     $table->timestamps(); // Adds 'created_at' and 'updated_at' columns
        // });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('suppliers');
    }
};
