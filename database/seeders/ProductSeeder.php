<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Carbon\Carbon;

class ProductSeeder extends Seeder
{
    /**
     * Barcode prefixes for different drug categories
     */
    private array $barcodePrefixes = [
        'tablet' => '890780200',
        'capsule' => '890780201',
        'injection' => '890780202',
        'cream' => '890780203',
        'inhaler' => '890780204',
        'solution' => '890780205',
        'powder' => '890780206',
        'other' => '890780207',
    ];

    /**
     * Generate unique barcode based on drug form and index
     */
    private function generateBarcode(string $form, int $index): string
    {
        $prefix = $this->barcodePrefixes[$form] ?? $this->barcodePrefixes['other'];
        $number = str_pad($index + 1, 6, '0', STR_PAD_LEFT);

        // Generate check digit using Luhn algorithm
        $barcodeWithoutCheck = $prefix . $number;
        $checkDigit = $this->calculateLuhnCheckDigit($barcodeWithoutCheck);

        return $barcodeWithoutCheck . $checkDigit;
    }

    /**
     * Calculate Luhn check digit for barcode validation
     */
    private function calculateLuhnCheckDigit(string $number): int
    {
        $sum = 0;
        $numDigits = strlen($number);
        $parity = $numDigits % 2;

        for ($i = 0; $i < $numDigits; $i++) {
            $digit = intval($number[$i]);
            if ($i % 2 == $parity) {
                $digit *= 2;
                if ($digit > 9) {
                    $digit -= 9;
                }
            }
            $sum += $digit;
        }

        return (10 - ($sum % 10)) % 10;
    }

