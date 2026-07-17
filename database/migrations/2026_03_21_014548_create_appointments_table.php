<?php 

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
/**
* Run the migrations.
*/
public function up(): void {
Schema::create('appointments', function (Blueprint $table) {
$table->id();

// UUID for external/reference usage
$table->uuid('appointment_uuid')->unique();

// Relationships
$table->bigInteger('patient_id');
$table->bigInteger('doctor_id')->nullable();
$table->bigInteger('created_by')->nullable();

// Appointment details
$table->date('appointment_date');
$table->time('appointment_time');
$table->dateTime('scheduled_at')->nullable();

// Status tracking
$table->enum('status', [
'pending',
'confirmed',
'checked_in',
'in_progress',
'completed',
'cancelled',
'no_show'
])->default('pending');

// Priority (useful in triage systems)
$table->enum('priority', ['low', 'normal', 'high', 'emergency'])
->default('normal');

// Visit / queue linkage
$table->string('visit_token')->nullable()->unique();

// Clinical / admin notes
$table->text('reason')->nullable();
$table->text('notes')->nullable();

// Optional metadata
$table->string('department')->nullable();
$table->bigInteger('assigned_to')->nullable();
$table->string('room')->nullable();

// Audit
$table->timestamps();
$table->softDeletes();
});
}

/**
* Reverse the migrations.
*/
public function down(): void {
Schema::dropIfExists('appointments');
}
};