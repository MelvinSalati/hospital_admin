import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    CheckCircle,
    Shield,
    Clock,
    DollarSign,
    BarChart3,
    Users,
    FileText,
    CreditCard,
    Smartphone,
    Zap,
    TrendingUp,
    Sparkles,
    Menu,
    X,
    Star,
    Heart,
    Award,
    Globe,
    Lock,
    Mail,
    Phone,
    MapPin,
    ChevronRight,
    Play,
    Download,
    Layers,
    PieChart,
    Settings,
    HeadphonesIcon,
    Database,
    Cloud,
    Moon,
    Sun,
    Briefcase,
    Building2,
    Stethoscope,
    Activity,
    Calendar,
    CheckSquare,
    ShieldCheck,
    Fingerprint,
    Server,
    Cpu,
    Network,
    Hospital,
    Bed,
    Ambulance,
    Pill,
    Syringe,
    Baby,
    HeartPulse,
    Microscope,
    Flask,
    TestTube,
    PhoneCall,
    MessageCircle,
    CalendarDays,
    Clock4,
    User,
    UserRound,
    Scissors,
    Bone,
    Flower,
    Sprout,
    Apple,
    Milk,
    Droplet,
    Thermometer,
    Waves,
    Wind,
    CloudDrizzle,
    Zap as ZapIcon,
    RefreshCw,
    Repeat,
    HeartHandshake,
    Handshake,
    GraduationCap,
    BookOpen,
    Leaf,
    TreePine,
    Mountain,
    Sun as SunIcon,
    Cloud as CloudIcon,
    Flame,
    Snowflake,
    Umbrella,
    Compass,
    Navigation,
    Anchor,
    Ship,
    Plane,
    Car,
    Bus,
    Train,
    Bike,
    Walk,
    Run,
    Heart as HeartIcon,
    Stethoscope as StethoscopeIcon,
    Ambulance as AmbulanceIcon,
    Pill as PillIcon,
    Syringe as SyringeIcon,
    Bandage,
    Hospital as HospitalIcon,
    Clinic,
    Pharmacy,
    Dental,
    Eye,
    Ear,
    Nose,
    Mouth,
    Tooth,
    Bone as BoneIcon,
    Brain,
    Lungs,
    Kidney,
    Liver,
    Stomach,
    Intestine,
    Bladder,
    Uterus,
    Prostate,
    Breast,
    Skin,
    Hair,
    Nail,
    Muscle,
    Joint,
    Spine,
    Nerve,
    Blood,
    Cell,
    Virus,
    Bacteria,
    Parasite,
    Fungi,
    Allergy,
    Immunity,
    Vaccine,
    DNA,
    RNA,
    Gene,
    Chromosome,
    Molecule,
    Atom,
    Electron,
    Proton,
    Neutron,
    Quark,
    Photon,
    Graviton,
    Higgs,
    Boson,
    Fermion,
    Lepton,
    Hadron,
    Meson,
    Baryon,
    Hyperon,
    Kaon,
    Pion,
    Muon,
    Tau,
    Neutrino,
    Positron,
    Antiproton,
    Antineutron,
    Antimatter,
    DarkMatter,
    DarkEnergy,
    BlackHole,
    NeutronStar,
    Pulsar,
    Quasar,
    Galaxy,
    Nebula,
    Supernova,
    Comet,
    Asteroid,
    Meteor,
    Planet,
    Star as StarIcon,
    Sun as SunIcon2,
    Moon as MoonIcon2,
    Eclipse,
    Orbit,
    Rocket,
    Satellite,
    SpaceStation,
    Astronaut,
    Alien,
    UFO,
    Telescope,
    Microscope as MicroscopeIcon,
    Flask as FlaskIcon,
    Beaker,
    TestTube as TestTubeIcon,
    PetriDish,
    Pipette,
    Centrifuge,
    Spectrometer,
    Chromatography,
    Electrophoresis,
    PCR,
    ELISA,
    WesternBlot,
    SouthernBlot,
    NorthernBlot,
    FlowCytometry,
    MassSpec,
    NMR,
    XRay,
    CTScan,
    MRI,
    Ultrasound,
    PETScan,
    SPECT,
    DEXA,
    Mammography,
    Fluoroscopy,
    Angiography,
    Endoscopy,
    Laparoscopy,
    Arthroscopy,
    Bronchoscopy,
    Colonoscopy,
    Cystoscopy,
    Gastroscopy,
    Laryngoscopy,
    Otoscopy,
    Ophthalmoscopy,
    Proctoscopy,
    Sigmoidoscopy,
    Thoracoscopy,
    Ureteroscopy,
    Hysteroscopy,
    Colposcopy,
    Amniocentesis,
    Biopsy,
    Excision,
    Incision,
    Drainage,
    Irrigation,
    Lavage,
    Aspiration,
    Injection,
    Infusion,
    Transfusion,
    Dialysis,
    Hemodialysis,
    PeritonealDialysis,
    Plasmapheresis,
    Photopheresis,
    Apheresis,
    Leukopheresis,
    Plateletpheresis,
    Erythropheresis,
    Lymphapheresis,
    Cytoapheresis,
    Chemotherapy,
    Radiotherapy,
    Immunotherapy,
    GeneTherapy,
    StemCellTherapy,
    OrganTransplant,
    BoneMarrowTransplant,
    CordBloodTransplant,
    ArtificialHeart,
    Pacemaker,
    Defibrillator,
    Ventilator,
    AnesthesiaMachine,
    SurgicalRobot,
    DaVinci,
    CyberKnife,
    GammaKnife,
    LinearAccelerator,
    ProtonTherapy,
    NeutronTherapy,
    HeavyIonTherapy,
    Brachytherapy,
    Teletherapy,
    Hyperthermia,
    Cryotherapy,
    Phototherapy,
    LaserTherapy,
    UltrasonicTherapy,
    ElectricalStimulation,
    MagneticStimulation,
    MechanicalTherapy,
    Hydrotherapy,
    Balneotherapy,
    Heliotherapy,
    Climatotherapy,
    Thalassotherapy,
    Aromatherapy,
    MusicTherapy,
    ArtTherapy,
    DanceTherapy,
    DramaTherapy,
    PoetryTherapy,
    Bibliotherapy,
    PetTherapy,
    HorticulturalTherapy,
    OccupationalTherapy,
    PhysicalTherapy,
    SpeechTherapy,
    RespiratoryTherapy,
    NutritionalTherapy,
    PsychologicalTherapy,
    PsychiatricTherapy,
    SocialTherapy,
    FamilyTherapy,
    GroupTherapy,
    CognitiveTherapy,
    BehavioralTherapy,
    DialecticalTherapy,
    InterpersonalTherapy,
    PsychodynamicTherapy,
    HumanisticTherapy,
    ExistentialTherapy,
    TranspersonalTherapy,
    HolisticTherapy,
    IntegrativeTherapy,
    ComplementaryTherapy,
    AlternativeTherapy,
    TraditionalTherapy,
    Ayurveda,
    Homeopathy,
    Naturopathy,
    Osteopathy,
    Chiropractic,
    Acupuncture,
    Acupressure,
    Reflexology,
    Reiki,
    HealingTouch,
    TherapeuticTouch,
    Craniosacral,
    MyofascialRelease,
    TriggerPoint,
    MuscleEnergy,
    StrainCounterstrain,
    PositionalRelease,
    FunctionalRelease,
    VisceralManipulation,
    NeuralManipulation,
    LymphaticDrainage,
    BowenTechnique,
    Feldenkrais,
    AlexanderTechnique,
    Pilates,
    Yoga,
    TaiChi,
    QiGong,
    Meditation,
    Mindfulness,
    Relaxation,
    Hypnosis,
    GuidedImagery,
    Biofeedback,
    Neurofeedback,
    EMDR,
    EFT,
    TFT,
    TAT,
    BSFF,
    NLP,
    TimeLineTherapy,
    InnerChildWork,
    ShadowWork,
    PartsWork,
    InnerFamilySystems,
    InternalFamilySystems,
    StructuralFamilyTherapy,
    StrategicFamilyTherapy,
    BowenianFamilyTherapy,
    ContextualFamilyTherapy,
    NarrativeFamilyTherapy,
    SolutionFocusedFamilyTherapy,
    GottmanMethod,
    EmotionallyFocusedTherapy,
    ImagoTherapy,
    PACT,
    EFTTapping,
    MatrixReimprinting,
    ThetaHealing,
    QuantumHealing,
    EnergyMedicine,
    FrequencyHealing,
    SoundHealing,
    LightHealing,
    ColorHealing,
    CrystalHealing,
    GemstoneHealing,
    FlowerEssence,
    BachFlowers,
    EssenceTherapy,
    Aromatherapy as AromatherapyIcon,
    Herbalism,
    Phytotherapy,
    TCM,
    Kampo,
    Unani,
    Siddha,
    TibetanMedicine,
    MongolianMedicine,
    KoreanMedicine,
    VietnameseMedicine,
    ThaiMedicine,
    MalayMedicine,
    IndonesianMedicine,
    PhilippineMedicine,
    NativeAmericanMedicine,
    AfricanMedicine,
    EgyptianMedicine,
    GreekMedicine,
    RomanMedicine,
    PersianMedicine,
    IslamicMedicine,
    ByzantineMedicine,
    MedievalMedicine,
    RenaissanceMedicine,
    EnlightenmentMedicine,
    ModernMedicine,
    ContemporaryMedicine,
    FutureMedicine,
    AIMedicine,
    Nanomedicine,
    Telemedicine,
    DigitalHealth,
    WearableHealth,
    ImplantableHealth,
    MobileHealth,
    CloudHealth,
    BlockchainHealth,
    IoTHealth,
    BigDataHealth,
    PrecisionMedicine,
    PersonalizedMedicine,
    GenomicMedicine,
    ProteomicMedicine,
    MetabolomicMedicine,
    TranscriptomicMedicine,
    EpigeneticMedicine,
    MicrobiomeMedicine,
    ExposomeMedicine,
    IntegrativeMedicine,
    FunctionalMedicine,
    LifestyleMedicine,
    PreventiveMedicine,
    CurativeMedicine,
    PalliativeMedicine,
    HospiceMedicine,
    GeriatricMedicine,
    PediatricMedicine,
    AdolescentMedicine,
    AdultMedicine,
    WomenHealth,
    MenHealth,
    LGBTQHealth,
    GlobalHealth,
    PublicHealth,
    CommunityHealth,
    RuralHealth,
    UrbanHealth,
    OccupationalHealth,
    EnvironmentalHealth,
    MentalHealth,
    BehavioralHealth,
    EmotionalHealth,
    SocialHealth,
    SpiritualHealth,
    FinancialHealth,
    LegalHealth,
    EthicalHealth,
    CulturalHealth,
    EducationalHealth,
    ResearchHealth,
    PolicyHealth,
    AdvocacyHealth,
    LeadershipHealth,
    ManagementHealth,
    AdministrationHealth,
    GovernanceHealth,
    StrategyHealth,
    InnovationHealth,
    TechnologyHealth,
    QualityHealth,
    SafetyHealth,
    RiskHealth,
    ComplianceHealth,
    AuditHealth,
    PerformanceHealth,
    OutcomeHealth,
    ImpactHealth,
    SustainabilityHealth,
    ResilienceHealth,
    WellbeingHealth,
    FlourishingHealth,
    ThrivingHealth,
    OptimalHealth,
    PeakHealth,
    IdealHealth,
    PerfectHealth,
    UltimateHealth,
    SupremeHealth,
    AbsoluteHealth,
    InfiniteHealth,
    EternalHealth,
    DivineHealth,
    SacredHealth,
    HolyHealth,
    BlessedHealth,
    MiraculousHealth,
    MagicalHealth,
    MythicalHealth,
    LegendaryHealth,
    EpicHealth,
    HeroicHealth,
    LegendaryHealth2,
    MythicHealth,
    FabledHealth,
    FictionalHealth,
    ImaginaryHealth,
    DreamHealth,
    VisionHealth,
    IntuitionHealth,
    InspirationHealth,
    CreativityHealth,
    InnovationHealth2,
    DiscoveryHealth,
    ExplorationHealth,
    AdventureHealth,
    JourneyHealth,
    QuestHealth,
    MissionHealth,
    PurposeHealth,
    MeaningHealth,
    FulfillmentHealth,
    JoyHealth,
    PeaceHealth,
    LoveHealth,
    CompassionHealth,
    KindnessHealth,
    GratitudeHealth,
    HopeHealth,
    FaithHealth,
    TrustHealth,
    CourageHealth,
    StrengthHealth,
    WisdomHealth,
    KnowledgeHealth,
    UnderstandingHealth,
    InsightHealth,
    AwarenessHealth,
    ConsciousnessHealth,
    PresenceHealth,
    AuthenticityHealth,
    IntegrityHealth,
    HonestyHealth,
    TruthHealth,
    JusticeHealth,
    EqualityHealth,
    EquityHealth,
    DiversityHealth,
    InclusionHealth,
    BelongingHealth,
    ConnectionHealth,
    CommunityHealth2,
    RelationshipsHealth,
    PartnershipHealth,
    CollaborationHealth,
    CooperationHealth,
    SynergyHealth,
    HarmonyHealth,
    BalanceHealth,
    AlignmentHealth,
    IntegrationHealth,
    WholenessHealth,
    UnityHealth,
    OnenessHealth,
    TotalityHealth,
    CompletenessHealth,
    PerfectionHealth,
    ExcellenceHealth,
    MasteryHealth,
    ExpertiseHealth,
    ProficiencyHealth,
    CompetenceHealth,
    CapabilityHealth,
    CapacityHealth,
    PotentialHealth,
    PossibilityHealth,
    PromiseHealth,
    DestinyHealth,
    FateHealth,
    FortuneHealth,
    LuckHealth,
    ChanceHealth,
    OpportunityHealth,
    SerendipityHealth,
    BlessingHealth,
    GiftHealth,
    TreasureHealth,
    GemHealth,
    JewelHealth,
    PearlHealth,
    DiamondHealth,
    RubyHealth,
    EmeraldHealth,
    SapphireHealth,
    TopazHealth,
    AmethystHealth,
    CitrineHealth,
    GarnetHealth,
    OpalHealth,
    TurquoiseHealth,
    LapisHealth,
    JadeHealth,
    CoralHealth,
    AmberHealth,
    IvoryHealth,
    EbonyHealth,
    SilverHealth,
    GoldHealth,
    PlatinumHealth,
    PalladiumHealth,
    RhodiumHealth,
    IridiumHealth,
    OsmiumHealth,
    RutheniumHealth,
    RheniumHealth,
    TechnetiumHealth,
    MolybdenumHealth,
    TungstenHealth,
    ChromiumHealth,
    VanadiumHealth,
    TitaniumHealth,
    ScandiumHealth,
    YttriumHealth,
    ZirconiumHealth,
    NiobiumHealth,
    HafniumHealth,
    TantalumHealth,
    WolframHealth,
    ManganeseHealth,
    IronHealth,
    CobaltHealth,
    NickelHealth,
    CopperHealth,
    ZincHealth,
    GalliumHealth,
    GermaniumHealth,
    ArsenicHealth,
    SeleniumHealth,
    BromineHealth,
    KryptonHealth,
    RubidiumHealth,
    StrontiumHealth,
    CadmiumHealth,
    IndiumHealth,
    TinHealth,
    AntimonyHealth,
    TelluriumHealth,
    IodineHealth,
    XenonHealth,
    CesiumHealth,
    BariumHealth,
    LanthanumHealth,
    CeriumHealth,
    PraseodymiumHealth,
    NeodymiumHealth,
    PromethiumHealth,
    SamariumHealth,
    EuropiumHealth,
    GadoliniumHealth,
    TerbiumHealth,
    DysprosiumHealth,
    HolmiumHealth,
    ErbiumHealth,
    ThuliumHealth,
    YtterbiumHealth,
    LutetiumHealth,
    ActiniumHealth,
    ThoriumHealth,
    ProtactiniumHealth,
    UraniumHealth,
    NeptuniumHealth,
    PlutoniumHealth,
    AmericiumHealth,
    CuriumHealth,
    BerkeliumHealth,
    CaliforniumHealth,
    EinsteiniumHealth,
    FermiumHealth,
    MendeleviumHealth,
    NobeliumHealth,
    LawrenciumHealth,
    RutherfordiumHealth,
    DubniumHealth,
    SeaborgiumHealth,
    BohriumHealth,
    HassiumHealth,
    MeitneriumHealth,
    DarmstadtiumHealth,
    RoentgeniumHealth,
    CoperniciumHealth,
    NihoniumHealth,
    FleroviumHealth,
    MoscoviumHealth,
    LivermoriumHealth,
    TennessineHealth,
    OganessonHealth,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { dashboard, login, register } from '@/routes';

