<?php

namespace Database\Seeders;

use App\Models\Finance\FinanceCategory;
use Illuminate\Database\Seeder;

class FinanceCategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            // Revenue
            ['REV-GRANT',     'Grants',           'revenue'],
            ['REV-DONATION',  'Donations',        'revenue'],
            ['REV-INSURANCE', 'Insurance Claims', 'revenue'],
            ['REV-SERVICE',   'Service Fees',     'revenue'],
            ['REV-OTHER',     'Other Income',     'revenue'],
            // Expense
            ['EXP-SALARY',    'Salaries & Wages', 'expense'],
            ['EXP-SUPPLIES',  'Medical Supplies', 'expense'],
            ['EXP-UTILITIES', 'Utilities',        'expense'],
            ['EXP-MAINT',     'Maintenance',      'expense'],
            ['EXP-TRANSPORT', 'Transport & Fuel', 'expense'],
            ['EXP-STATION',   'Stationery',       'expense'],
            ['EXP-OTHER',     'Other Expenses',   'expense'],
        ];

        foreach ($categories as [$code, $name, $type]) {
            FinanceCategory::updateOrCreate(
                ['code' => $code],
                ['name' => $name, 'type' => $type, 'is_active' => true],
            );
        }
    }
}
