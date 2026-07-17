<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Laboratory\TestCategory;
use App\Models\Laboratory\TestConfig;
use App\Models\Laboratory\TestParameter;

class LaboratorySettingsSeeder extends Seeder
{
    public function run()
    {
        // Create categories
        $categories = [
            ['name' => 'Hematology', 'description' => 'Blood-related tests including CBC, coagulation, etc.'],
            ['name' => 'Chemistry', 'description' => 'Biochemical tests including electrolytes, enzymes, etc.'],
            ['name' => 'Microbiology', 'description' => 'Tests for infectious agents including bacteria, viruses, etc.'],
            ['name' => 'Immunology', 'description' => 'Tests for immune system function and antibodies'],
            ['name' => 'Urinalysis', 'description' => 'Tests on urine samples'],
            ['name' => 'Molecular', 'description' => 'PCR and other molecular diagnostic tests'],
            ['name' => 'Serology', 'description' => 'Tests for antibodies and antigens in serum'],
        ];

        foreach ($categories as $category) {
            TestCategory::create($category);
        }

        // Create test configurations
        $cbc = TestConfig::create([
            'test_name' => 'Complete Blood Count',
            'test_code' => 'CBC-001',
            'category' => 'Hematology',
            'sample_type' => 'Blood',
            'unit' => 'cells/µL',
            'reference_range' => 'Various',
            'price' => 250.00,
            'turnaround_time' => '2 hours',
            'is_active' => true,
        ]);

        // Create CBC parameters
        $cbcParams = [
            ['parameter_name' => 'Hemoglobin', 'parameter_code' => 'HGB', 'data_type' => 'number', 'unit' => 'g/dL', 'reference_range' => '13-17', 'display_order' => 0],
            ['parameter_name' => 'White Blood Cell Count', 'parameter_code' => 'WBC', 'data_type' => 'number', 'unit' => 'cells/µL', 'reference_range' => '4.5-11.0', 'display_order' => 1],
            ['parameter_name' => 'Platelet Count', 'parameter_code' => 'PLT', 'data_type' => 'number', 'unit' => 'cells/µL', 'reference_range' => '150-400', 'display_order' => 2],
            ['parameter_name' => 'Red Blood Cell Count', 'parameter_code' => 'RBC', 'data_type' => 'number', 'unit' => 'cells/µL', 'reference_range' => '4.5-6.0', 'is_required' => false, 'display_order' => 3],
        ];

        foreach ($cbcParams as $param) {
            $cbc->parameters()->create($param);
        }

        // Create Liver Function Test
        $lft = TestConfig::create([
            'test_name' => 'Liver Function Test',
            'test_code' => 'LFT-001',
            'category' => 'Chemistry',
            'sample_type' => 'Blood',
            'unit' => 'U/L',
            'reference_range' => 'Various',
            'price' => 350.00,
            'turnaround_time' => '4 hours',
            'is_active' => true,
        ]);

        // Create LFT parameters
        $lftParams = [
            ['parameter_name' => 'ALT', 'parameter_code' => 'ALT', 'data_type' => 'number', 'unit' => 'U/L', 'reference_range' => '10-40', 'display_order' => 0],
            ['parameter_name' => 'AST', 'parameter_code' => 'AST', 'data_type' => 'number', 'unit' => 'U/L', 'reference_range' => '10-40', 'display_order' => 1],
            ['parameter_name' => 'Total Bilirubin', 'parameter_code' => 'TBIL', 'data_type' => 'number', 'unit' => 'mg/dL', 'reference_range' => '0.1-1.2', 'display_order' => 2],
            ['parameter_name' => 'Alkaline Phosphatase', 'parameter_code' => 'ALP', 'data_type' => 'number', 'unit' => 'U/L', 'reference_range' => '44-147', 'is_required' => false, 'display_order' => 3],
        ];

        foreach ($lftParams as $param) {
            $lft->parameters()->create($param);
        }

        // Create Lipid Profile
        $lipid = TestConfig::create([
            'test_name' => 'Lipid Profile',
            'test_code' => 'LIP-001',
            'category' => 'Chemistry',
            'sample_type' => 'Blood',
            'unit' => 'mg/dL',
            'reference_range' => 'Various',
            'price' => 300.00,
            'turnaround_time' => '4 hours',
            'is_active' => true,
        ]);

        // Create Lipid Profile parameters
        $lipidParams = [
            ['parameter_name' => 'Total Cholesterol', 'parameter_code' => 'CHOL', 'data_type' => 'number', 'unit' => 'mg/dL', 'reference_range' => '<200', 'display_order' => 0],
            ['parameter_name' => 'HDL Cholesterol', 'parameter_code' => 'HDL', 'data_type' => 'number', 'unit' => 'mg/dL', 'reference_range' => '>40', 'display_order' => 1],
            ['parameter_name' => 'LDL Cholesterol', 'parameter_code' => 'LDL', 'data_type' => 'number', 'unit' => 'mg/dL', 'reference_range' => '<100', 'display_order' => 2],
            ['parameter_name' => 'Triglycerides', 'parameter_code' => 'TG', 'data_type' => 'number', 'unit' => 'mg/dL', 'reference_range' => '<150', 'display_order' => 3],
        ];

        foreach ($lipidParams as $param) {
            $lipid->parameters()->create($param);
        }

        // Create Urinalysis
        $urinalysis = TestConfig::create([
            'test_name' => 'Urinalysis',
            'test_code' => 'UA-001',
            'category' => 'Urinalysis',
            'sample_type' => 'Urine',
            'unit' => '',
            'reference_range' => 'Various',
            'price' => 150.00,
            'turnaround_time' => '1 hour',
            'is_active' => true,
        ]);

        // Create Urinalysis parameters with select type
        $urinalysisParams = [
            ['parameter_name' => 'Color', 'parameter_code' => 'COLOR', 'data_type' => 'select', 'options' => ['Yellow', 'Straw', 'Clear', 'Dark Yellow', 'Orange', 'Red', 'Brown', 'Cloudy'], 'display_order' => 0],
            ['parameter_name' => 'Appearance', 'parameter_code' => 'APPEAR', 'data_type' => 'select', 'options' => ['Clear', 'Turbid', 'Cloudy', 'Milky'], 'display_order' => 1],
            ['parameter_name' => 'pH', 'parameter_code' => 'PH', 'data_type' => 'number', 'unit' => '', 'reference_range' => '4.5-8.0', 'display_order' => 2],
            ['parameter_name' => 'Specific Gravity', 'parameter_code' => 'SG', 'data_type' => 'number', 'unit' => '', 'reference_range' => '1.005-1.030', 'display_order' => 3],
            ['parameter_name' => 'Protein', 'parameter_code' => 'PROT', 'data_type' => 'select', 'options' => ['Negative', 'Trace', '+', '++', '+++'], 'display_order' => 4],
            ['parameter_name' => 'Glucose', 'parameter_code' => 'GLU', 'data_type' => 'select', 'options' => ['Negative', 'Trace', '+', '++', '+++'], 'display_order' => 5],
            ['parameter_name' => 'Ketones', 'parameter_code' => 'KET', 'data_type' => 'select', 'options' => ['Negative', 'Trace', '+', '++', '+++'], 'display_order' => 6],
        ];

        foreach ($urinalysisParams as $param) {
            $urinalysis->parameters()->create($param);
        }

        $this->command->info('Laboratory settings seeded successfully!');
    }
}