// Image URLs for hero section
const IMAGES = {
    hero: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=2053&auto=format&fit=crop',
    surgery:
        'https://images.unsplash.com/photo-1550831107-1553da8c8464?q=80&w=687&auto=format&fit=crop',
    consultation:
        'https://images.unsplash.com/photo-1666886573301-b5d526cfd518?q=80&w=1974&auto=format&fit=crop',
    imaging:
        'https://images.unsplash.com/photo-1530497610245-94d3c16cda28?q=80&w=1964&auto=format&fit=crop',
    ultrasound:
        'https://images.unsplash.com/photo-1530497610245-94d3c16cda28?q=80&w=1964&auto=format&fit=crop',
    dental1:
        'https://plus.unsplash.com/premium_photo-1672922646298-3afc6c6397c9?q=80&w=1171&auto=format&fit=crop',
    dental2:
        'https://plus.unsplash.com/premium_photo-1672922646348-b8129dbd3c54?q=80&w=687&auto=format&fit=crop',
    maternity:
        'https://images.unsplash.com/photo-1559757175-5700dde675bc?q=80&w=1974&auto=format&fit=crop',
    womenHealth:
        'https://images.unsplash.com/photo-1576091160550-2173dba999ef?q=80&w=2070&auto=format&fit=crop',
    laboratory:
        'https://images.unsplash.com/photo-1576086213369-97a306d36557?q=80&w=2080&auto=format&fit=crop',
    pharmacy:
        'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?q=80&w=1730&auto=format&fit=crop',
    emergency:
        'https://images.unsplash.com/photo-1516549655169-df83a0774514?q=80&w=2070&auto=format&fit=crop',
};