    public function run(): void
    {
        $products = [
            // Pain Relief & Antipyretics
            ['Paracetamol', '500mg', 'tablet', 'Pain relief/antipyretic'],
            ['Paracetamol', '250mg', 'tablet', 'Pain relief/antipyretic'],
            ['Paracetamol', '120mg/5ml', 'solution', 'Pain relief/antipyretic'],
            ['Ibuprofen', '400mg', 'tablet', 'NSAID pain relief'],
            ['Ibuprofen', '200mg', 'tablet', 'NSAID pain relief'],
            ['Ibuprofen', '100mg/5ml', 'solution', 'NSAID pain relief'],
            ['Aspirin', '75mg', 'tablet', 'Antiplatelet'],
            ['Aspirin', '300mg', 'tablet', 'Antiplatelet'],
            ['Diclofenac', '50mg', 'tablet', 'NSAID pain relief'],
            ['Diclofenac', '75mg/3ml', 'injection', 'NSAID pain relief'],

            // Antibiotics
            ['Amoxicillin', '500mg', 'capsule', 'Broad-spectrum penicillin'],
            ['Amoxicillin', '250mg', 'capsule', 'Broad-spectrum penicillin'],
            ['Amoxicillin', '250mg/5ml', 'powder', 'Broad-spectrum penicillin'],
            ['Co-amoxiclav', '625mg', 'tablet', 'Penicillin combination'],
            ['Co-amoxiclav', '1.2g', 'injection', 'Penicillin combination'],
            ['Cotrimoxazole', '960mg', 'tablet', 'Sulfonamide antibiotic'],
            ['Cotrimoxazole', '240mg/5ml', 'solution', 'Sulfonamide antibiotic'],
            ['Metronidazole', '400mg', 'tablet', 'Antiprotozoal/antibacterial'],
            ['Metronidazole', '200mg', 'tablet', 'Antiprotozoal/antibacterial'],
            ['Metronidazole', '500mg/100ml', 'solution', 'Antiprotozoal/antibacterial'],
            ['Azithromycin', '250mg', 'tablet', 'Macrolide antibiotic'],
            ['Azithromycin', '500mg', 'tablet', 'Macrolide antibiotic'],
            ['Azithromycin', '200mg/5ml', 'powder', 'Macrolide antibiotic'],
            ['Ciprofloxacin', '500mg', 'tablet', 'Fluoroquinolone antibiotic'],
            ['Ciprofloxacin', '250mg', 'tablet', 'Fluoroquinolone antibiotic'],
            ['Doxycycline', '100mg', 'capsule', 'Tetracycline antibiotic'],
            ['Doxycycline', '50mg', 'capsule', 'Tetracycline antibiotic'],
            ['Gentamicin', '80mg/2ml', 'injection', 'Aminoglycoside antibiotic'],
            ['Ceftriaxone', '1g', 'injection', 'Cephalosporin antibiotic'],
            ['Ceftriaxone', '500mg', 'injection', 'Cephalosporin antibiotic'],

            // Antifungals
            ['Fluconazole', '150mg', 'capsule', 'Triazole antifungal'],
            ['Fluconazole', '50mg', 'capsule', 'Triazole antifungal'],
            ['Clotrimazole', '1%', 'cream', 'Azole antifungal'],
            ['Clotrimazole', '2%', 'cream', 'Azole antifungal'],
            ['Miconazole', '2%', 'cream', 'Azole antifungal'],

            // Antimalarials
            ['Artemether/Lumefantrine', '20/120mg', 'tablet', 'Antimalarial combination'],
            ['Artemether/Lumefantrine', '40/240mg', 'tablet', 'Antimalarial combination'],
            ['Quinine', '300mg', 'tablet', 'Antimalarial'],
            ['Quinine', '600mg/2ml', 'injection', 'Antimalarial'],
            ['Chloroquine', '150mg', 'tablet', 'Antimalarial'],
            ['Sulfadoxine/Pyrimethamine', '500/25mg', 'tablet', 'Antimalarial'],

            // Anthelmintics
            ['Albendazole', '400mg', 'tablet', 'Anthelmintic'],
            ['Albendazole', '200mg', 'tablet', 'Anthelmintic'],
            ['Mebendazole', '500mg', 'tablet', 'Anthelmintic'],
            ['Praziquantel', '600mg', 'tablet', 'Anthelmintic'],

            // Vitamins & Supplements
            ['Multivitamin', 'N/A', 'tablet', 'Vitamin supplement'],
            ['Vitamin A', '200000 IU', 'capsule', 'Vitamin supplement'],
            ['Vitamin A', '100000 IU', 'capsule', 'Vitamin supplement'],
            ['Ferrous Sulphate', '200mg', 'tablet', 'Iron supplement'],
            ['Ferrous Sulphate', '60mg', 'tablet', 'Iron supplement'],
            ['Folic Acid', '5mg', 'tablet', 'Vitamin supplement'],
            ['Folic Acid', '1mg', 'tablet', 'Vitamin supplement'],
            ['Calcium Carbonate', '500mg', 'tablet', 'Mineral supplement'],
            ['Calcium Carbonate', '1000mg', 'tablet', 'Mineral supplement'],
            ['Zinc Sulphate', '20mg', 'tablet', 'Mineral supplement'],
            ['Zinc Sulphate', '10mg', 'tablet', 'Mineral supplement'],
            ['Vitamin D3', '1000 IU', 'capsule', 'Vitamin supplement'],

            // GI Medications
            ['Omeprazole', '20mg', 'capsule', 'Proton pump inhibitor'],
            ['Omeprazole', '40mg', 'capsule', 'Proton pump inhibitor'],
            ['Pantoprazole', '40mg', 'tablet', 'Proton pump inhibitor'],
            ['Pantoprazole', '20mg', 'tablet', 'Proton pump inhibitor'],
            ['Metoclopramide', '10mg', 'tablet', 'Antiemetic'],
            ['Metoclopramide', '10mg/2ml', 'injection', 'Antiemetic'],
            ['Loperamide', '2mg', 'tablet', 'Antidiarrheal'],
            ['Bismuth Subsalicylate', 'N/A', 'tablet', 'Antidiarrheal'],

            // Respiratory Medications
            ['Salbutamol', '100mcg', 'inhaler', 'Bronchodilator'],
            ['Salbutamol', '200mcg', 'inhaler', 'Bronchodilator'],
            ['Salbutamol', '2.5mg', 'solution', 'Bronchodilator'],
            ['Budesonide', '200mcg', 'inhaler', 'Corticosteroid'],
            ['Budesonide', '400mcg', 'inhaler', 'Corticosteroid'],
            ['Ambroxol', '30mg', 'tablet', 'Mucolytic'],
            ['Ambroxol', '7.5mg/5ml', 'solution', 'Mucolytic'],
            ['Cough Syrup', 'N/A', 'solution', 'Cough suppressant'],

            // Cardiovascular Medications
            ['Amlodipine', '5mg', 'tablet', 'Calcium channel blocker'],
            ['Amlodipine', '10mg', 'tablet', 'Calcium channel blocker'],
            ['Enalapril', '10mg', 'tablet', 'ACE inhibitor'],
            ['Enalapril', '5mg', 'tablet', 'ACE inhibitor'],
            ['Losartan', '50mg', 'tablet', 'ARB'],
            ['Losartan', '100mg', 'tablet', 'ARB'],
            ['Hydrochlorothiazide', '25mg', 'tablet', 'Diuretic'],
            ['Hydrochlorothiazide', '12.5mg', 'tablet', 'Diuretic'],
            ['Nifedipine', '20mg', 'tablet', 'Calcium channel blocker'],
            ['Nifedipine', '10mg', 'tablet', 'Calcium channel blocker'],
            ['Atorvastatin', '20mg', 'tablet', 'Statin'],
            ['Atorvastatin', '40mg', 'tablet', 'Statin'],
            ['Simvastatin', '20mg', 'tablet', 'Statin'],
            ['Simvastatin', '40mg', 'tablet', 'Statin'],
            ['Digoxin', '0.25mg', 'tablet', 'Cardiac glycoside'],
            ['Furosemide', '40mg', 'tablet', 'Loop diuretic'],
            ['Furosemide', '20mg/2ml', 'injection', 'Loop diuretic'],

            // Hormonal & Reproductive Health
            ['Insulin Glargine', '100IU/ml', 'injection', 'Insulin'],
            ['Insulin Aspart', '100IU/ml', 'injection', 'Insulin'],
            ['Metformin', '500mg', 'tablet', 'Antidiabetic'],
            ['Metformin', '850mg', 'tablet', 'Antidiabetic'],
            ['Metformin', '1000mg', 'tablet', 'Antidiabetic'],
            ['Glibenclamide', '5mg', 'tablet', 'Antidiabetic'],
            ['Glibenclamide', '2.5mg', 'tablet', 'Antidiabetic'],
            ['Levonorgestrel', '1.5mg', 'tablet', 'Emergency contraceptive'],
            ['Depo Provera', '150mg/ml', 'injection', 'Contraceptive'],
            ['Depo Provera', '100mg/ml', 'injection', 'Contraceptive'],
            ['Oxytocin', '10IU', 'injection', 'Uterotonic'],
            ['Oxytocin', '5IU', 'injection', 'Uterotonic'],

            // Dermatological
            ['Hydrocortisone', '1%', 'cream', 'Corticosteroid'],
            ['Hydrocortisone', '2.5%', 'cream', 'Corticosteroid'],
            ['Betamethasone', '0.1%', 'cream', 'Corticosteroid'],
            ['Povidone-Iodine', '10%', 'solution', 'Antiseptic'],
            ['Povidone-Iodine', '5%', 'ointment', 'Antiseptic'],
            ['Silver Sulfadiazine', '1%', 'cream', 'Antibacterial'],

            // Emergency & Critical Care
            ['Diazepam', '10mg', 'tablet', 'Benzodiazepine'],
            ['Diazepam', '10mg/2ml', 'injection', 'Benzodiazepine'],
            ['Adrenaline', '1mg/ml', 'injection', 'Vasopressor'],
            ['Adrenaline', '0.1mg/ml', 'injection', 'Vasopressor'],
            ['Magnesium Sulphate', '50%', 'injection', 'Anticonvulsant'],
            ['Magnesium Sulphate', '20%', 'injection', 'Anticonvulsant'],
            ['Naloxone', '0.4mg/ml', 'injection', 'Opioid antagonist'],
            ['Atropine', '0.6mg/ml', 'injection', 'Anticholinergic'],
            ['Sodium Bicarbonate', '8.4%', 'injection', 'Buffer'],

            // IV Fluids & Solutions
            ['Normal Saline', '500ml', 'solution', 'IV fluid'],
            ['Normal Saline', '1000ml', 'solution', 'IV fluid'],
            ['Dextrose 5%', '500ml', 'solution', 'IV fluid'],
            ['Dextrose 5%', '1000ml', 'solution', 'IV fluid'],
            ['Dextrose 10%', '500ml', 'solution', 'IV fluid'],
            ['Ringer\'s Lactate', '500ml', 'solution', 'IV fluid'],
            ['Ringer\'s Lactate', '1000ml', 'solution', 'IV fluid'],
            ['Normal Saline', '100ml', 'solution', 'IV fluid'],

            // ORS & Rehydration
            ['ORS', '1 Sachet', 'powder', 'Oral rehydration'],
            ['ORS', '20.5g', 'powder', 'Oral rehydration'],
            ['ORS with Zinc', 'N/A', 'powder', 'Oral rehydration'],

            // Medical Supplies & Equipment
            ['Male Condoms', 'N/A', 'other', 'Contraceptive'],
            ['Female Condoms', 'N/A', 'other', 'Contraceptive'],
            ['Examination Gloves', 'Medium', 'other', 'Personal protective equipment'],
            ['Examination Gloves', 'Large', 'other', 'Personal protective equipment'],
            ['Examination Gloves', 'Small', 'other', 'Personal protective equipment'],
            ['Sterile Gloves', '7.5', 'other', 'Surgical supply'],
            ['Sterile Gloves', '8', 'other', 'Surgical supply'],
            ['Syringe', '5ml', 'other', 'Medical supply'],
            ['Syringe', '10ml', 'other', 'Medical supply'],
            ['Syringe', '20ml', 'other', 'Medical supply'],
            ['Syringe', '2ml', 'other', 'Medical supply'],
            ['IV Giving Set', 'Adult', 'other', 'Medical supply'],
            ['IV Giving Set', 'Pediatric', 'other', 'Medical supply'],
            ['IV Cannula', '22G', 'other', 'Medical supply'],
            ['IV Cannula', '24G', 'other', 'Medical supply'],
            ['IV Cannula', '18G', 'other', 'Medical supply'],
            ['Surgical Mask', 'N/A', 'other', 'Personal protective equipment'],
            ['N95 Mask', 'N/A', 'other', 'Personal protective equipment'],
            ['Gauze Swabs', '10x10cm', 'other', 'Dressing'],
            ['Cotton Wool', 'N/A', 'other', 'Medical supply'],
            ['Bandage', '5cm', 'other', 'Dressing'],
            ['Bandage', '10cm', 'other', 'Dressing'],
            ['Adhesive Plaster', '2.5cm', 'other', 'Dressing'],
            ['Adhesive Plaster', '5cm', 'other', 'Dressing'],
            ['Suture Kit', 'N/A', 'other', 'Surgical supply'],
            ['Scalpel Blade', '#10', 'other', 'Surgical supply'],
            ['Scalpel Blade', '#15', 'other', 'Surgical supply'],
        ];

        $batchSize = 100;
        $batch = [];
        $counter = 0;

        foreach ($products as $index => $product) {
            $form = $product[2];
            $barcode = $this->generateBarcode($form, $index);
            $productCode = 'PRD-' . str_pad($index + 1, 4, '0', STR_PAD_LEFT);
            $categoryId = $this->getCategoryId($form);
            // Generate realistic expiry dates
            $expiryDate = $this->generateExpiryDate($form);
            $batch[] = [
                'product_uuid' => Str::uuid(),
                'product_name' => $product[0],
                'product_code' => $barcode,
                'description' => $product[3] . ' - ' . $product[0] . ' ' . $product[1] . ' (' . $form . ')',
                'category_id' => $categoryId,
                'strength' => $product[1],
                'unit' => $this->getUnit($form, $product[1]),
                'form' => $form,
                'quantity' => $this->getRealisticQuantity($form),
                'expiry_date' => $expiryDate,
                'transaction_type' => 'receiving',
                'supplier_id' => rand(1, 5),
                'created_by' => rand(1, 3),
                'created_by_department' => rand(1, 3),
                'created_at' => now(),
                'updated_at' => now(),
            ];

            $counter++;

            // Insert in batches to optimize performance
            if ($counter % $batchSize === 0) {
                DB::table('products')->insert($batch);
                $batch = [];
            }
        }

        // Insert remaining products
        if (!empty($batch)) {
            DB::table('products')->insert($batch);
        }
    }

