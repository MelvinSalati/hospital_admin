// components/modals/AddProductModal.tsx

import React, { useState, useEffect, useRef } from 'react';
import {
    X,
    Check,
    Package,
    Barcode,
    Tag,
    Pill,
    Syringe,
    DollarSign,
    Shield,
    AlertCircle,
    Hash,
    Box,
    ClipboardList,
    FileText,
    Plus,
    Minus,
    Layers,
    Wrench,
    Droplets,
    Sparkles,
    Utensils,
    Coffee,
    Scissors,
    Home,
    Briefcase,
    FlaskConical,
    Heart,
    Stethoscope,
    Ambulance,
    Microscope,
    Monitor,
    Printer,
    Wifi,
    Lightbulb,
    Droplet,
    Thermometer,
    Bone,
    Eye,
    Ear,
    Baby,
    HeartPulse,
    Bug,
    Snowflake,
    Dumbbell,
    Cross,
    Pill as PillIcon,
    Syringe as SyringeIcon,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import Http from '@/utils/Http';

// ============================================================================
// Types
// ============================================================================

interface AddProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    product?: any;
    mode?: 'create' | 'edit';
}

interface ProductFormData {
    // Basic Information
    product_name: string;
    generic_name: string;
    brand_name: string;
    product_code: string;
    barcode: string;
    category_id: number | null;
    sub_category_id: number | null;
    description: string;

    // Product Details
    product_type:
        | 'drug'
        | 'medical_supply'
        | 'cleaning'
        | 'equipment'
        | 'consumable'
        | 'other';
    unit_of_measure: string;
    pack_size: number;

    // Inventory Settings
    track_inventory: boolean;
    track_batch_numbers: boolean;
    track_expiry_dates: boolean;
    reorder_level: number;
    max_stock_level: number;
    min_stock_level: number;

    // Pricing
    purchase_price: number;
    selling_price: number;
    insurance_price: number;

    // Status
    status: 'active' | 'inactive';
}

interface Category {
    id: number;
    name: string;
    description: string;
    icon: string;
}

// ============================================================================
// CATEGORIES DATA
// ============================================================================

