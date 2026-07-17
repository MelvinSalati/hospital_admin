<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateUserProfileTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('user_profiles', function (Blueprint $table) {
            $table->id();
            $table->uuid('user_uuid')->nullable();
            $table->string('first_name')->nullable();
            $table->string('surname')->nullable();
            $table->date('date_of_birth')->nullable();
            $table->string('gender')->nullable();
            $table->text('address')->nullable();
            $table->string('mobile_phone_number')->nullable();
            $table->json('certificates')->nullable()->comment('Json array of certificates');
            $table->json('degrees')->nullable()->comment('Json array of degrees');
            $table->json('diplomas')->nullable()->comment('Json array of diplomas');
            $table->string('email')->unique()->nullable();
            $table->foreignId('profession_id')->nullable()->constrained('professions');
            $table->json('roles')->nullable()->comment('Json array of roles');
            $table->date('license_expiry_date')->nullable();
            $table->string('license_number')->nullable();
            $table->text('license_document')->nullable(); // Assuming this is a text field for simplicity
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('user_profile');
    }
}