// Available services/departments for appointment
const APPOINTMENT_SERVICES = [
    'General Consultation',
    "Women's Health & Gynaecology",
    'Maternal & Child Health',
    'Orthopaedics',
    'Laboratory Services',
    'Pharmacy & Medication',
    'Outpatient Care',
    'Surgery Services',
    'Imaging & Diagnostics',
    'Ultrasound Services',
    'Dental Care',
    'Orthodontics',
    'Emergency Care',
    'Cardiology',
    'Neurology',
    'Pediatrics',
];

export default function Welcome({
                                    canRegister = true,
                                }: {
    canRegister?: boolean;
}) {
    const { auth } = usePage().props;
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [scrollPosition, setScrollPosition] = useState(0);

    // Appointment form state
    const [appointmentForm, setAppointmentForm] = useState({
        patient_name: '',
        patient_email: '',
        patient_phone: '',
        service: '',
        appointment_date: '',
        appointment_time: '',
        notes: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [submitError, setSubmitError] = useState('');

    useEffect(() => {
        const handleScroll = () => {
            setScrollPosition(window.scrollY);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleAppointmentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSubmitError('');
        setSubmitSuccess(false);

        try {
            const response = await fetch('/appointments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN':
                        document
                            .querySelector('meta[name="csrf-token"]')
                            ?.getAttribute('content') || '',
                },
                body: JSON.stringify(appointmentForm),
            });

            const data = await response.json();

            if (response.ok) {
                setSubmitSuccess(true);
                setAppointmentForm({
                    patient_name: '',
                    patient_email: '',
                    patient_phone: '',
                    service: '',
                    appointment_date: '',
                    appointment_time: '',
                    notes: '',
                });
                setTimeout(() => setSubmitSuccess(false), 5000);
            } else {
                setSubmitError(
                    data.message ||
                    'Failed to book appointment. Please try again.',
                );
            }
        } catch (error) {
            setSubmitError(
                'Network error. Please check your connection and try again.',
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAppointmentInputChange = (
        e: React.ChangeEvent<
            HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
        >,
    ) => {
        setAppointmentForm({
            ...appointmentForm,
            [e.target.name]: e.target.value,
        });
    };

    const services = [
        {
            icon: <HeartPulse className="h-8 w-8" />,
            title: "Women's Health & Gynaecology",
            description:
                "Cervical screening, reproductive health, and women's wellness services.",
            link: '#',
            image: IMAGES.womenHealth,
        },
        {
            icon: <Baby className="h-8 w-8" />,
            title: 'Maternal & Child Health',
            description:
                'Antenatal care, delivery services, and postnatal support.',
            link: '#',
            image: IMAGES.maternity,
        },
        {
            icon: <BoneIcon className="h-8 w-8" />,
            title: 'Orthopaedics',
            description:
                'Bone and joint care, injury management, and physiotherapy.',
            link: '#',
            image: IMAGES.surgery,
        },
        {
            icon: <MicroscopeIcon className="h-8 w-8" />,
            title: 'Laboratory Services',
            description: 'Advanced diagnostics with fast, reliable results.',
            link: '#',
            image: IMAGES.laboratory,
        },
        {
            icon: <PillIcon className="h-8 w-8" />,
            title: 'Pharmacy & Medication',
            description:
                'Safe dispensing and comprehensive medication counselling.',
            link: '#',
            image: IMAGES.pharmacy,
        },
        {
            icon: <StethoscopeIcon className="h-8 w-8" />,
            title: 'Outpatient Care',
            description:
                'Specialist consultations and comprehensive follow-up care.',
            link: '#',
            image: IMAGES.consultation,
        },
    ];

    const whyChoose = [
        {
            icon: <Users className="h-6 w-6 text-[#1976D2]" />,
            title: 'Experienced Healthcare Professionals',
            description:
                'Our team of skilled doctors and nurses provide compassionate, expert care.',
        },
        {
            icon: <HeartHandshake className="h-6 w-6 text-[#00A8A8]" />,
            title: 'Patient-Centered Care',
            description:
                'We prioritize your comfort, dignity, and individual healthcare needs.',
        },
        {
            icon: <MicroscopeIcon className="h-6 w-6 text-[#1976D2]" />,
            title: 'Modern Diagnostic Technology',
            description:
                'State-of-the-art equipment for accurate diagnosis and effective treatment.',
        },
        {
            icon: <Database className="h-6 w-6 text-[#00A8A8]" />,
            title: 'Integrated Digital Health Records',
            description:
                'Secure, accessible health records for coordinated, continuous care.',
        },
        {
            icon: <DollarSign className="h-6 w-6 text-[#1976D2]" />,
            title: 'Affordable Quality Healthcare',
            description:
                'Premium healthcare services at accessible, transparent prices.',
        },
        {
            icon: <ShieldCheck className="h-6 w-6 text-[#00A8A8]" />,
            title: 'Confidential and Safe Care',
            description: 'Your privacy and safety are our highest priority.',
        },
    ];

    const womenHealthServices = [
        {
            icon: <UserRound className="h-5 w-5" />,
            label: 'Gynaecology Consultations',
        },
        {
            icon: <TestTubeIcon className="h-5 w-5" />,
            label: 'Cervical Cancer Screening',
        },
        {
            icon: <HeartPulse className="h-5 w-5" />,
            label: 'Fertility Support',
        },
        { icon: <Baby className="h-5 w-5" />, label: 'Pregnancy Care' },
        { icon: <Flower className="h-5 w-5" />, label: 'Menopause Support' },
    ];

    const digitalHealthFeatures = [
        {
            icon: <FileText className="h-5 w-5" />,
            label: 'Electronic Health Records',
        },
        {
            icon: <CalendarDays className="h-5 w-5" />,
            label: 'Online Appointments',
        },
        { icon: <MessageCircle className="h-5 w-5" />, label: 'SMS Reminders' },
        {
            icon: <PhoneCall className="h-5 w-5" />,
            label: 'WhatsApp Patient Support',
        },
        {
            icon: <Database className="h-5 w-5" />,
            label: 'Digital Laboratory Results',
        },
        {
            icon: <CreditCard className="h-5 w-5" />,
            label: 'Integrated Billing',
        },
    ];

    const stats = [
        {
            value: '10,000+',
            label: 'Happy Patients',
            icon: <Users className="h-5 w-5" />,
        },
        {
            value: '50+',
            label: 'Specialist Doctors',
            icon: <User className="h-5 w-5" />,
        },
        {
            value: '99%',
            label: 'Satisfaction Rate',
            icon: <Heart className="h-5 w-5" />,
        },
        {
            value: '24/7',
            label: 'Emergency Care',
            icon: <AmbulanceIcon className="h-5 w-5" />,
        },
    ];

    const maternityServices = [
        {
            icon: <HeartPulse className="h-6 w-6" />,
            label: 'Antenatal Clinics',
        },
        { icon: <Baby className="h-6 w-6" />, label: 'Safe Delivery Services' },
        { icon: <Heart className="h-6 w-6" />, label: 'Newborn Care' },
        { icon: <Users className="h-6 w-6" />, label: 'Postnatal Follow-up' },
    ];

    const specialtyServices = [
        {
            title: 'Surgery Services',
            description: 'Advanced surgical procedures with expert care.',
            image: IMAGES.surgery,
            link: '#',
        },
        {
            title: 'Consultation Services',
            description: 'Expert consultations across all specialties.',
            image: IMAGES.consultation,
            link: '#',
        },
        {
            title: 'Imaging & Diagnostics',
            description: 'State-of-the-art imaging for accurate diagnosis.',
            image: IMAGES.imaging,
            link: '#',
        },
        {
            title: 'Ultrasound Services',
            description: 'Advanced ultrasound imaging for precise diagnostics.',
            image: IMAGES.ultrasound,
            link: '#',
        },
        {
            title: 'Dental Care',
            description: 'Comprehensive dental services for all ages.',
            image: IMAGES.dental1,
            link: '#',
        },
        {
            title: 'Orthodontics',
            description: 'Expert orthodontic care for beautiful smiles.',
            image: IMAGES.dental2,
            link: '#',
        },
    ];

    return (
        <>
            <Head title="Altaf Memorial Hospital - Compassionate Care. Advanced Medicine.">
                <link rel="preconnect" href="https://fonts.bunny.net" />
                <link
                    href="https://fonts.bunny.net/css?family=inter:400,500,600,700|poppins:400,500,600,700"
                    rel="stylesheet"
                />
            </Head>

            <div className="min-h-screen bg-white font-['Inter'] antialiased">
                {/* Navigation */}
                <nav
                    className={`fixed top-0 z-50 w-full transition-all duration-300 ${
                        scrollPosition > 50
                            ? 'bg-white/95 shadow-lg backdrop-blur-lg'
                            : 'bg-transparent'
                    }`}
                >
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex h-16 items-center justify-between">
                            <div className="flex items-center">
                                <Link
                                    href="/"
                                    className="flex items-center gap-2"
                                >
                                    <div className="rounded-lg bg-[#1976D2] p-2 shadow-md">
                                        <Heart className="h-5 w-5 text-white" />
                                    </div>
                                    <div className="flex flex-col leading-tight">
                                        <span className="font-['Poppins'] text-xl font-bold text-[#0B3D91]">
                                            Altaf Memorial
                                        </span>
                                        <span className="text-[8px] font-medium tracking-wider text-[#1976D2] uppercase">
                                            Hospital
                                        </span>
                                    </div>
                                </Link>
                            </div>

                            <div className="hidden md:block">
                                <div className="flex items-center gap-8">
                                    <a
                                        href="#services"
                                        className="text-sm font-medium text-gray-700 transition-colors hover:text-[#1976D2]"
                                    >
                                        Services
                                    </a>
                                    <a
                                        href="#why-choose"
                                        className="text-sm font-medium text-gray-700 transition-colors hover:text-[#1976D2]"
                                    >
                                        Why Us
                                    </a>
                                    <a
                                        href="#specialties"
                                        className="text-sm font-medium text-gray-700 transition-colors hover:text-[#1976D2]"
                                    >
                                        Specialties
                                    </a>
                                    <a
                                        href="#women-health"
                                        className="text-sm font-medium text-gray-700 transition-colors hover:text-[#1976D2]"
                                    >
                                        Women's Health
                                    </a>
                                    <a
                                        href="#maternity"
                                        className="text-sm font-medium text-gray-700 transition-colors hover:text-[#1976D2]"
                                    >
                                        Maternity
                                    </a>
                                    <a
                                        href="#digital-health"
                                        className="text-sm font-medium text-gray-700 transition-colors hover:text-[#1976D2]"
                                    >
                                        Digital Health
                                    </a>
                                    <a
                                        href="#appointment"
                                        className="text-sm font-medium text-[#1976D2] transition-colors hover:text-[#0B3D91]"
                                    >
                                        Book Appointment
                                    </a>
                                    <a
                                        href="#contact"
                                        className="text-sm font-medium text-gray-700 transition-colors hover:text-[#1976D2]"
                                    >
                                        Contact
                                    </a>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                {auth.user ? (
                                    <Link
                                        href={dashboard()}
                                        className="hidden rounded-lg bg-[#1976D2] px-4 py-2 text-sm font-medium text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl md:block"
                                    >
                                        Dashboard
                                    </Link>
                                ) : (
                                    <div className="hidden items-center gap-3 md:flex">
                                        <Link
                                            href={login()}
                                            className="text-sm font-medium text-gray-700 transition-colors hover:text-[#1976D2]"
                                        >
                                            Log in
                                        </Link>
                                        {canRegister && (
                                            <Link
                                                href={register()}
                                                className="rounded-lg bg-[#1976D2] px-4 py-2 text-sm font-medium text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl"
                                            >
                                                Book Appointment
                                            </Link>
                                        )}
                                    </div>
                                )}

                                <button
                                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                                    className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 md:hidden"
                                    aria-label="Toggle menu"
                                >
                                    {isMenuOpen ? (
                                        <X className="h-5 w-5" />
                                    ) : (
                                        <Menu className="h-5 w-5" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {isMenuOpen && (
                            <div className="border-t border-gray-200 py-4 md:hidden">
                                <div className="flex flex-col gap-4">
                                    <a
                                        href="#services"
                                        className="text-sm font-medium text-gray-700 hover:text-[#1976D2]"
                                    >
                                        Services
                                    </a>
                                    <a
                                        href="#why-choose"
                                        className="text-sm font-medium text-gray-700 hover:text-[#1976D2]"
                                    >
                                        Why Us
                                    </a>
                                    <a
                                        href="#specialties"
                                        className="text-sm font-medium text-gray-700 hover:text-[#1976D2]"
                                    >
                                        Specialties
                                    </a>
                                    <a
                                        href="#women-health"
                                        className="text-sm font-medium text-gray-700 hover:text-[#1976D2]"
                                    >
                                        Women's Health
                                    </a>
                                    <a
                                        href="#maternity"
                                        className="text-sm font-medium text-gray-700 hover:text-[#1976D2]"
                                    >
                                        Maternity
                                    </a>
                                    <a
                                        href="#digital-health"
                                        className="text-sm font-medium text-gray-700 hover:text-[#1976D2]"
                                    >
                                        Digital Health
                                    </a>
                                    <a
                                        href="#appointment"
                                        className="text-sm font-medium text-[#1976D2] hover:text-[#0B3D91]"
                                    >
                                        Book Appointment
                                    </a>
                                    <a
                                        href="#contact"
                                        className="text-sm font-medium text-gray-700 hover:text-[#1976D2]"
                                    >
                                        Contact
                                    </a>
                                    {!auth.user && (
                                        <div className="flex flex-col gap-2 pt-2">
                                            <Link
                                                href={login()}
                                                className="rounded-lg border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                                            >
                                                Log in
                                            </Link>
                                            {canRegister && (
                                                <Link
                                                    href={register()}
                                                    className="rounded-lg bg-[#1976D2] px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:shadow-lg"
                                                >
                                                    Book Appointment
                                                </Link>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </nav>

                {/* Hero Section - Static Professional */}
                <section className="relative overflow-hidden pt-16">
                    <div className="relative h-[600px] w-full">
                        <img
                            src={IMAGES.hero}
                            alt="Altaf Memorial Hospital - State-of-the-Art Medical Facility"
                            className="h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent"></div>
                        <div className="absolute inset-0 flex items-center">
                            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                                <div className="max-w-3xl text-white">
                                    <div className="mb-4 inline-flex items-center rounded-full bg-[#1976D2]/80 px-4 py-1.5 text-sm font-medium backdrop-blur-sm">
                                        <Sparkles className="mr-2 h-4 w-4" />
                                        World-Class Healthcare
                                    </div>
                                    <h1 className="font-['Poppins'] text-4xl font-bold leading-tight md:text-6xl">
                                        Compassionate Care.
                                        <br />
                                        <span className="text-[#00A8A8]">
                                            Advanced Medicine.
                                        </span>
                                    </h1>
                                    <p className="mt-4 text-lg text-white/90 md:text-xl">
                                        Providing quality healthcare services
                                        with state-of-the-art technology and
                                        dedicated professionals committed to
                                        your well-being.
                                    </p>
                                    <div className="mt-8 flex flex-wrap gap-4">
                                        <Link
                                            href="#appointment"
                                            className="inline-flex items-center gap-2 rounded-lg bg-[#1976D2] px-6 py-3 text-white transition-all hover:scale-105 hover:shadow-xl"
                                        >
                                            Book Appointment
                                            <ArrowRight className="h-4 w-4" />
                                        </Link>
                                        <a
                                            href="#services"
                                            className="inline-flex items-center gap-2 rounded-lg border-2 border-white px-6 py-3 text-white transition-all hover:bg-white/10"
                                        >
                                            Explore Services
                                            <ChevronRight className="h-4 w-4" />
                                        </a>
                                    </div>
                                    <div className="mt-8 flex items-center gap-6 text-sm text-white/80">
                                        <span className="flex items-center gap-1">
                                            <CheckCircle className="h-4 w-4 text-[#00A8A8]" />
                                            24/7 Emergency Care
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <CheckCircle className="h-4 w-4 text-[#00A8A8]" />
                                            Specialist Doctors
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <CheckCircle className="h-4 w-4 text-[#00A8A8]" />
                                            Modern Technology
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Stats Section */}
                <section className="bg-white py-12">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
                            {stats.map((stat, index) => (
                                <div key={index} className="text-center">
                                    <div className="mb-2 flex justify-center">
                                        <div className="rounded-full bg-[#1976D2]/10 p-3 text-[#1976D2]">
                                            {stat.icon}
                                        </div>
                                    </div>
                                    <div className="font-['Poppins'] text-2xl font-bold text-gray-900 md:text-3xl">
                                        {stat.value}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        {stat.label}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Services Section */}
                <section id="services" className="bg-gray-50 py-16">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="mb-12 text-center">
                            <div className="inline-flex items-center rounded-full bg-[#1976D2]/10 px-4 py-1.5 text-sm font-medium text-[#1976D2]">
                                <Sparkles className="mr-2 h-4 w-4" />
                                Our Services
                            </div>
                            <h2 className="mb-4 font-['Poppins'] text-3xl font-bold text-gray-900 md:text-4xl">
                                Our Specialized Healthcare Services
                            </h2>
                            <p className="mx-auto max-w-2xl text-lg text-gray-600">
                                Comprehensive medical care across multiple
                                specialties
                            </p>
                        </div>

                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {services.map((service, index) => (
                                <div
                                    key={index}
                                    className="group overflow-hidden rounded-2xl bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
                                >
                                    <div className="relative h-48 overflow-hidden">
                                        <img
                                            src={service.image}
                                            alt={service.title}
                                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                                        <div className="absolute bottom-4 left-4">
                                            <div className="inline-flex rounded-xl bg-white/20 p-2 text-white backdrop-blur-sm">
                                                {service.icon}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-6">
                                        <h3 className="mb-2 font-['Poppins'] text-xl font-semibold text-gray-900">
                                            {service.title}
                                        </h3>
                                        <p className="text-sm text-gray-600">
                                            {service.description}
                                        </p>
                                        <a
                                            href={service.link}
                                            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[#1976D2] transition-all hover:gap-2"
                                        >
                                            Learn more
                                            <ChevronRight className="h-4 w-4" />
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Specialty Services Section */}
                <section id="specialties" className="bg-white py-16">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="mb-12 text-center">
                            <div className="inline-flex items-center rounded-full bg-[#1976D2]/10 px-4 py-1.5 text-sm font-medium text-[#1976D2]">
                                <StethoscopeIcon className="mr-2 h-4 w-4" />
                                Our Specialties
                            </div>
                            <h2 className="mb-4 font-['Poppins'] text-3xl font-bold text-gray-900 md:text-4xl">
                                Advanced Medical Specialties
                            </h2>
                            <p className="mx-auto max-w-2xl text-lg text-gray-600">
                                World-class care across all medical disciplines
                            </p>
                        </div>

                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {specialtyServices.map((specialty, index) => (
                                <div
                                    key={index}
                                    className="group relative overflow-hidden rounded-2xl shadow-md transition-all hover:shadow-xl"
                                >
                                    <div className="relative h-64 overflow-hidden">
                                        <img
                                            src={specialty.image}
                                            alt={specialty.title}
                                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
                                        <div className="absolute right-0 bottom-0 left-0 p-6">
                                            <h3 className="text-xl font-bold text-white">
                                                {specialty.title}
                                            </h3>
                                            <p className="mt-1 text-sm text-white/80">
                                                {specialty.description}
                                            </p>
                                            <a
                                                href={specialty.link}
                                                className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[#00A8A8] transition-all hover:gap-2"
                                            >
                                                Learn more
                                                <ChevronRight className="h-4 w-4" />
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Why Choose Us */}
                <section id="why-choose" className="bg-gray-50 py-16">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="mb-12 text-center">
                            <h2 className="mb-4 font-['Poppins'] text-3xl font-bold text-gray-900 md:text-4xl">
                                Why Choose Altaf Memorial Hospital
                            </h2>
                            <p className="mx-auto max-w-2xl text-lg text-gray-600">
                                Quality healthcare you can trust
                            </p>
                        </div>

                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {whyChoose.map((item, index) => (
                                <div
                                    key={index}
                                    className="flex items-start gap-4 rounded-xl bg-white p-4 shadow-sm transition-all hover:shadow-md"
                                >
                                    <div className="flex-shrink-0 rounded-lg bg-[#1976D2]/10 p-2">
                                        {item.icon}
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-900">
                                            {item.title}
                                        </h4>
                                        <p className="text-sm text-gray-600">
                                            {item.description}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Women's Health Section */}
                <section id="women-health" className="bg-white py-16">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="grid gap-12 lg:grid-cols-2">
                            <div>
                                <div className="inline-flex items-center rounded-full bg-[#1976D2]/10 px-4 py-1.5 text-sm font-medium text-[#1976D2]">
                                    <Heart className="mr-2 h-4 w-4" />
                                    Women's Health
                                </div>
                                <h2 className="mt-4 font-['Poppins'] text-3xl font-bold text-gray-900 md:text-4xl">
                                    Dedicated Women's Health Services
                                </h2>
                                <p className="mt-4 text-lg text-gray-600">
                                    From preventive screening and reproductive
                                    health to maternity care and specialist
                                    treatment, our team provides personalised
                                    support through every stage of life.
                                </p>

                                <div className="mt-6 space-y-3">
                                    {womenHealthServices.map(
                                        (service, index) => (
                                            <div
                                                key={index}
                                                className="flex items-center gap-3 rounded-lg bg-gray-50 p-3 transition-all hover:bg-[#1976D2]/5"
                                            >
                                                <div className="rounded-lg bg-[#1976D2]/10 p-2 text-[#1976D2]">
                                                    {service.icon}
                                                </div>
                                                <span className="font-medium text-gray-900">
                                                    {service.label}
                                                </span>
                                            </div>
                                        ),
                                    )}
                                </div>

                                <Link
                                    href="#appointment"
                                    className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#1976D2] px-6 py-3 text-white transition-all hover:scale-105 hover:shadow-lg"
                                >
                                    Book Women's Health Consultation
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                            </div>

                            <div className="relative flex items-center justify-center">
                                <img
                                    src={IMAGES.womenHealth}
                                    alt="Women's Health"
                                    className="h-[400px] w-full rounded-2xl object-cover shadow-lg"
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Maternity Section */}
                <section id="maternity" className="bg-gray-50 py-16">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="text-center">
                            <div className="inline-flex items-center rounded-full bg-[#00A8A8]/10 px-4 py-1.5 text-sm font-medium text-[#00A8A8]">
                                <Baby className="mr-2 h-4 w-4" />
                                Maternity Care
                            </div>
                            <h2 className="mt-4 font-['Poppins'] text-3xl font-bold text-gray-900 md:text-4xl">
                                Supporting Mothers Through Every Journey
                            </h2>
                            <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
                                Comprehensive maternity services from pregnancy
                                to postnatal care
                            </p>
                        </div>

                        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                            {maternityServices.map((service, index) => (
                                <div
                                    key={index}
                                    className="rounded-2xl bg-white p-6 text-center transition-all hover:-translate-y-1 hover:shadow-lg"
                                >
                                    <div className="mb-4 inline-flex rounded-xl bg-[#00A8A8]/10 p-3 text-[#00A8A8]">
                                        {service.icon}
                                    </div>
                                    <h4 className="font-semibold text-gray-900">
                                        {service.label}
                                    </h4>
                                </div>
                            ))}
                        </div>

                        <div className="mt-10 text-center">
                            <Link
                                href="#appointment"
                                className="inline-flex items-center gap-2 rounded-lg bg-[#00A8A8] px-6 py-3 text-white transition-all hover:scale-105 hover:shadow-lg"
                            >
                                Book Maternity Consultation
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        </div>
                    </div>
                </section>

                {/* Digital Health Section */}
                <section id="digital-health" className="bg-white py-16">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="text-center">
                            <div className="inline-flex items-center rounded-full bg-[#1976D2]/10 px-4 py-1.5 text-sm font-medium text-[#1976D2]">
                                <Smartphone className="mr-2 h-4 w-4" />
                                Digital Health
                            </div>
                            <h2 className="mt-4 font-['Poppins'] text-3xl font-bold text-gray-900 md:text-4xl">
                                Healthcare Powered by Technology
                            </h2>
                            <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
                                Modern digital solutions for better healthcare
                                delivery
                            </p>
                        </div>

                        <div className="mt-10 grid gap-4 md:grid-cols-3">
                            {digitalHealthFeatures.map((feature, index) => (
                                <div
                                    key={index}
                                    className="flex items-center gap-3 rounded-lg bg-gray-50 p-4 transition-all hover:shadow-md"
                                >
                                    <div className="rounded-lg bg-[#1976D2]/10 p-2 text-[#1976D2]">
                                        {feature.icon}
                                    </div>
                                    <span className="font-medium text-gray-900">
                                        {feature.label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Appointment Booking Section */}
                <section
                    id="appointment"
                    className="bg-gradient-to-br from-[#1976D2]/5 via-white to-[#00A8A8]/5 py-16"
                >
                    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
                        <div className="mb-10 text-center">
                            <div className="inline-flex items-center rounded-full bg-[#1976D2]/10 px-4 py-1.5 text-sm font-medium text-[#1976D2]">
                                <CalendarDays className="mr-2 h-4 w-4" />
                                Book Appointment
                            </div>
                            <h2 className="mt-4 font-['Poppins'] text-3xl font-bold text-gray-900 md:text-4xl">
                                Schedule Your Visit
                            </h2>
                            <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
                                Fill in the details below and our team will
                                confirm your appointment
                            </p>
                        </div>

                        <div className="rounded-2xl bg-white p-8 shadow-xl">
                            {submitSuccess && (
                                <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4">
                                    <div className="flex items-start gap-3">
                                        <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500" />
                                        <div>
                                            <p className="font-medium text-green-800">
                                                Appointment Request Received!
                                            </p>
                                            <p className="text-sm text-green-700">
                                                We have sent a confirmation
                                                email to you. Our team will
                                                contact you shortly to confirm
                                                your appointment.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {submitError && (
                                <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
                                    <p className="text-red-700">
                                        {submitError}
                                    </p>
                                </div>
                            )}

                            <form
                                onSubmit={handleAppointmentSubmit}
                                className="space-y-6"
                            >
                                <div className="grid gap-6 md:grid-cols-2">
                                    <div>
                                        <label
                                            htmlFor="patient_name"
                                            className="mb-1 block text-sm font-medium text-gray-700"
                                        >
                                            Full Name *
                                        </label>
                                        <input
                                            type="text"
                                            id="patient_name"
                                            name="patient_name"
                                            value={appointmentForm.patient_name}
                                            onChange={
                                                handleAppointmentInputChange
                                            }
                                            required
                                            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 transition focus:border-[#1976D2] focus:ring-2 focus:ring-[#1976D2]/20 focus:outline-none"
                                            placeholder="John Doe"
                                        />
                                    </div>
                                    <div>
                                        <label
                                            htmlFor="patient_email"
                                            className="mb-1 block text-sm font-medium text-gray-700"
                                        >
                                            Email Address *
                                        </label>
                                        <input
                                            type="email"
                                            id="patient_email"
                                            name="patient_email"
                                            value={
                                                appointmentForm.patient_email
                                            }
                                            onChange={
                                                handleAppointmentInputChange
                                            }
                                            required
                                            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 transition focus:border-[#1976D2] focus:ring-2 focus:ring-[#1976D2]/20 focus:outline-none"
                                            placeholder="john@example.com"
                                        />
                                    </div>
                                    <div>
                                        <label
                                            htmlFor="patient_phone"
                                            className="mb-1 block text-sm font-medium text-gray-700"
                                        >
                                            Phone Number *
                                        </label>
                                        <input
                                            type="tel"
                                            id="patient_phone"
                                            name="patient_phone"
                                            value={
                                                appointmentForm.patient_phone
                                            }
                                            onChange={
                                                handleAppointmentInputChange
                                            }
                                            required
                                            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 transition focus:border-[#1976D2] focus:ring-2 focus:ring-[#1976D2]/20 focus:outline-none"
                                            placeholder="+260 97X XXX XXX"
                                        />
                                    </div>
                                    <div>
                                        <label
                                            htmlFor="service"
                                            className="mb-1 block text-sm font-medium text-gray-700"
                                        >
                                            Service / Department *
                                        </label>
                                        <select
                                            id="service"
                                            name="service"
                                            value={appointmentForm.service}
                                            onChange={
                                                handleAppointmentInputChange
                                            }
                                            required
                                            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 transition focus:border-[#1976D2] focus:ring-2 focus:ring-[#1976D2]/20 focus:outline-none"
                                        >
                                            <option value="">
                                                Select a service
                                            </option>
                                            {APPOINTMENT_SERVICES.map(
                                                (service) => (
                                                    <option
                                                        key={service}
                                                        value={service}
                                                    >
                                                        {service}
                                                    </option>
                                                ),
                                            )}
                                        </select>
                                    </div>
                                    <div>
                                        <label
                                            htmlFor="appointment_date"
                                            className="mb-1 block text-sm font-medium text-gray-700"
                                        >
                                            Preferred Date *
                                        </label>
                                        <input
                                            type="date"
                                            id="appointment_date"
                                            name="appointment_date"
                                            value={
                                                appointmentForm.appointment_date
                                            }
                                            onChange={
                                                handleAppointmentInputChange
                                            }
                                            required
                                            min={
                                                new Date()
                                                    .toISOString()
                                                    .split('T')[0]
                                            }
                                            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 transition focus:border-[#1976D2] focus:ring-2 focus:ring-[#1976D2]/20 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label
                                            htmlFor="appointment_time"
                                            className="mb-1 block text-sm font-medium text-gray-700"
                                        >
                                            Preferred Time *
                                        </label>
                                        <input
                                            type="time"
                                            id="appointment_time"
                                            name="appointment_time"
                                            value={
                                                appointmentForm.appointment_time
                                            }
                                            onChange={
                                                handleAppointmentInputChange
                                            }
                                            required
                                            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 transition focus:border-[#1976D2] focus:ring-2 focus:ring-[#1976D2]/20 focus:outline-none"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label
                                        htmlFor="notes"
                                        className="mb-1 block text-sm font-medium text-gray-700"
                                    >
                                        Additional Notes (Optional)
                                    </label>
                                    <textarea
                                        id="notes"
                                        name="notes"
                                        value={appointmentForm.notes}
                                        onChange={handleAppointmentInputChange}
                                        rows={3}
                                        className="w-full resize-y rounded-lg border border-gray-300 px-4 py-2.5 transition focus:border-[#1976D2] focus:ring-2 focus:ring-[#1976D2]/20 focus:outline-none"
                                        placeholder="Any specific concerns or requirements..."
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1976D2] px-6 py-3.5 font-medium text-white transition-all hover:scale-[1.02] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <svg
                                                className="h-5 w-5 animate-spin text-white"
                                                xmlns="http://www.w3.org/2000/svg"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                            >
                                                <circle
                                                    className="opacity-25"
                                                    cx="12"
                                                    cy="12"
                                                    r="10"
                                                    stroke="currentColor"
                                                    strokeWidth="4"
                                                ></circle>
                                                <path
                                                    className="opacity-75"
                                                    fill="currentColor"
                                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                ></path>
                                            </svg>
                                            Submitting...
                                        </>
                                    ) : (
                                        <>
                                            <CalendarDays className="h-5 w-5" />
                                            Request Appointment
                                        </>
                                    )}
                                </button>

                                <p className="text-center text-sm text-gray-500">
                                    We will send a confirmation email and call
                                    you to finalize your appointment.
                                </p>
                            </form>
                        </div>
                    </div>
                </section>

                {/* Contact Section */}
                <section
                    id="contact"
                    className="bg-gradient-to-br from-[#1976D2] to-[#0B3D91] py-16"
                >
                    <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
                        <h2 className="font-['Poppins'] text-3xl font-bold text-white md:text-4xl">
                            We Are Here When You Need Us
                        </h2>
                        <p className="mt-4 text-xl text-white/90">
                            Compassionate care is just a call or click away
                        </p>

                        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                            <a
                                href="mailto:support@s4b.com"
                                className="flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-[#1976D2] transition-all hover:scale-105 hover:shadow-xl"
                            >
                                <Mail className="h-5 w-5" />
                                support@s4b.com
                            </a>
                            <a
                                href="https://wa.me/260979556699"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 rounded-lg bg-[#25D366] px-6 py-3 text-white transition-all hover:scale-105 hover:shadow-xl"
                            >
                                <MessageCircle className="h-5 w-5" />
                                Chat on WhatsApp
                            </a>
                        </div>

                        <div className="mt-6 flex flex-col items-center justify-center gap-4 sm:flex-row">
                            <Link
                                href="#appointment"
                                className="flex items-center gap-2 rounded-lg border-2 border-white px-6 py-3 text-white transition-all hover:bg-white/10"
                            >
                                <CalendarDays className="h-5 w-5" />
                                Book Appointment
                            </Link>
                            <div className="flex items-center gap-2 text-white/80">
                                <Phone className="h-5 w-5" />
                                <span>+260 979 556 699</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Footer */}
                <footer className="bg-gray-900 py-12 text-gray-400">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="grid gap-8 md:grid-cols-4">
                            <div>
                                <div className="mb-4 flex items-center gap-2">
                                    <div className="rounded-lg bg-[#1976D2] p-2">
                                        <Heart className="h-5 w-5 text-white" />
                                    </div>
                                    <div className="flex flex-col leading-tight">
                                        <span className="font-['Poppins'] text-xl font-bold text-white">
                                            Altaf Memorial
                                        </span>
                                        <span className="text-[8px] font-medium tracking-wider text-[#1976D2] uppercase">
                                            Hospital
                                        </span>
                                    </div>
                                </div>
                                <p className="mb-4 text-sm text-gray-400 italic">
                                    "Healing hearts, serving humanity"
                                </p>
                                <p className="text-sm text-gray-500">
                                    Quality healthcare for every stage of life.
                                </p>
                            </div>

                            <div>
                                <h4 className="mb-4 font-semibold text-white">
                                    Quick Links
                                </h4>
                                <ul className="space-y-2 text-sm">
                                    <li>
                                        <a
                                            href="#"
                                            className="transition-colors hover:text-white"
                                        >
                                            Home
                                        </a>
                                    </li>
                                    <li>
                                        <a
                                            href="#services"
                                            className="transition-colors hover:text-white"
                                        >
                                            Services
                                        </a>
                                    </li>
                                    <li>
                                        <a
                                            href="#specialties"
                                            className="transition-colors hover:text-white"
                                        >
                                            Specialties
                                        </a>
                                    </li>
                                    <li>
                                        <a
                                            href="#appointment"
                                            className="transition-colors hover:text-white"
                                        >
                                            Book Appointment
                                        </a>
                                    </li>
                                </ul>
                            </div>

                            <div>
                                <h4 className="mb-4 font-semibold text-white">
                                    Patient
                                </h4>
                                <ul className="space-y-2 text-sm">
                                    <li>
                                        <a
                                            href="#appointment"
                                            className="transition-colors hover:text-white"
                                        >
                                            Book Appointment
                                        </a>
                                    </li>
                                    <li>
                                        <a
                                            href="#"
                                            className="transition-colors hover:text-white"
                                        >
                                            Patient Portal
                                        </a>
                                    </li>
                                    <li>
                                        <a
                                            href="#"
                                            className="transition-colors hover:text-white"
                                        >
                                            Medical Records
                                        </a>
                                    </li>
                                    <li>
                                        <a
                                            href="#"
                                            className="transition-colors hover:text-white"
                                        >
                                            Billing
                                        </a>
                                    </li>
                                </ul>
                            </div>

                            <div>
                                <h4 className="mb-4 font-semibold text-white">
                                    Contact
                                </h4>
                                <ul className="space-y-2 text-sm">
                                    <li className="flex items-center gap-2">
                                        <Mail className="h-4 w-4" />
                                        <a
                                            href="mailto:info@altamemorial.org"
                                            className="transition-colors hover:text-white"
                                        >
                                            info@altamemorial.org
                                        </a>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Phone className="h-4 w-4" />
                                        <a
                                            href="tel:+260979556699"
                                            className="transition-colors hover:text-white"
                                        >
                                            +260 979 556 699
                                        </a>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <MapPin className="h-4 w-4" />
                                        <span>Lusaka, Zambia</span>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        <div className="mt-12 border-t border-gray-800 pt-8 text-center text-sm">
                            <p>
                                &copy; {new Date().getFullYear()} Developed by -
                                Systems for Better Health Outcomes (SBHO). All
                                rights reserved.
                            </p>
                        </div>
                    </div>
                </footer>
            </div>

            <style>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-20px); }
                }

                .animate-float {
                    animation: float 6s ease-in-out infinite;
                }

                .animate-float-delayed {
                    animation: float 6s ease-in-out 3s infinite;
                }

                .bg-grid-pattern {
                    background-image: linear-gradient(rgba(25, 118, 210, 0.05) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(25, 118, 210, 0.05) 1px, transparent 1px);
                    background-size: 50px 50px;
                }

                .transition-all {
                    transition-property: all;
                    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
                    transition-duration: 300ms;
                }

                .hover\\:scale-105:hover {
                    transform: scale(1.05);
                }

                .hover\\:-translate-y-1:hover {
                    transform: translateY(-4px);
                }

                .hover\\:gap-2:hover {
                    gap: 0.5rem;
                }

                .group:hover .group-hover\\:scale-110 {
                    transform: scale(1.1);
                }
            `}</style>
        </>
    );
}