const CATEGORIES: Category[] = [
    // Medical & Clinical
    {
        id: 1,
        name: 'Medicines',
        description: 'Prescription and over-the-counter drugs',
        icon: 'Pill',
    },
    {
        id: 2,
        name: 'Medical Consumables',
        description: 'Disposable medical supplies',
        icon: 'Package',
    },
    {
        id: 3,
        name: 'Surgical Supplies',
        description: 'Surgical instruments and consumables',
        icon: 'Scissors',
    },
    {
        id: 4,
        name: 'Laboratory Reagents',
        description: 'Chemicals and reagents used in laboratories',
        icon: 'FlaskConical',
    },
    {
        id: 5,
        name: 'Laboratory Consumables',
        description: 'Test tubes, slides, pipette tips, etc.',
        icon: 'Microscope',
    },
    {
        id: 6,
        name: 'Radiology Supplies',
        description: 'X-ray films, ultrasound gel, contrast media',
        icon: 'Eye',
    },
    {
        id: 7,
        name: 'Dental Supplies',
        description: 'Dental materials and instruments',
        icon: 'Stethoscope',
    },
    {
        id: 8,
        name: 'Vaccines',
        description: 'All vaccines and immunization products',
        icon: 'Syringe',
    },
    {
        id: 9,
        name: 'Medical Gases',
        description: 'Oxygen, Nitrous Oxide, CO₂, Medical Air',
        icon: 'Wind',
    },
    {
        id: 10,
        name: 'Intravenous (IV) Fluids',
        description: "Normal Saline, Dextrose, Ringer's Lactate",
        icon: 'Droplet',
    },
    {
        id: 11,
        name: 'Blood Bank Supplies',
        description: 'Blood bags, anticoagulants, reagents',
        icon: 'HeartPulse',
    },
    {
        id: 12,
        name: 'Nutrition Products',
        description: 'Therapeutic foods, supplements, infant formula',
        icon: 'Utensils',
    },

    // Safety & Cleaning
    {
        id: 13,
        name: 'Personal Protective Equipment (PPE)',
        description: 'Gloves, masks, gowns, face shields',
        icon: 'Shield',
    },
    {
        id: 14,
        name: 'Cleaning & Disinfectants',
        description: 'Bleach, alcohol, detergents, disinfectants',
        icon: 'Sparkles',
    },
    {
        id: 15,
        name: 'Sterilization Supplies',
        description: 'Autoclave indicators, sterilization wraps',
        icon: 'Thermometer',
    },

    // Office & Administration
    {
        id: 16,
        name: 'Office Supplies',
        description: 'Stationery and office materials',
        icon: 'FileText',
    },
    {
        id: 17,
        name: 'Printing & Forms',
        description: 'Medical forms, registers, prescription pads',
        icon: 'Printer',
    },

    // Equipment
    {
        id: 18,
        name: 'Medical Equipment',
        description: 'Beds, monitors, ECG machines',
        icon: 'Monitor',
    },
    {
        id: 19,
        name: 'Biomedical Equipment Parts',
        description: 'Spare parts and accessories',
        icon: 'Wrench',
    },
    {
        id: 20,
        name: 'Laboratory Equipment',
        description: 'Microscopes, centrifuges, analyzers',
        icon: 'Microscope',
    },
    {
        id: 21,
        name: 'Radiology Equipment',
        description: 'X-ray machines, ultrasound equipment',
        icon: 'Eye',
    },

    // Facilities & Maintenance
    {
        id: 22,
        name: 'Furniture & Fixtures',
        description: 'Chairs, desks, cabinets',
        icon: 'Home',
    },
    {
        id: 23,
        name: 'IT Equipment',
        description: 'Computers, printers, scanners',
        icon: 'Monitor',
    },
    {
        id: 24,
        name: 'Networking Equipment',
        description: 'Routers, switches, access points',
        icon: 'Wifi',
    },
    {
        id: 25,
        name: 'Electrical Supplies',
        description: 'Bulbs, sockets, extension cables',
        icon: 'Lightbulb',
    },
    {
        id: 26,
        name: 'Plumbing Supplies',
        description: 'Pipes, taps, fittings',
        icon: 'Droplets',
    },
    {
        id: 27,
        name: 'Maintenance Supplies',
        description: 'Tools, lubricants, repair materials',
        icon: 'Tool',
    },

    // Support Services
    {
        id: 28,
        name: 'Laundry Supplies',
        description: 'Detergents, linen bags',
        icon: 'Sparkles',
    },
    {
        id: 29,
        name: 'Kitchen Supplies',
        description: 'Catering equipment and utensils',
        icon: 'Utensils',
    },
    {
        id: 30,
        name: 'Housekeeping Supplies',
        description: 'Brooms, mops, buckets',
        icon: 'Home',
    },
    {
        id: 31,
        name: 'Ambulance Supplies',
        description: 'Emergency kits and transport equipment',
        icon: 'Ambulance',
    },
    {
        id: 32,
        name: 'Emergency & Trauma Supplies',
        description: 'Splints, trauma kits, cervical collars',
        icon: 'Heart',
    },

    // Specialized Medical
    {
        id: 33,
        name: 'Orthopedic Supplies',
        description: 'Casts, braces, crutches',
        icon: 'Bone',
    },
    {
        id: 34,
        name: 'Ophthalmology Supplies',
        description: 'Eye drops, lenses, ophthalmic consumables',
        icon: 'Eye',
    },
    {
        id: 35,
        name: 'ENT Supplies',
        description: 'Ear, Nose, and Throat consumables',
        icon: 'Ear',
    },
    {
        id: 36,
        name: 'Maternity Supplies',
        description: 'Delivery kits, obstetric consumables',
        icon: 'Baby',
    },
    {
        id: 37,
        name: 'Family Planning Commodities',
        description: 'Condoms, implants, IUCDs, injectables',
        icon: 'Heart',
    },

    // Disease-Specific Programs
    {
        id: 38,
        name: 'HIV/AIDS Commodities',
        description: 'ARVs, HIV test kits, viral load consumables',
        icon: 'Virus',
    },
    {
        id: 39,
        name: 'Tuberculosis (TB) Commodities',
        description: 'TB medicines and diagnostics',
        icon: 'Bug',
    },
    {
        id: 40,
        name: 'Malaria Commodities',
        description: 'ACTs, RDTs, mosquito nets',
        icon: 'Bug',
    },
    {
        id: 41,
        name: 'Non-Communicable Disease (NCD) Supplies',
        description: 'Diabetes, hypertension, asthma products',
        icon: 'HeartPulse',
    },

    // Cold Chain & Rehabilitation
    {
        id: 42,
        name: 'Cold Chain Supplies',
        description: 'Vaccine carriers, ice packs, refrigerators',
        icon: 'Snowflake',
    },
    {
        id: 43,
        name: 'Rehabilitation Supplies',
        description: 'Walking aids, physiotherapy equipment',
        icon: 'Dumbbell',
    },
    {
        id: 44,
        name: 'Mortuary Supplies',
        description: 'Body bags, mortuary consumables',
        icon: 'Cross',
    },

    // Other
    {
        id: 45,
        name: 'Miscellaneous',
        description: 'Other products not categorized',
        icon: 'Package',
    },
];

// ============================================================================
// SUB-CATEGORIES (by category)
// ============================================================================

const SUB_CATEGORIES: Record<
    number,
    { id: number; name: string; description: string }[]
