<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Helpers\NumberGenerator;
use Carbon\Carbon;

class BudgetSeeder extends Seeder
{
    public function run(): void
    {
        $year = date('Y');
        $fiscalYear = $year;

        // ============================================
        // DISABLE FOREIGN KEY CHECKS
        // ============================================

        DB::statement('SET FOREIGN_KEY_CHECKS=0');

        // ============================================
        // TRUNCATE TABLES IN CORRECT ORDER
        // ============================================

        DB::table('budget_reports')->truncate();
        DB::table('budget_alerts')->truncate();
        DB::table('budget_transactions')->truncate();
        DB::table('budget_periods')->truncate();
        DB::table('budget_allocations')->truncate();
        DB::table('budget_categories')->truncate();

        DB::statement('SET FOREIGN_KEY_CHECKS=1');

        // ============================================
        // 1. BUDGET CATEGORIES
        // ============================================

        $categories = [
            ['code' => 'MED', 'name' => 'Medical Supplies', 'description' => 'General medical supplies and consumables', 'type' => 'operational', 'color' => '#4CAF50'],
            ['code' => 'PHARM', 'name' => 'Pharmaceuticals', 'description' => 'Medicines and pharmaceutical products', 'type' => 'operational', 'color' => '#2196F3'],
            ['code' => 'LAB', 'name' => 'Laboratory Reagents', 'description' => 'Laboratory testing reagents and materials', 'type' => 'operational', 'color' => '#9C27B0'],
            ['code' => 'SURG', 'name' => 'Surgical Supplies', 'description' => 'Surgical instruments and supplies', 'type' => 'operational', 'color' => '#F44336'],
            ['code' => 'GRANT', 'name' => 'Grant Funded', 'description' => 'Grant-funded programs and projects', 'type' => 'grant', 'color' => '#FF9800'],
            ['code' => 'DONOR', 'name' => 'Donor Funded', 'description' => 'Donor-funded initiatives', 'type' => 'donor', 'color' => '#795548'],
            ['code' => 'CAPITAL', 'name' => 'Capital Equipment', 'description' => 'Capital equipment and assets', 'type' => 'capital', 'color' => '#607D8B'],
            ['code' => 'PROJECT', 'name' => 'Project Specific', 'description' => 'Project-specific budgets', 'type' => 'project', 'color' => '#E91E63'],
        ];

        foreach ($categories as $category) {
            DB::table('budget_categories')->updateOrInsert(
                ['code' => $category['code']],
                [
                    'name' => $category['name'],
                    'description' => $category['description'],
                    'type' => $category['type'],
                    'color' => $category['color'],
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }

        // Get IDs
        $categoryIds = DB::table('budget_categories')->pluck('id', 'code')->toArray();
        $departmentIds = DB::table('departments')->pluck('id', 'name')->toArray();

        // ============================================
        // 2. BUDGET ALLOCATIONS USING BATCH GENERATION
        // ============================================

        $budgetData = [
            // Pharmacy Department
            ['budget_name' => 'Essential Medicines Budget', 'category' => 'PHARM', 'department' => 'Pharmacy', 'allocated' => 500000.00, 'warning_threshold' => 75, 'critical_threshold' => 90, 'budget_type' => 'annual'],
            ['budget_name' => 'Medical Consumables Budget', 'category' => 'MED', 'department' => 'Pharmacy', 'allocated' => 200000.00, 'warning_threshold' => 70, 'critical_threshold' => 85, 'budget_type' => 'annual'],
            ['budget_name' => 'IV Fluids & Solutions Budget', 'category' => 'PHARM', 'department' => 'Pharmacy', 'allocated' => 150000.00, 'warning_threshold' => 70, 'critical_threshold' => 85, 'budget_type' => 'annual'],

            // Ward 1
            ['budget_name' => 'Ward 1 Supplies Budget', 'category' => 'MED', 'department' => 'Ward 1', 'allocated' => 100000.00, 'warning_threshold' => 80, 'critical_threshold' => 90, 'budget_type' => 'annual'],
            ['budget_name' => 'Ward 1 Patient Care Budget', 'category' => 'PHARM', 'department' => 'Ward 1', 'allocated' => 75000.00, 'warning_threshold' => 75, 'critical_threshold' => 90, 'budget_type' => 'annual'],

            // Ward 2
            ['budget_name' => 'Ward 2 Supplies Budget', 'category' => 'MED', 'department' => 'Ward 2', 'allocated' => 100000.00, 'warning_threshold' => 80, 'critical_threshold' => 90, 'budget_type' => 'annual'],

            // Outpatient
            ['budget_name' => 'OPD Medicines Budget', 'category' => 'PHARM', 'department' => 'Outpatient', 'allocated' => 150000.00, 'warning_threshold' => 80, 'critical_threshold' => 90, 'budget_type' => 'annual'],
            ['budget_name' => 'OPD Consumables Budget', 'category' => 'MED', 'department' => 'Outpatient', 'allocated' => 80000.00, 'warning_threshold' => 70, 'critical_threshold' => 85, 'budget_type' => 'annual'],

            // Laboratory
            ['budget_name' => 'Lab Reagents Budget', 'category' => 'LAB', 'department' => 'Laboratory', 'allocated' => 120000.00, 'warning_threshold' => 75, 'critical_threshold' => 90, 'budget_type' => 'annual'],
            ['budget_name' => 'Lab Consumables Budget', 'category' => 'LAB', 'department' => 'Laboratory', 'allocated' => 60000.00, 'warning_threshold' => 70, 'critical_threshold' => 85, 'budget_type' => 'annual'],

            // Surgery
            ['budget_name' => 'Surgical Supplies Budget', 'category' => 'SURG', 'department' => 'Surgery', 'allocated' => 300000.00, 'warning_threshold' => 80, 'critical_threshold' => 90, 'budget_type' => 'annual'],
            ['budget_name' => 'Surgical Equipment Budget', 'category' => 'CAPITAL', 'department' => 'Surgery', 'allocated' => 200000.00, 'warning_threshold' => 85, 'critical_threshold' => 95, 'budget_type' => 'annual'],

            // Emergency
            ['budget_name' => 'Emergency Drugs Budget', 'category' => 'PHARM', 'department' => 'Emergency', 'allocated' => 180000.00, 'warning_threshold' => 75, 'critical_threshold' => 90, 'budget_type' => 'annual'],
            ['budget_name' => 'Emergency Supplies Budget', 'category' => 'MED', 'department' => 'Emergency', 'allocated' => 120000.00, 'warning_threshold' => 70, 'critical_threshold' => 85, 'budget_type' => 'annual'],

            // Maternity
            ['budget_name' => 'Maternity Supplies Budget', 'category' => 'MED', 'department' => 'Maternity', 'allocated' => 250000.00, 'warning_threshold' => 80, 'critical_threshold' => 90, 'budget_type' => 'annual'],

            // Grants
            ['budget_name' => 'Global Fund Grant 2026', 'category' => 'GRANT', 'department' => 'Pharmacy', 'allocated' => 1000000.00, 'warning_threshold' => 85, 'critical_threshold' => 95, 'budget_type' => 'project'],
            ['budget_name' => 'WHO Program Grant 2026', 'category' => 'GRANT', 'department' => 'Pharmacy', 'allocated' => 500000.00, 'warning_threshold' => 80, 'critical_threshold' => 90, 'budget_type' => 'project'],

            // Capital
            ['budget_name' => 'Medical Equipment Capital', 'category' => 'CAPITAL', 'department' => 'Pharmacy', 'allocated' => 400000.00, 'warning_threshold' => 90, 'critical_threshold' => 95, 'budget_type' => 'annual'],
            ['budget_name' => 'Hospital Infrastructure', 'category' => 'CAPITAL', 'department' => 'Ward 1', 'allocated' => 300000.00, 'warning_threshold' => 85, 'critical_threshold' => 95, 'budget_type' => 'annual'],
        ];

        // Generate all budget codes at once
        $budgetCodes = NumberGenerator::generateBudgetCodes(count($budgetData), 'BUD');

        $budgetCodesList = [];

        foreach ($budgetData as $index => $budget) {
            $budgetCode = $budgetCodes[$index];
            $budgetCodesList[] = $budgetCode;

            $departmentId = $departmentIds[$budget['department']] ?? null;
            $categoryId = $categoryIds[$budget['category']] ?? null;

            // Simulate usage
            $usedAmount = rand(0, (int)($budget['allocated'] * 0.6));
            $reserved = rand(0, (int)($budget['allocated'] * 0.1));
            $committed = rand(0, (int)($budget['allocated'] * 0.15));
            $actual = max(0, $usedAmount - $reserved - $committed);

            DB::table('budget_allocations')->insert([
                'budget_code' => $budgetCode,
                'budget_name' => $budget['budget_name'],
                'category_id' => $categoryId,
                'department_id' => $departmentId,
                'fiscal_year' => $fiscalYear,
                'budget_type' => $budget['budget_type'],
                'original_amount' => $budget['allocated'],
                'allocated_amount' => $budget['allocated'],
                'reserved_amount' => $reserved,
                'committed_amount' => $committed,
                'actual_spent' => $actual,
                'warning_threshold' => $budget['warning_threshold'],
                'critical_threshold' => $budget['critical_threshold'],
                'status' => 'active',
                'created_by' => 1,
                'approved_by' => 1,
                'approved_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // ============================================
        // 3. BUDGET PERIODS
        // ============================================

        $budgetCodesFromDB = DB::table('budget_allocations')->pluck('budget_code')->toArray();

        foreach ($budgetCodesFromDB as $budgetCode) {
            $allocation = DB::table('budget_allocations')
                ->where('budget_code', $budgetCode)
                ->first();

            if (!$allocation) continue;

            $monthlyAmount = $allocation->allocated_amount / 12;
            $monthlySpent = $allocation->actual_spent / 12;

            for ($month = 1; $month <= 12; $month++) {
                $monthName = Carbon::create($fiscalYear, $month, 1)->format('F');

                DB::table('budget_periods')->insert([
                    'budget_code' => $budgetCode,
                    'period_type' => 'monthly',
                    'year' => $fiscalYear,
                    'period_number' => $month,
                    'period_name' => $monthName,
                    'allocated_amount' => $monthlyAmount,
                    'actual_spent' => $monthlySpent,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        // ============================================
        // 4. BUDGET TRANSACTIONS
        // ============================================

        $transactionTypes = ['reservation', 'commitment', 'actual'];
        $referenceTypes = ['PR', 'PO', 'GRN'];

        for ($i = 0; $i < 100; $i++) {
            $budgetCode = $budgetCodesFromDB[array_rand($budgetCodesFromDB)];
            $allocation = DB::table('budget_allocations')
                ->where('budget_code', $budgetCode)
                ->first();

            if (!$allocation) continue;

            $amount = rand(1000, min(50000, (int)$allocation->allocated_amount / 10));
            $type = $transactionTypes[array_rand($transactionTypes)];
            $refType = $referenceTypes[array_rand($referenceTypes)];
            $transactionDate = Carbon::now()->subDays(rand(1, 180));

            DB::table('budget_transactions')->insert([
                'transaction_no' => NumberGenerator::generateCustom('BT', 'App\\Models\\Budgets\\BudgetTransaction', [
                    'field' => 'transaction_no',
                    'reset_on' => 'day',
                    'include_date' => true,
                    'date_format' => 'Ymd',
                    'length' => 5,
                ]),
                'budget_code' => $budgetCode,
                'transaction_type' => $type,
                'reference_type' => $refType,
                'reference_id' => rand(1, 100),
                'amount' => $amount,
                'balance_before' => $allocation->allocated_amount - $amount,
                'balance_after' => $allocation->allocated_amount,
                'description' => "Sample {$type} transaction for {$budgetCode}",
                'transaction_date' => $transactionDate,
                'created_by' => 1,
                'created_at' => $transactionDate,
                'updated_at' => $transactionDate,
            ]);
        }

        // ============================================
        // 5. BUDGET ALERTS
        // ============================================

        foreach ($budgetCodesFromDB as $budgetCode) {
            $allocation = DB::table('budget_allocations')
                ->where('budget_code', $budgetCode)
                ->first();

            if (!$allocation) continue;

            $utilization = rand(60, 95);
            if ($utilization > 75) {
                $type = $utilization > 90 ? 'critical' : 'warning';
                $threshold = $type === 'critical' ? $allocation->critical_threshold : $allocation->warning_threshold;

                DB::table('budget_alerts')->insert([
                    'budget_code' => $budgetCode,
                    'alert_type' => $type,
                    'threshold' => $threshold,
                    'current_utilization' => $utilization,
                    'message' => "Budget utilization at {$utilization}%",
                    'recommendation' => $type === 'critical' ? 'Immediate review required' : 'Monitor spending closely',
                    'is_resolved' => $utilization < 70,
                    'created_at' => Carbon::now()->subDays(rand(1, 30)),
                    'updated_at' => Carbon::now()->subDays(rand(1, 30)),
                ]);
            }
        }

        // ============================================
        // 6. DISPLAY SUMMARY
        // ============================================

        $this->command->info('✅ Budget seeder completed successfully!');
        $this->command->info('📊 Budget categories seeded: ' . count($categories));
        $this->command->info('📊 Budget allocations seeded: ' . count($budgetData));
        $this->command->info('📊 Budget periods seeded: ' . DB::table('budget_periods')->count());
        $this->command->info('📊 Budget transactions seeded: 100');
        $this->command->info('📊 Budget alerts seeded: ' . DB::table('budget_alerts')->count());
        $this->command->info('');
        $this->command->info('📋 Budget codes generated:');
        foreach ($budgetCodesList as $code) {
            $this->command->info('   - ' . $code);
        }
    }
}