    /**
     * Get category ID based on drug form
     */
    private function getCategoryId(string $form): int
    {
        $categoryMap = [
            'tablet' => 1,
            'capsule' => 1,
            'injection' => 2,
            'cream' => 3,
            'inhaler' => 4,
            'solution' => 2,
            'powder' => 5,
            'other' => 5,
        ];

        return $categoryMap[$form] ?? rand(1, 5);
    }

    /**
     * Determine unit of measurement based on form and strength
     */
    private function getUnit(string $form, string $strength): string
    {
        if (
            strpos($strength, 'g') !== false || strpos($strength, 'mg') !== false ||
            strpos($strength, 'mcg') !== false || strpos($strength, 'IU') !== false
        ) {
            return 'Each';
        }

        if (strpos($strength, 'ml') !== false) {
            return 'Vial';
        }

        if ($form === 'powder') {
            return 'Sachet';
        }

        if ($form === 'solution' && strpos($strength, 'ml') !== false) {
            return 'Bottle';
        }

        if ($form === 'injection') {
            return 'Ampoule';
        }

        if ($form === 'inhaler') {
            return 'Device';
        }

        return 'Unit';
    }

    /**
     * Generate realistic quantity based on product form
     */
    private function getRealisticQuantity(string $form): int
    {
        $quantityRanges = [
            'tablet' => [500, 10000],
            'capsule' => [500, 10000],
            'injection' => [50, 1000],
            'cream' => [50, 500],
            'inhaler' => [50, 500],
            'solution' => [50, 500],
            'powder' => [100, 5000],
            'other' => [100, 10000],
        ];

        [$min, $max] = $quantityRanges[$form] ?? [100, 1000];
        return rand($min, $max);
    }

    /**
     * Generate realistic expiry date based on product form
     */
    private function generateExpiryDate(string $form): Carbon
    {
        // Different products have different shelf lives
        $shelfLifeMonths = [
            'tablet' => [18, 48],
            'capsule' => [18, 48],
            'injection' => [12, 36],
            'cream' => [12, 24],
            'inhaler' => [12, 24],
            'solution' => [12, 36],
            'powder' => [12, 36],
            'other' => [12, 60],
        ];

        [$min, $max] = $shelfLifeMonths[$form] ?? [12, 36];
        return Carbon::now()->addMonths(rand($min, $max));
    }
}