> = {
    1: [
        // Medicines
        {
            id: 101,
            name: 'Antibiotics',
            description: 'Bacterial infection treatments',
        },
        {
            id: 102,
            name: 'Antivirals',
            description: 'Viral infection treatments',
        },
        {
            id: 103,
            name: 'Antifungals',
            description: 'Fungal infection treatments',
        },
        { id: 104, name: 'Antimalarials', description: 'Malaria treatments' },
        {
            id: 105,
            name: 'Antihypertensives',
            description: 'Blood pressure medications',
        },
        { id: 106, name: 'Antidiabetics', description: 'Diabetes medications' },
        { id: 107, name: 'Analgesics', description: 'Pain relievers' },
        { id: 108, name: 'Antipyretics', description: 'Fever reducers' },
        {
            id: 109,
            name: 'Anti-inflammatory',
            description: 'Inflammation reducers',
        },
        { id: 110, name: 'Anticoagulants', description: 'Blood thinners' },
        { id: 111, name: 'Cardiovascular', description: 'Heart medications' },
        {
            id: 112,
            name: 'Respiratory',
            description: 'Asthma and breathing medications',
        },
        {
            id: 113,
            name: 'Gastrointestinal',
            description: 'Digestive system medications',
        },
        {
            id: 114,
            name: 'CNS Drugs',
            description: 'Central nervous system medications',
        },
        { id: 115, name: 'Hormones', description: 'Hormonal medications' },
        {
            id: 116,
            name: 'Vitamins & Minerals',
            description: 'Nutritional supplements',
        },
        {
            id: 117,
            name: 'Topical Medications',
            description: 'Creams, ointments, gels',
        },
        { id: 118, name: 'Ophthalmic Drugs', description: 'Eye medications' },
        { id: 119, name: 'Otic Drugs', description: 'Ear medications' },
    ],
    2: [
        // Medical Consumables
        {
            id: 201,
            name: 'Syringes & Needles',
            description: 'Injection supplies',
        },
        {
            id: 202,
            name: 'Catheters & Tubes',
            description: 'Urinary and feeding tubes',
        },
        { id: 203, name: 'Dressings', description: 'Wound care supplies' },
        {
            id: 204,
            name: 'Bandages & Tapes',
            description: 'Bandages, plasters, tapes',
        },
        {
            id: 205,
            name: 'Swabs & Gauze',
            description: 'Cleaning and wound care',
        },
        {
            id: 206,
            name: 'Urine & Specimen Collection',
            description: 'Sample containers',
        },
        {
            id: 207,
            name: 'Scrubs & Surgical Gowns',
            description: 'Operating room attire',
        },
        {
            id: 208,
            name: 'Surgical Drapes',
            description: 'Sterile drapes for procedures',
        },
        {
            id: 209,
            name: 'Sutures & Staples',
            description: 'Wound closure materials',
        },
    ],
    3: [
        // Surgical Supplies
        {
            id: 301,
            name: 'Surgical Blades & Scalpels',
            description: 'Surgical cutting tools',
        },
        {
            id: 302,
            name: 'Forceps & Clamps',
            description: 'Surgical grasping tools',
        },
        {
            id: 303,
            name: 'Scissors & Shears',
            description: 'Surgical cutting instruments',
        },
        {
            id: 304,
            name: 'Retractors',
            description: 'Surgical retraction tools',
        },
        {
            id: 305,
            name: 'Needle Holders',
            description: 'Suturing instruments',
        },
        { id: 306, name: 'Speculums', description: 'Examination tools' },
    ],
    38: [
        // HIV/AIDS Commodities
        {
            id: 3801,
            name: 'ARVs (Adult)',
            description: 'Adult antiretroviral drugs',
        },
        {
            id: 3802,
            name: 'ARVs (Pediatric)',
            description: 'Child antiretroviral drugs',
        },
        {
            id: 3803,
            name: 'HIV Test Kits',
            description: 'Rapid diagnostic tests',
        },
        {
            id: 3804,
            name: 'Viral Load Consumables',
            description: 'Viral load testing supplies',
        },
        {
            id: 3805,
            name: 'CD4 Test Consumables',
            description: 'CD4 testing supplies',
        },
        { id: 3806, name: 'PrEP', description: 'Pre-exposure prophylaxis' },
    ],
    39: [
        // TB Commodities
        {
            id: 3901,
            name: 'First-Line TB Drugs',
            description: 'Standard TB treatment',
        },
        {
            id: 3902,
            name: 'Second-Line TB Drugs',
            description: 'Drug-resistant TB treatment',
        },
        {
            id: 3903,
            name: 'TB Diagnostics',
            description: 'TB testing supplies',
        },
        {
            id: 3904,
            name: 'GeneXpert Supplies',
            description: 'Molecular testing consumables',
        },
    ],
    40: [
        // Malaria Commodities
        {
            id: 4001,
            name: 'ACTs',
            description: 'Artemisinin-based combination therapy',
        },
        { id: 4002, name: 'RDTs', description: 'Rapid diagnostic tests' },
        {
            id: 4003,
            name: 'Mosquito Nets',
            description: 'Insecticide-treated nets',
        },
        {
            id: 4004,
            name: 'IPT Supplies',
            description: 'Intermittent preventive treatment',
        },
    ],
    42: [
        // Cold Chain Supplies
        {
            id: 4201,
            name: 'Vaccine Carriers',
            description: 'Portable vaccine storage',
        },
        {
            id: 4202,
            name: 'Cold Boxes',
            description: 'Large vaccine transport',
        },
        { id: 4203, name: 'Ice Packs', description: 'Coolant packs' },
        {
            id: 4204,
            name: 'Refrigerators',
            description: 'Vaccine storage refrigerators',
        },
        { id: 4205, name: 'Freezers', description: 'Vaccine storage freezers' },
        {
            id: 4206,
            name: 'Temperature Monitors',
            description: 'Cold chain monitoring',
        },
    ],
};

