// pages/welcome.tsx

import { Head, Link, usePage } from '@inertiajs/react';
import { dashboard, login, register } from '@/routes';
import { useState, useEffect } from 'react';
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
} from 'lucide-react';

export default function Welcome({
    canRegister = true,
}: {
    canRegister?: boolean;
}) {
    const { auth } = usePage().props;
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [activeFaq, setActiveFaq] = useState<number | null>(null);
    const [scrollPosition, setScrollPosition] = useState(0);

    useEffect(() => {
        const handleScroll = () => {
            setScrollPosition(window.scrollY);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const toggleDarkMode = () => {
        setIsDarkMode(!isDarkMode);
        document.documentElement.classList.toggle('dark');
    };

    // Trust badges
    const trustBadges = [
        { icon: <ShieldCheck className="h-5 w-5" />, label: 'HIPAA Compliant' },
        {
            icon: <Fingerprint className="h-5 w-5" />,
            label: 'End-to-End Encryption',
        },
        { icon: <Server className="h-5 w-5" />, label: '99.9% Uptime' },
        { icon: <Network className="h-5 w-5" />, label: 'ISO 27001 Certified' },
    ];

    const features = [
        {
            icon: <Zap className="h-6 w-6" />,
            title: 'Intelligent Invoicing',
            description:
                'Generate professional, compliant invoices in seconds with automated tax calculations, insurance adjustments, and multi-payer reconciliation.',
            color: 'from-blue-500 to-cyan-500',
            metric: '75% faster billing',
        },
        {
            icon: <Shield className="h-6 w-6" />,
            title: 'Enterprise-Grade Security',
            description:
                'HIPAA-compliant with end-to-end AES-256 encryption, role-based access control, and comprehensive audit trails for complete data protection.',
            color: 'from-green-500 to-emerald-500',
            metric: '100% data protection',
        },
        {
            icon: <CreditCard className="h-6 w-6" />,
            title: 'Unified Payments',
            description:
                'Accept all payment methods—cash, card, mobile money, and insurance claims—with automated reconciliation and real-time settlement tracking.',
            color: 'from-purple-500 to-pink-500',
            metric: '40% faster payments',
        },
        {
            icon: <BarChart3 className="h-6 w-6" />,
            title: 'Predictive Analytics',
            description:
                'Gain actionable insights with AI-driven revenue forecasting, payment trend analysis, and comprehensive financial performance dashboards.',
            color: 'from-orange-500 to-red-500',
            metric: '30% revenue growth',
        },
        {
            icon: <Users className="h-6 w-6" />,
            title: 'Comprehensive Patient Management',
            description:
                'Maintain complete patient histories, insurance verification, consent forms, and billing records in a unified, accessible platform.',
            color: 'from-indigo-500 to-purple-500',
            metric: '100% patient data access',
        },
        {
            icon: <FileText className="h-6 w-6" />,
            title: 'Intelligent Claims Management',
            description:
                'Submit, track, and optimize insurance claims with automated validation, reducing denials by up to 40% and accelerating reimbursement cycles.',
            color: 'from-teal-500 to-cyan-500',
            metric: '40% fewer denials',
        },
        {
            icon: <Clock className="h-6 w-6" />,
            title: 'Smart Payment Orchestration',
            description:
                'Automated payment reminders, flexible payment plans, and real-time status updates—reducing late payments by over 60%.',
            color: 'from-yellow-500 to-orange-500',
            metric: '60% less late payments',
        },
        {
            icon: <Database className="h-6 w-6" />,
            title: 'Integrated Inventory Management',
            description:
                'Seamlessly track medical supplies, automatically link consumables to patient billing, and maintain optimal stock levels with predictive alerts.',
            color: 'from-blue-500 to-indigo-500',
            metric: '20% inventory savings',
        },
    ];

    const stats = [
        {
            value: '10,000+',
            label: 'Healthcare Providers',
            icon: <Users className="h-5 w-5" />,
        },
        {
            value: '₦50M+',
            label: 'Processed Daily',
            icon: <DollarSign className="h-5 w-5" />,
        },
        {
            value: '99.9%',
            label: 'Uptime Guarantee',
            icon: <Cloud className="h-5 w-5" />,
        },
        {
            value: '24/7',
            label: 'Enterprise Support',
            icon: <HeadphonesIcon className="h-5 w-5" />,
        },
    ];

    const testimonials = [
        {
            name: 'Dr. Sarah Johnson',
            role: 'Medical Director, City Hospital',
            content:
                "EasyBill has transformed our billing operations. We've reduced claim denials by 42% and improved cash flow by 35% within the first quarter.",
            rating: 5,
            image: '/avatars/doctor1.jpg',
        },
        {
            name: 'Michael Okonkwo',
            role: 'Practice Manager, HealthFirst Clinic',
            content:
                'The insurance claim automation alone saves us 15 hours per week. The intuitive interface has reduced staff training time by 60%.',
            rating: 5,
            image: '/avatars/manager1.jpg',
        },
        {
            name: 'Dr. Amina Mohammed',
            role: 'Owner, Family Care Center',
            content:
                "Best investment we've made. The real-time analytics help us make data-driven decisions that have improved our bottom line by 25%.",
            rating: 5,
            image: '/avatars/doctor2.jpg',
        },
    ];

    const pricingPlans = [
        {
            name: 'Starter',
            price: '₦29,999',
            period: '/month',
            description: 'For small practices starting out',
            features: [
                'Up to 500 patients',
                'Basic invoicing & billing',
                'Multi-payment processing',
                'Email support',
                'Standard reports',
                'Patient portal',
            ],
            limitations: [
                'No insurance claims',
                'No inventory management',
                'No API access',
            ],
            buttonText: 'Start Free Trial',
            popular: false,
        },
        {
            name: 'Professional',
            price: '₦79,999',
            period: '/month',
            description: 'For growing healthcare practices',
            features: [
                'Unlimited patients',
                'Advanced invoicing & billing',
                'Insurance claims management',
                'Priority support (SLA)',
                'Advanced analytics & forecasting',
                'Full inventory management',
                'SMS & email automation',
                'API integration',
            ],
            limitations: [],
            buttonText: 'Start Free Trial',
            popular: true,
        },
        {
            name: 'Enterprise',
            price: 'Custom',
            period: '',
            description: 'For large hospitals & groups',
            features: [
                'Everything in Professional',
                'Multi-location & multi-entity',
                'Custom integrations & workflows',
                'Dedicated account manager',
                '99.95% SLA guarantee',
                'On-premise deployment',
                'Full API access & webhooks',
                'Advanced security & compliance',
            ],
            limitations: [],
            buttonText: 'Contact Enterprise Sales',
            popular: false,
        },
    ];

    const faqs = [
        {
            question: 'Is EasyBill HIPAA compliant and secure?',
            answer: 'Yes, EasyBill is fully HIPAA compliant and undergoes regular third-party security audits. We implement end-to-end AES-256 encryption, multi-factor authentication, role-based access control, and maintain comprehensive audit logs. Our infrastructure is hosted on SOC 2 Type II certified data centers with 99.9% uptime SLA.',
        },
        {
            question: 'Can EasyBill handle insurance claims processing?',
            answer: 'Absolutely. EasyBill provides end-to-end insurance claims management including automated eligibility verification, electronic submission, real-time status tracking, and automated denial management. We integrate with over 200 insurance providers and support all major claim formats.',
        },
        {
            question: 'What is the implementation timeline?',
            answer: 'Most practices are fully operational within 24-48 hours. Our dedicated onboarding team provides personalized training, data migration support, and workflow optimization to ensure a seamless transition. We also offer dedicated implementation managers for enterprise clients.',
        },
        {
            question: 'Do you offer a free trial?',
            answer: 'Yes, we offer a comprehensive 14-day free trial with full access to all features, including premium support and dedicated onboarding. No credit card required, and you can cancel at any time with no obligations.',
        },
        {
            question: 'What about mobile accessibility?',
            answer: 'EasyBill is fully responsive and accessible from any device. We also offer dedicated mobile applications for iOS and Android with offline capabilities, allowing your team to bill and manage patients from anywhere, anytime.',
        },
    ];

    return (
        <>
            <Head title="EasyBill - Enterprise Healthcare Billing Platform">
                <link rel="preconnect" href="https://fonts.bunny.net" />
                <link
                    href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600,700"
                    rel="stylesheet"
                />
            </Head>

            <div
                className={`min-h-screen bg-white font-['instrument-sans'] dark:bg-gray-900 ${isDarkMode ? 'dark' : ''}`}
            >
                {/* Navigation */}
                <nav
                    className={`fixed top-0 z-50 w-full transition-all duration-300 ${
                        scrollPosition > 50
                            ? 'bg-white/95 shadow-lg backdrop-blur-lg dark:bg-gray-900/95'
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
                                    <div className="rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 p-2 shadow-md">
                                        <DollarSign className="h-5 w-5 text-white" />
                                    </div>
                                    <span className="text-xl font-bold text-gray-900 dark:text-white">
                                        Easy
                                        <span className="text-blue-600">
                                            Bill
                                        </span>
                                    </span>
                                </Link>
                            </div>

                            <div className="hidden md:block">
                                <div className="flex items-center gap-8">
                                    <a
                                        href="#features"
                                        className="text-sm font-medium text-gray-700 transition-colors hover:text-blue-600 dark:text-gray-300"
                                    >
                                        Features
                                    </a>
                                    <a
                                        href="#pricing"
                                        className="text-sm font-medium text-gray-700 transition-colors hover:text-blue-600 dark:text-gray-300"
                                    >
                                        Pricing
                                    </a>
                                    <a
                                        href="#testimonials"
                                        className="text-sm font-medium text-gray-700 transition-colors hover:text-blue-600 dark:text-gray-300"
                                    >
                                        Testimonials
                                    </a>
                                    <a
                                        href="#faq"
                                        className="text-sm font-medium text-gray-700 transition-colors hover:text-blue-600 dark:text-gray-300"
                                    >
                                        FAQ
                                    </a>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <button
                                    onClick={toggleDarkMode}
                                    className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                                    aria-label="Toggle dark mode"
                                >
                                    {isDarkMode ? (
                                        <Sun className="h-5 w-5" />
                                    ) : (
                                        <Moon className="h-5 w-5" />
                                    )}
                                </button>

                                {auth.user ? (
                                    <Link
                                        href={dashboard()}
                                        className="hidden rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl md:block"
                                    >
                                        Dashboard
                                    </Link>
                                ) : (
                                    <div className="hidden items-center gap-3 md:flex">
                                        <Link
                                            href={login()}
                                            className="text-sm font-medium text-gray-700 transition-colors hover:text-blue-600 dark:text-gray-300"
                                        >
                                            Log in
                                        </Link>
                                        {canRegister && (
                                            <Link
                                                href={register()}
                                                className="rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl"
                                            >
                                                Start free trial
                                            </Link>
                                        )}
                                    </div>
                                )}

                                <button
                                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                                    className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 md:hidden dark:text-gray-300 dark:hover:bg-gray-800"
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
                            <div className="border-t border-gray-200 py-4 md:hidden dark:border-gray-700">
                                <div className="flex flex-col gap-4">
                                    <a
                                        href="#features"
                                        className="text-sm font-medium text-gray-700 hover:text-blue-600 dark:text-gray-300"
                                    >
                                        Features
                                    </a>
                                    <a
                                        href="#pricing"
                                        className="text-sm font-medium text-gray-700 hover:text-blue-600 dark:text-gray-300"
                                    >
                                        Pricing
                                    </a>
                                    <a
                                        href="#testimonials"
                                        className="text-sm font-medium text-gray-700 hover:text-blue-600 dark:text-gray-300"
                                    >
                                        Testimonials
                                    </a>
                                    <a
                                        href="#faq"
                                        className="text-sm font-medium text-gray-700 hover:text-blue-600 dark:text-gray-300"
                                    >
                                        FAQ
                                    </a>
                                    {!auth.user && (
                                        <div className="flex flex-col gap-2 pt-2">
                                            <Link
                                                href={login()}
                                                className="rounded-lg border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300"
                                            >
                                                Log in
                                            </Link>
                                            {canRegister && (
                                                <Link
                                                    href={register()}
                                                    className="rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:shadow-lg"
                                                >
                                                    Start free trial
                                                </Link>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </nav>

                {/* Hero Section */}
                <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50 pt-32 pb-20 lg:pt-40 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
                    <div className="bg-grid-pattern absolute inset-0 opacity-5"></div>

                    <div className="animate-float absolute top-20 left-0 h-64 w-64 rounded-full bg-blue-200 opacity-20 blur-3xl"></div>
                    <div className="animate-float-delayed absolute right-0 bottom-20 h-64 w-64 rounded-full bg-indigo-200 opacity-20 blur-3xl"></div>

                    <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="grid items-center gap-12 lg:grid-cols-2">
                            {/* Left column */}
                            <div className="text-center lg:text-left">
                                <div className="mb-6 inline-flex items-center rounded-full bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                    <Sparkles className="mr-2 h-4 w-4" />
                                    Trusted by 10,000+ healthcare providers
                                </div>

                                <h1 className="mb-6 text-4xl leading-tight font-bold text-gray-900 lg:text-5xl xl:text-6xl dark:text-white">
                                    Enterprise-Grade Billing for{' '}
                                    <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                                        Modern Healthcare
                                    </span>
                                </h1>

                                <p className="mb-8 text-lg text-gray-600 lg:text-xl dark:text-gray-300">
                                    Accelerate your revenue cycle, reduce
                                    administrative overhead, and improve
                                    financial outcomes with the most
                                    comprehensive healthcare billing platform.
                                </p>

                                <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center lg:justify-start">
                                    <Link
                                        href={register()}
                                        className="group flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-4 text-lg font-medium text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl sm:w-auto"
                                    >
                                        Start free trial
                                        <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                                    </Link>

                                    <button className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-gray-300 px-8 py-4 text-lg font-medium text-gray-700 transition-all hover:bg-gray-50 sm:w-auto dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800">
                                        <Play className="h-5 w-5" />
                                        Watch demo
                                    </button>
                                </div>

                                <div className="mt-8 flex flex-wrap items-center justify-center gap-6 lg:justify-start">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="h-5 w-5 text-green-500" />
                                        <span className="text-sm text-gray-600 dark:text-gray-400">
                                            No credit card required
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="h-5 w-5 text-green-500" />
                                        <span className="text-sm text-gray-600 dark:text-gray-400">
                                            14-day free trial
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="h-5 w-5 text-green-500" />
                                        <span className="text-sm text-gray-600 dark:text-gray-400">
                                            Cancel anytime
                                        </span>
                                    </div>
                                </div>

                                {/* Trust Badges */}
                                <div className="mt-8 flex flex-wrap items-center gap-4">
                                    {trustBadges.map((badge, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400"
                                        >
                                            <span className="text-blue-600 dark:text-blue-400">
                                                {badge.icon}
                                            </span>
                                            <span>{badge.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Right column - Dashboard preview */}
                            <div className="relative">
                                <div className="relative rounded-2xl bg-white p-2 shadow-2xl dark:bg-gray-800">
                                    <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 opacity-20 blur"></div>
                                    <div className="relative rounded-xl bg-white p-4 dark:bg-gray-800">
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-3 w-3 rounded-full bg-red-500"></div>
                                                    <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                                                    <div className="h-3 w-3 rounded-full bg-green-500"></div>
                                                </div>
                                                <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                                    Practice Overview
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-3 gap-2">
                                                <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
                                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                                        Revenue
                                                    </div>
                                                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                                                        ₦1.2M
                                                    </div>
                                                </div>
                                                <div className="rounded-lg bg-green-50 p-3 dark:bg-green-900/20">
                                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                                        Patients
                                                    </div>
                                                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                                                        87
                                                    </div>
                                                </div>
                                                <div className="rounded-lg bg-purple-50 p-3 dark:bg-purple-900/20">
                                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                                        Pending
                                                    </div>
                                                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                                                        ₦450K
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="text-gray-600 dark:text-gray-400">
                                                        Today's collections
                                                    </span>
                                                    <span className="font-medium text-gray-900 dark:text-white">
                                                        ₦850,000
                                                    </span>
                                                </div>
                                                <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700">
                                                    <div className="h-2 w-3/4 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600"></div>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="text-gray-600 dark:text-gray-400">
                                                        Insurance claims
                                                    </span>
                                                    <span className="font-medium text-gray-900 dark:text-white">
                                                        ₦320,000
                                                    </span>
                                                </div>
                                                <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700">
                                                    <div className="h-2 w-1/2 rounded-full bg-gradient-to-r from-purple-600 to-pink-500"></div>
                                                </div>
                                            </div>

                                            <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                                                <div className="mb-2 flex items-center justify-between">
                                                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                        Recent invoices
                                                    </span>
                                                    <span className="text-xs text-blue-600">
                                                        View all
                                                    </span>
                                                </div>
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between text-sm">
                                                        <span className="text-gray-600 dark:text-gray-400">
                                                            John Smith
                                                        </span>
                                                        <span className="font-medium text-gray-900 dark:text-white">
                                                            ₦25,000
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between text-sm">
                                                        <span className="text-gray-600 dark:text-gray-400">
                                                            Sarah Johnson
                                                        </span>
                                                        <span className="font-medium text-gray-900 dark:text-white">
                                                            ₦45,000
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="absolute -top-4 -left-4 rounded-lg bg-white p-3 shadow-lg dark:bg-gray-800">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="h-5 w-5 text-green-500" />
                                        <span className="text-sm font-medium">
                                            Insurance approved
                                        </span>
                                    </div>
                                </div>
                                <div className="absolute -right-4 -bottom-4 rounded-lg bg-white p-3 shadow-lg dark:bg-gray-800">
                                    <div className="flex items-center gap-2">
                                        <TrendingUp className="h-5 w-5 text-blue-500" />
                                        <span className="text-sm font-medium">
                                            +32% this month
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Stats Section */}
                <section className="bg-white py-16 dark:bg-gray-900">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
                            {stats.map((stat, index) => (
                                <div key={index} className="text-center">
                                    <div className="mb-2 flex justify-center">
                                        <div className="rounded-full bg-blue-100 p-3 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                                            {stat.icon}
                                        </div>
                                    </div>
                                    <div className="text-2xl font-bold text-gray-900 md:text-3xl dark:text-white">
                                        {stat.value}
                                    </div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                        {stat.label}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Features Section */}
                <section
                    id="features"
                    className="bg-gray-50 py-16 dark:bg-gray-800"
                >
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="mb-12 text-center">
                            <div className="inline-flex items-center rounded-full bg-blue-100 px-4 py-1.5 text-sm font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                <Sparkles className="mr-2 h-4 w-4" />
                                Platform Capabilities
                            </div>
                            <h2 className="mb-4 text-3xl font-bold text-gray-900 md:text-4xl dark:text-white">
                                Everything you need to{' '}
                                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                                    optimize revenue
                                </span>
                            </h2>
                            <p className="mx-auto max-w-2xl text-lg text-gray-600 dark:text-gray-400">
                                Enterprise-grade features designed to streamline
                                billing, accelerate payments, and improve
                                financial outcomes.
                            </p>
                        </div>

                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                            {features.map((feature, index) => (
                                <div
                                    key={index}
                                    className="group relative rounded-2xl bg-white p-6 shadow-sm transition-all hover:shadow-xl dark:bg-gray-900"
                                >
                                    <div
                                        className={`mb-4 inline-flex rounded-lg bg-gradient-to-r ${feature.color} p-3 text-white shadow-md`}
                                    >
                                        {feature.icon}
                                    </div>
                                    <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                                        {feature.title}
                                    </h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        {feature.description}
                                    </p>
                                    <div className="mt-4 flex items-center gap-2 text-xs font-medium text-blue-600 dark:text-blue-400">
                                        <span>{feature.metric}</span>
                                        <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* How It Works */}
                <section className="bg-white py-16 dark:bg-gray-900">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="mb-12 text-center">
                            <h2 className="mb-4 text-3xl font-bold text-gray-900 md:text-4xl dark:text-white">
                                Implementation Journey
                            </h2>
                            <p className="mx-auto max-w-2xl text-lg text-gray-600 dark:text-gray-400">
                                Three simple phases to transform your billing
                                operations
                            </p>
                        </div>

                        <div className="grid gap-8 md:grid-cols-3">
                            {[
                                {
                                    step: '01',
                                    title: 'Connect & Configure',
                                    description:
                                        'Import patient data, configure payment systems, and customize your workflow in minutes with our guided onboarding.',
                                    icon: <Database className="h-8 w-8" />,
                                },
                                {
                                    step: '02',
                                    title: 'Bill & Manage',
                                    description:
                                        'Create and send compliant invoices with automated validation, multi-payer reconciliation, and real-time tracking.',
                                    icon: <FileText className="h-8 w-8" />,
                                },
                                {
                                    step: '03',
                                    title: 'Optimize & Grow',
                                    description:
                                        'Leverage predictive analytics, automated collections, and actionable insights to drive revenue growth.',
                                    icon: <DollarSign className="h-8 w-8" />,
                                },
                            ].map((item, index) => (
                                <div
                                    key={index}
                                    className="relative text-center"
                                >
                                    <div className="mb-6 flex justify-center">
                                        <div className="relative">
                                            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg">
                                                {item.icon}
                                            </div>
                                            {index < 2 && (
                                                <div className="absolute top-1/2 left-full hidden w-full -translate-y-1/2 md:block">
                                                    <div className="h-0.5 w-full bg-gradient-to-r from-blue-600 to-indigo-600"></div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="mb-2 text-sm font-semibold text-blue-600">
                                        Phase {item.step}
                                    </div>
                                    <h3 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
                                        {item.title}
                                    </h3>
                                    <p className="text-gray-600 dark:text-gray-400">
                                        {item.description}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Testimonials */}
                <section
                    id="testimonials"
                    className="bg-gray-50 py-16 dark:bg-gray-800"
                >
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="mb-12 text-center">
                            <h2 className="mb-4 text-3xl font-bold text-gray-900 md:text-4xl dark:text-white">
                                Trusted by industry leaders
                            </h2>
                            <p className="mx-auto max-w-2xl text-lg text-gray-600 dark:text-gray-400">
                                Healthcare providers across Africa trust
                                EasyBill for their billing operations
                            </p>
                        </div>

                        <div className="grid gap-6 md:grid-cols-3">
                            {testimonials.map((testimonial, index) => (
                                <div
                                    key={index}
                                    className="rounded-2xl bg-white p-6 shadow-sm transition-all hover:shadow-lg dark:bg-gray-900"
                                >
                                    <div className="mb-4 flex gap-1">
                                        {[...Array(testimonial.rating)].map(
                                            (_, i) => (
                                                <Star
                                                    key={i}
                                                    className="h-5 w-5 fill-yellow-400 text-yellow-400"
                                                />
                                            ),
                                        )}
                                    </div>
                                    <p className="mb-6 text-gray-700 dark:text-gray-300">
                                        "{testimonial.content}"
                                    </p>
                                    <div className="flex items-center gap-3">
                                        <div className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600"></div>
                                        <div>
                                            <div className="font-semibold text-gray-900 dark:text-white">
                                                {testimonial.name}
                                            </div>
                                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                                {testimonial.role}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Pricing */}
                <section
                    id="pricing"
                    className="bg-white py-16 dark:bg-gray-900"
                >
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="mb-12 text-center">
                            <h2 className="mb-4 text-3xl font-bold text-gray-900 md:text-4xl dark:text-white">
                                Transparent, enterprise pricing
                            </h2>
                            <p className="mx-auto max-w-2xl text-lg text-gray-600 dark:text-gray-400">
                                Choose the plan that scales with your practice
                            </p>
                        </div>

                        <div className="grid gap-8 lg:grid-cols-3">
                            {pricingPlans.map((plan, index) => (
                                <div
                                    key={index}
                                    className={`relative rounded-2xl p-8 transition-all hover:shadow-xl ${
                                        plan.popular
                                            ? 'border-2 border-blue-600 shadow-xl dark:border-blue-500'
                                            : 'border border-gray-200 dark:border-gray-700'
                                    }`}
                                >
                                    {plan.popular && (
                                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-1 text-sm font-medium text-white shadow-md">
                                            Most Popular
                                        </div>
                                    )}

                                    <div className="mb-6">
                                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                            {plan.name}
                                        </h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            {plan.description}
                                        </p>
                                    </div>

                                    <div className="mb-6">
                                        <span className="text-4xl font-bold text-gray-900 dark:text-white">
                                            {plan.price}
                                        </span>
                                        <span className="text-gray-600 dark:text-gray-400">
                                            {plan.period}
                                        </span>
                                    </div>

                                    <ul className="mb-6 space-y-3">
                                        {plan.features.map((feature, i) => (
                                            <li
                                                key={i}
                                                className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                                            >
                                                <CheckCircle className="h-4 w-4 text-green-500" />
                                                {feature}
                                            </li>
                                        ))}
                                        {plan.limitations.map(
                                            (limitation, i) => (
                                                <li
                                                    key={i}
                                                    className="flex items-center gap-2 text-sm text-gray-400"
                                                >
                                                    <X className="h-4 w-4" />
                                                    {limitation}
                                                </li>
                                            ),
                                        )}
                                    </ul>

                                    <button
                                        className={`w-full rounded-lg py-3 font-medium transition-all ${
                                            plan.popular
                                                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg hover:scale-105 hover:shadow-xl'
                                                : 'border-2 border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800'
                                        }`}
                                    >
                                        {plan.buttonText}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* FAQ */}
                <section id="faq" className="bg-gray-50 py-16 dark:bg-gray-800">
                    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
                        <div className="mb-12 text-center">
                            <h2 className="mb-4 text-3xl font-bold text-gray-900 md:text-4xl dark:text-white">
                                Frequently asked questions
                            </h2>
                            <p className="text-lg text-gray-600 dark:text-gray-400">
                                Everything you need to know about EasyBill
                            </p>
                        </div>

                        <div className="space-y-4">
                            {faqs.map((faq, index) => (
                                <div
                                    key={index}
                                    className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
                                >
                                    <button
                                        onClick={() =>
                                            setActiveFaq(
                                                activeFaq === index
                                                    ? null
                                                    : index,
                                            )
                                        }
                                        className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                                    >
                                        <span className="font-medium text-gray-900 dark:text-white">
                                            {faq.question}
                                        </span>
                                        <ChevronRight
                                            className={`h-5 w-5 text-gray-500 transition-transform ${
                                                activeFaq === index
                                                    ? 'rotate-90'
                                                    : ''
                                            }`}
                                        />
                                    </button>
                                    {activeFaq === index && (
                                        <div className="border-t border-gray-200 p-4 text-gray-600 dark:border-gray-700 dark:text-gray-400">
                                            {faq.answer}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="bg-gradient-to-r from-blue-600 to-indigo-600 py-16">
                    <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
                        <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">
                            Ready to transform your billing operations?
                        </h2>
                        <p className="mb-8 text-xl text-white/90">
                            Join thousands of healthcare providers who trust
                            EasyBill to optimize their revenue cycle
                        </p>
                        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                            <Link
                                href={register()}
                                className="group flex items-center gap-2 rounded-lg bg-white px-8 py-4 text-lg font-medium text-blue-600 shadow-lg transition-all hover:scale-105 hover:shadow-xl"
                            >
                                Start your free trial
                                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                            </Link>
                            <button className="flex items-center gap-2 rounded-lg border-2 border-white px-8 py-4 text-lg font-medium text-white transition-all hover:bg-white/10">
                                Contact enterprise sales
                            </button>
                        </div>
                        <p className="mt-4 text-sm text-white/80">
                            No credit card required • 14-day free trial •
                            Dedicated onboarding support
                        </p>
                    </div>
                </section>

                {/* Footer */}
                <footer className="bg-gray-900 py-12 text-gray-400">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="grid gap-8 md:grid-cols-4">
                            <div>
                                <div className="mb-4 flex items-center gap-2">
                                    <div className="rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 p-2">
                                        <DollarSign className="h-5 w-5 text-white" />
                                    </div>
                                    <span className="text-xl font-bold text-white">
                                        EasyBill
                                    </span>
                                </div>
                                <p className="mb-4 text-sm">
                                    Enterprise healthcare billing platform.
                                    Simplify billing, accelerate payments, and
                                    optimize revenue cycles.
                                </p>
                                <div className="flex gap-4">
                                    <a
                                        href="#"
                                        className="transition-colors hover:text-white"
                                    >
                                        📘
                                    </a>
                                    <a
                                        href="#"
                                        className="transition-colors hover:text-white"
                                    >
                                        🐦
                                    </a>
                                    <a
                                        href="#"
                                        className="transition-colors hover:text-white"
                                    >
                                        📷
                                    </a>
                                    <a
                                        href="#"
                                        className="transition-colors hover:text-white"
                                    >
                                        💼
                                    </a>
                                </div>
                            </div>

                            <div>
                                <h4 className="mb-4 font-semibold text-white">
                                    Product
                                </h4>
                                <ul className="space-y-2 text-sm">
                                    <li>
                                        <a
                                            href="#features"
                                            className="transition-colors hover:text-white"
                                        >
                                            Features
                                        </a>
                                    </li>
                                    <li>
                                        <a
                                            href="#pricing"
                                            className="transition-colors hover:text-white"
                                        >
                                            Pricing
                                        </a>
                                    </li>
                                    <li>
                                        <a
                                            href="#"
                                            className="transition-colors hover:text-white"
                                        >
                                            Security
                                        </a>
                                    </li>
                                    <li>
                                        <a
                                            href="#"
                                            className="transition-colors hover:text-white"
                                        >
                                            API
                                        </a>
                                    </li>
                                </ul>
                            </div>

                            <div>
                                <h4 className="mb-4 font-semibold text-white">
                                    Company
                                </h4>
                                <ul className="space-y-2 text-sm">
                                    <li>
                                        <a
                                            href="#"
                                            className="transition-colors hover:text-white"
                                        >
                                            About
                                        </a>
                                    </li>
                                    <li>
                                        <a
                                            href="#"
                                            className="transition-colors hover:text-white"
                                        >
                                            Careers
                                        </a>
                                    </li>
                                    <li>
                                        <a
                                            href="#"
                                            className="transition-colors hover:text-white"
                                        >
                                            Contact
                                        </a>
                                    </li>
                                    <li>
                                        <a
                                            href="#"
                                            className="transition-colors hover:text-white"
                                        >
                                            Blog
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
                                            href="mailto:support@easybill.com"
                                            className="transition-colors hover:text-white"
                                        >
                                            support@easybill.com
                                        </a>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Phone className="h-4 w-4" />
                                        <a
                                            href="tel:+234123456789"
                                            className="transition-colors hover:text-white"
                                        >
                                            +234 123 456 789
                                        </a>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <MapPin className="h-4 w-4" />
                                        <span>Lagos, Nigeria</span>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        <div className="mt-12 border-t border-gray-800 pt-8 text-center text-sm">
                            <p>
                                &copy; {new Date().getFullYear()} EasyBill. All
                                rights reserved. HIPAA compliant.
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
                    background-image: linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px);
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
            `}</style>
        </>
    );
}