// ============================================================================
// Sub-components
// ============================================================================

const FormField: React.FC<{
    label: string;
    name: string;
    value: string | number | boolean;
    onChange: (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    ) => void;
    type?: string;
    placeholder?: string;
    required?: boolean;
    icon?: React.ReactNode;
    options?: { value: string | number; label: string }[];
    className?: string;
    disabled?: boolean;
    step?: string;
}> = ({
    label,
    name,
    value,
    onChange,
    type = 'text',
    placeholder,
    required = false,
    icon,
    options,
    className = '',
    disabled = false,
    step,
}) => {
    return (
        <div className={`space-y-0.5 ${className}`}>
            <label className="flex items-center gap-1 text-[10px] font-medium tracking-wide text-slate-600 uppercase dark:text-slate-400">
                {icon}
                {label}
                {required && <span className="text-red-500">*</span>}
            </label>
            {options ? (
                <select
                    name={name}
                    value={value}
                    onChange={onChange}
                    disabled={disabled}
                    className="h-7 w-full rounded border border-slate-200 px-1.5 text-xs focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                    <option value="">Select...</option>
                    {options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
            ) : (
                <input
                    type={type}
                    name={name}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    required={required}
                    disabled={disabled}
                    step={step}
                    className="h-7 w-full rounded border border-slate-200 px-1.5 text-xs focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
            )}
        </div>
    );
};

const CheckboxField: React.FC<{
    label: string;
    name: string;
    checked: boolean;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}> = ({ label, name, checked, onChange }) => {
    return (
        <label className="flex cursor-pointer items-center gap-1.5">
            <input
                type="checkbox"
                name={name}
                checked={checked}
                onChange={onChange}
                className="h-3 w-3 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-600"
            />
            <span className="text-[10px] text-slate-600 dark:text-slate-400">
                {label}
            </span>
        </label>
    );
};

// ============================================================================
// Icon Map
// ============================================================================

const iconMap: Record<string, React.ReactNode> = {
    Pill: <PillIcon className="h-3 w-3" />,
    Syringe: <SyringeIcon className="h-3 w-3" />,
    Package: <Package className="h-3 w-3" />,
    Scissors: <Scissors className="h-3 w-3" />,
    FlaskConical: <FlaskConical className="h-3 w-3" />,
    Microscope: <Microscope className="h-3 w-3" />,
    Eye: <Eye className="h-3 w-3" />,
    Stethoscope: <Stethoscope className="h-3 w-3" />,
    Wind: (
        <svg
            className="h-3 w-3"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
        >
            <path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2" />
        </svg>
    ),
    Droplet: <Droplet className="h-3 w-3" />,
    HeartPulse: <HeartPulse className="h-3 w-3" />,
    Utensils: <Utensils className="h-3 w-3" />,
    Shield: <Shield className="h-3 w-3" />,
    Sparkles: <Sparkles className="h-3 w-3" />,
    Thermometer: <Thermometer className="h-3 w-3" />,
    FileText: <FileText className="h-3 w-3" />,
    Printer: <Printer className="h-3 w-3" />,
    Monitor: <Monitor className="h-3 w-3" />,
    Wrench: <Wrench className="h-3 w-3" />,
    Home: <Home className="h-3 w-3" />,
    Wifi: <Wifi className="h-3 w-3" />,
    Lightbulb: <Lightbulb className="h-3 w-3" />,
    Droplets: <Droplets className="h-3 w-3" />,
    Tool: <Box className="h-3 w-3" />,
    Ambulance: <Ambulance className="h-3 w-3" />,
    Heart: <Heart className="h-3 w-3" />,
    Bone: <Bone className="h-3 w-3" />,
    Ear: <Ear className="h-3 w-3" />,
    Baby: <Baby className="h-3 w-3" />,
    Virus: <Microscope className="h-3 w-3" />,
    Bug: <Bug className="h-3 w-3" />,
    Snowflake: <Snowflake className="h-3 w-3" />,
    Dumbbell: <Dumbbell className="h-3 w-3" />,
    Cross: <Cross className="h-3 w-3" />,
    ClipboardList: <ClipboardList className="h-3 w-3" />,
    Hash: <Hash className="h-3 w-3" />,
    Tag: <Tag className="h-3 w-3" />,
    Barcode: <Barcode className="h-3 w-3" />,
    Layers: <Layers className="h-3 w-3" />,
    DollarSign: <DollarSign className="h-3 w-3" />,
    AlertCircle: <AlertCircle className="h-3 w-3" />,
    Box: <Box className="h-3 w-3" />,
    Plus: <Plus className="h-3 w-3" />,
    Minus: <Minus className="h-3 w-3" />,
};

// ============================================================================
// Main Component
// ============================================================================

export default function AddProductModal({
    isOpen,
    onClose,
    onSuccess,
    product,
    mode = 'create',
}: AddProductModalProps) {
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [categories] = useState<Category[]>(CATEGORIES);
    const [subCategories, setSubCategories] = useState<
        { id: number; name: string; description: string }[]
    >([]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const modalRef = useRef<HTMLDivElement>(null);

    const [formData, setFormData] = useState<ProductFormData>({
        product_name: '',
        generic_name: '',
        brand_name: '',
        product_code: '',
        barcode: '',
        category_id: null,
        sub_category_id: null,
        description: '',
        product_type: 'other',
        unit_of_measure: 'piece',
        pack_size: 1,
        track_inventory: true,
        track_batch_numbers: false,
        track_expiry_dates: false,
        reorder_level: 10,
        max_stock_level: 100,
        min_stock_level: 5,
        purchase_price: 0,
        selling_price: 0,
        insurance_price: 0,
        status: 'active',
    });

    const isEditMode = mode === 'edit';

    // ============================================================================
    // Constants
    // ============================================================================

    const PRODUCT_TYPES = [
        { value: 'drug', label: '💊 Drug/Medicine' },
        { value: 'medical_supply', label: '🏥 Medical Supply' },
        { value: 'cleaning', label: '🧹 Cleaning Material' },
        { value: 'equipment', label: '🔧 Equipment' },
        { value: 'consumable', label: '📦 Consumable' },
        { value: 'other', label: '📦 Other' },
    ];

    const UNIT_OF_MEASURE = [
        { value: 'piece', label: 'Piece' },
        { value: 'box', label: 'Box' },
        { value: 'pack', label: 'Pack' },
        { value: 'bottle', label: 'Bottle' },
        { value: 'can', label: 'Can' },
        { value: 'carton', label: 'Carton' },
        { value: 'roll', label: 'Roll' },
        { value: 'meter', label: 'Meter' },
        { value: 'liter', label: 'Liter' },
        { value: 'kg', label: 'Kg' },
        { value: 'gram', label: 'Gram' },
        { value: 'ml', label: 'ML' },
        { value: 'tablet', label: 'Tablet' },
        { value: 'capsule', label: 'Capsule' },
        { value: 'vial', label: 'Vial' },
        { value: 'ampoule', label: 'Ampoule' },
        { value: 'sachet', label: 'Sachet' },
        { value: 'tube', label: 'Tube' },
        { value: 'strip', label: 'Strip' },
        { value: 'blister', label: 'Blister' },
        { value: 'bag', label: 'Bag' },
        { value: 'jar', label: 'Jar' },
        { value: 'canister', label: 'Canister' },
        { value: 'pair', label: 'Pair' },
        { value: 'set', label: 'Set' },
        { value: 'sheet', label: 'Sheet' },
        { value: 'meter', label: 'Meter' },
    ];

    // ============================================================================
    // Effects
    // ============================================================================

    useEffect(() => {
        if (isOpen) {
            if (isEditMode && product) {
                setFormData(product);
            } else {
                generateProductCode();
            }
        }
    }, [isOpen, mode, product]);

    // Load sub-categories when category changes
    useEffect(() => {
        if (formData.category_id) {
            setSubCategories(SUB_CATEGORIES[formData.category_id] || []);
        } else {
            setSubCategories([]);
        }
    }, [formData.category_id]);

    // Handle click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                modalRef.current &&
                !modalRef.current.contains(e.target as Node)
            ) {
                onClose();
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    // Handle escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    if (!isOpen) return null;

    // ============================================================================
    // Handlers
    // ============================================================================

    const generateProductCode = () => {
        const prefix = 'PRD';
        const year = new Date().getFullYear();
        const random = Math.floor(Math.random() * 10000)
            .toString()
            .padStart(4, '0');
        setFormData((prev) => ({
            ...prev,
            product_code: `${prefix}-${year}-${random}`,
        }));
    };

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    ) => {
        const { name, value, type } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]:
                type === 'checkbox'
                    ? (e.target as HTMLInputElement).checked
                    : type === 'number'
                      ? parseFloat(value) || 0
                      : name === 'product_code' || name === 'barcode'
                        ? value.toUpperCase()
                        : value,
        }));
        // Clear error for this field
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: '' }));
        }
    };

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;
        setFormData((prev) => ({ ...prev, [name]: checked }));
    };

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.product_name.trim()) {
            newErrors.product_name = 'Product name is required';
        }
        if (!formData.category_id) {
            newErrors.category_id = 'Category is required';
        }
        if (!formData.product_type) {
            newErrors.product_type = 'Product type is required';
        }
        if (formData.purchase_price < 0) {
            newErrors.purchase_price = 'Price cannot be negative';
        }
        if (formData.selling_price < 0) {
            newErrors.selling_price = 'Price cannot be negative';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setSubmitting(true);

        try {
            const url = isEditMode
                ? `/api/products/${product?.id}`
                : '/api/products';

            const method = isEditMode ? 'PUT' : 'POST';

            const response = await Http({
                method,
                url,
                data: formData,
            });

            if (response.data.success) {
                toast.success(
                    isEditMode
                        ? 'Product updated successfully!'
                        : 'Product created successfully!',
                );
                onSuccess();
                onClose();
                resetForm();
            } else {
                if (response.data.errors) {
                    setErrors(response.data.errors);
                }
                toast.error(response.data.message || 'Failed to save product');
            }
        } catch (error: any) {
            const message =
                error.response?.data?.message || 'Failed to save product';
            toast.error(message);
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
            }
        } finally {
            setSubmitting(false);
        }
    };

    const resetForm = () => {
        setFormData({
            product_name: '',
            generic_name: '',
            brand_name: '',
            product_code: '',
            barcode: '',
            category_id: null,
            sub_category_id: null,
            description: '',
            product_type: 'other',
            unit_of_measure: 'piece',
            pack_size: 1,
            track_inventory: true,
            track_batch_numbers: false,
            track_expiry_dates: false,
            reorder_level: 10,
            max_stock_level: 100,
            min_stock_level: 5,
            purchase_price: 0,
            selling_price: 0,
            insurance_price: 0,
            status: 'active',
        });
        setErrors({});
        generateProductCode();
    };

    // Get category icon
    const getCategoryIcon = (iconName: string) => {
        return iconMap[iconName] || <Package className="h-3 w-3" />;
    };

    // Get product type icon
    const getProductTypeIcon = (type: string) => {
        switch (type) {
            case 'drug':
                return <PillIcon className="h-3 w-3" />;
            case 'medical_supply':
                return <Briefcase className="h-3 w-3" />;
            case 'cleaning':
                return <Sparkles className="h-3 w-3" />;
            case 'equipment':
                return <Tool className="h-3 w-3" />;
            case 'consumable':
                return <Package className="h-3 w-3" />;
            default:
                return <Package className="h-3 w-3" />;
        }
    };

    // ============================================================================
    // Render
    // ============================================================================

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 backdrop-blur-sm">
            <div
                ref={modalRef}
                className="relative max-h-[95vh] w-full max-w-4xl animate-in duration-200 fade-in zoom-in"
            >
                <div className="overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-slate-800">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5 dark:border-slate-700">
                        <div className="flex items-center gap-2">
                            <div className="rounded-lg bg-blue-100 p-1.5 dark:bg-blue-900/30">
                                {isEditMode ? (
                                    <Package className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                ) : (
                                    <Plus className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                )}
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                    {isEditMode
                                        ? 'Edit Product'
                                        : 'Add New Product'}
                                </h3>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                    {isEditMode
                                        ? 'Update product information'
                                        : 'Register a new product in the system'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="rounded p-0.5 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700"
                        >
                            <X className="h-4 w-4 text-slate-500" />
                        </button>
                    </div>

                    {/* Form - Scrollable */}
                    <div className="max-h-[calc(95vh-140px)] overflow-y-auto p-4 bg-blue-50">
                        <form onSubmit={handleSubmit}>
                            {/* Two-Column Grid */}
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                {/* Left Column */}
                                <div className="space-y-2">
                                    <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-700/30">
                                        <h4 className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold text-slate-600 uppercase dark:text-slate-400">
                                            <Package className="h-3 w-3" />
                                            Basic Information
                                        </h4>
                                        <div className="space-y-1.5">
                                            <FormField
                                                label="Product Name"
                                                name="product_name"
                                                value={formData.product_name}
                                                onChange={handleChange}
                                                placeholder="e.g., Medical Gloves, Bleach, etc."
                                                required
                                                icon={
                                                    <Package className="h-3 w-3" />
                                                }
                                                disabled={isEditMode}
                                            />
                                            <FormField
                                                label="Product Code"
                                                name="product_code"
                                                value={formData.product_code}
                                                onChange={handleChange}
                                                placeholder="Auto-generated"
                                                icon={
                                                    <Hash className="h-3 w-3" />
                                                }
                                            />
                                            <FormField
                                                label="Generic Name"
                                                name="generic_name"
                                                value={formData.generic_name}
                                                onChange={handleChange}
                                                placeholder="e.g., Latex Examination Gloves"
                                                icon={
                                                    <FileText className="h-3 w-3" />
                                                }
                                            />
                                            <FormField
                                                label="Brand Name"
                                                name="brand_name"
                                                value={formData.brand_name}
                                                onChange={handleChange}
                                                placeholder="e.g., Kimberly-Clark, Clorox"
                                                icon={
                                                    <Tag className="h-3 w-3" />
                                                }
                                            />
                                            <FormField
                                                label="Barcode"
                                                name="barcode"
                                                value={formData.barcode}
                                                onChange={handleChange}
                                                placeholder="Scan or enter barcode"
                                                icon={
                                                    <Barcode className="h-3 w-3" />
                                                }
                                            />
                                            <FormField
                                                label="Description"
                                                name="description"
                                                value={formData.description}
                                                onChange={handleChange}
                                                placeholder="Product description"
                                                icon={
                                                    <FileText className="h-3 w-3" />
                                                }
                                            />
                                        </div>
                                    </div>

                                    <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-700/30">
                                        <h4 className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold text-slate-600 uppercase dark:text-slate-400">
                                            <Layers className="h-3 w-3" />
                                            Classification
                                        </h4>
                                        <div className="space-y-1.5">
                                            <FormField
                                                label="Product Type"
                                                name="product_type"
                                                value={formData.product_type}
                                                onChange={handleChange}
                                                required
                                                icon={getProductTypeIcon(
                                                    formData.product_type,
                                                )}
                                                options={PRODUCT_TYPES}
                                                disabled={isEditMode}
                                            />
                                            <FormField
                                                label="Category"
                                                name="category_id"
                                                value={
                                                    formData.category_id || ''
                                                }
                                                onChange={handleChange}
                                                required
                                                icon={
                                                    <ClipboardList className="h-3 w-3" />
                                                }
                                                options={categories.map(
                                                    (c) => ({
                                                        value: c.id,
                                                        label: `${c.name} (${c.description})`,
                                                    }),
                                                )}
                                                disabled={isEditMode}
                                            />
                                            {subCategories.length > 0 && (
                                                <FormField
                                                    label="Sub-Category"
                                                    name="sub_category_id"
                                                    value={
                                                        formData.sub_category_id ||
                                                        ''
                                                    }
                                                    onChange={handleChange}
                                                    icon={
                                                        <ClipboardList className="h-3 w-3" />
                                                    }
                                                    options={subCategories.map(
                                                        (c) => ({
                                                            value: c.id,
                                                            label: c.name,
                                                        }),
                                                    )}
                                                />
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column */}
                                <div className="space-y-2">
                                    <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-700/30">
                                        <h4 className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold text-slate-600 uppercase dark:text-slate-400">
                                            <Box className="h-3 w-3" />
                                            Unit & Packaging
                                        </h4>
                                        <div className="space-y-1.5">
                                            <FormField
                                                label="Unit of Measure"
                                                name="unit_of_measure"
                                                value={formData.unit_of_measure}
                                                onChange={handleChange}
                                                required
                                                icon={
                                                    <Layers className="h-3 w-3" />
                                                }
                                                options={UNIT_OF_MEASURE}
                                            />
                                            <FormField
                                                label="Pack Size"
                                                name="pack_size"
                                                value={formData.pack_size}
                                                onChange={handleChange}
                                                type="number"
                                                placeholder="e.g., 10, 50, 100"
                                                icon={
                                                    <Package className="h-3 w-3" />
                                                }
                                            />
                                        </div>
                                    </div>

                                    <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-700/30">
                                        <h4 className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold text-slate-600 uppercase dark:text-slate-400">
                                            <AlertCircle className="h-3 w-3" />
                                            Inventory Settings
                                        </h4>
                                        <div className="space-y-1.5">
                                            <div className="flex flex-wrap gap-2">
                                                <CheckboxField
                                                    label="Track Inventory"
                                                    name="track_inventory"
                                                    checked={
                                                        formData.track_inventory
                                                    }
                                                    onChange={
                                                        handleCheckboxChange
                                                    }
                                                />
                                                <CheckboxField
                                                    label="Track Batches"
                                                    name="track_batch_numbers"
                                                    checked={
                                                        formData.track_batch_numbers
                                                    }
                                                    onChange={
                                                        handleCheckboxChange
                                                    }
                                                />
                                                <CheckboxField
                                                    label="Track Expiry"
                                                    name="track_expiry_dates"
                                                    checked={
                                                        formData.track_expiry_dates
                                                    }
                                                    onChange={
                                                        handleCheckboxChange
                                                    }
                                                />
                                            </div>
                                            <div className="grid grid-cols-3 gap-1.5">
                                                <FormField
                                                    label="Min Stock"
                                                    name="min_stock_level"
                                                    value={
                                                        formData.min_stock_level
                                                    }
                                                    onChange={handleChange}
                                                    type="number"
                                                    icon={
                                                        <Minus className="h-3 w-3" />
                                                    }
                                                />
                                                <FormField
                                                    label="Reorder Level"
                                                    name="reorder_level"
                                                    value={
                                                        formData.reorder_level
                                                    }
                                                    onChange={handleChange}
                                                    type="number"
                                                    icon={
                                                        <AlertCircle className="h-3 w-3" />
                                                    }
                                                />
                                                <FormField
                                                    label="Max Stock"
                                                    name="max_stock_level"
                                                    value={
                                                        formData.max_stock_level
                                                    }
                                                    onChange={handleChange}
                                                    type="number"
                                                    icon={
                                                        <Plus className="h-3 w-3" />
                                                    }
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-700/30">
                                        <h4 className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold text-slate-600 uppercase dark:text-slate-400">
                                            <DollarSign className="h-3 w-3" />
                                            Pricing
                                        </h4>
                                        <div className="space-y-1.5">
                                            <div className="grid grid-cols-3 gap-1.5">
                                                <FormField
                                                    label="Purchase Price"
                                                    name="purchase_price"
                                                    value={
                                                        formData.purchase_price
                                                    }
                                                    onChange={handleChange}
                                                    type="number"
                                                    placeholder="0.00"
                                                    step="0.01"
                                                    icon={
                                                        <DollarSign className="h-3 w-3" />
                                                    }
                                                />
                                                <FormField
                                                    label="Selling Price"
                                                    name="selling_price"
                                                    value={
                                                        formData.selling_price
                                                    }
                                                    onChange={handleChange}
                                                    type="number"
                                                    placeholder="0.00"
                                                    step="0.01"
                                                    icon={
                                                        <DollarSign className="h-3 w-3" />
                                                    }
                                                />
                                                <FormField
                                                    label="Insurance Price"
                                                    name="insurance_price"
                                                    value={
                                                        formData.insurance_price
                                                    }
                                                    onChange={handleChange}
                                                    type="number"
                                                    placeholder="0.00"
                                                    step="0.01"
                                                    icon={
                                                        <DollarSign className="h-3 w-3" />
                                                    }
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-700/30">
                                        <h4 className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold text-slate-600 uppercase dark:text-slate-400">
                                            <Shield className="h-3 w-3" />
                                            Status
                                        </h4>
                                        <div className="flex gap-3">
                                            <label className="flex cursor-pointer items-center gap-1.5">
                                                <input
                                                    type="radio"
                                                    name="status"
                                                    value="active"
                                                    checked={
                                                        formData.status ===
                                                        'active'
                                                    }
                                                    onChange={handleChange}
                                                    className="h-3 w-3 border-slate-300 text-green-600 focus:ring-green-500"
                                                />
                                                <span className="flex items-center gap-1 text-[10px] text-slate-600 dark:text-slate-400">
                                                    <Check className="h-3 w-3 text-green-500" />
                                                    Active
                                                </span>
                                            </label>
                                            <label className="flex cursor-pointer items-center gap-1.5">
                                                <input
                                                    type="radio"
                                                    name="status"
                                                    value="inactive"
                                                    checked={
                                                        formData.status ===
                                                        'inactive'
                                                    }
                                                    onChange={handleChange}
                                                    className="h-3 w-3 border-slate-300 text-red-600 focus:ring-red-500"
                                                />
                                                <span className="flex items-center gap-1 text-[10px] text-slate-600 dark:text-slate-400">
                                                    <X className="h-3 w-3 text-red-500" />
                                                    Inactive
                                                </span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Error Summary */}
                            {Object.keys(errors).length > 0 && (
                                <div className="mt-2 rounded-lg border border-red-200 bg-red-50 p-1.5 dark:border-red-900 dark:bg-red-950/30">
                                    <p className="text-[10px] text-red-600 dark:text-red-400">
                                        Please fix the following errors:
                                    </p>
                                    <ul className="list-inside list-disc text-[9px] text-red-500">
                                        {Object.values(errors).map(
                                            (error, idx) => (
                                                <li key={idx}>{error}</li>
                                            ),
                                        )}
                                    </ul>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="mt-3 flex justify-end gap-2 border-t border-slate-200 pt-2.5 dark:border-slate-700">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="rounded border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                                    disabled={submitting}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting || loading}
                                    className="flex items-center gap-1.5 rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {submitting ? (
                                        <>
                                            <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Check className="h-3.5 w-3.5" />
                                            {isEditMode
                                                ? 'Update Product'
                                                : 'Add Product'}
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
