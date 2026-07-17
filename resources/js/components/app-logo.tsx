// components/app-logo.tsx

import React from 'react';
import { Link } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { HeartPulse, Hospital, Syringe, Activity } from 'lucide-react';

interface AppLogoProps {
    href?: string;
    showText?: boolean;
    size?: 'sm' | 'md' | 'lg';
    variant?: 'default' | 'minimal' | 'expanded';
    className?: string;
}

export function AppLogo({
    href = '/dashboard',
    showText = true,
    size = 'md',
    variant = 'default',
    className = ''
}: AppLogoProps) {

    // Size mappings
    const sizes = {
        sm: {
            icon: 'h-8 w-8',
            text: 'text-lg',
            subtext: 'text-[10px]',
            container: 'h-8 w-8',
        },
        md: {
            icon: 'h-10 w-10',
            text: 'text-xl',
            subtext: 'text-xs',
            container: 'h-10 w-10',
        },
        lg: {
            icon: 'h-12 w-12',
            text: 'text-2xl',
            subtext: 'text-sm',
            container: 'h-12 w-12',
        },
    };

    const selectedSize = sizes[size];

    // Animation variants
    const logoVariants = {
        initial: { scale: 0.9, opacity: 0 },
        animate: {
            scale: 1,
            opacity: 1,
            transition: {
                duration: 0.5,
                ease: [0.4, 0, 0.2, 1],
            }
        },
        hover: {
            scale: 1.05,
            transition: {
                duration: 0.2,
                ease: "easeInOut",
            }
        },
        tap: {
            scale: 0.95,
        }
    };

    const textVariants = {
        initial: { x: -10, opacity: 0 },
        animate: {
            x: 0,
            opacity: 1,
            transition: {
                delay: 0.2,
                duration: 0.4,
                ease: "easeOut",
            }
        },
    };

    const pulseVariants = {
        initial: { opacity: 0.5, scale: 1 },
        animate: {
            opacity: [0.5, 0.8, 0.5],
            scale: [1, 1.2, 1],
            transition: {
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
            }
        }
    };

    // Logo SVG Components
    const LogoIcon = () => (
        <svg
            width="100%"
            height="100%"
            viewBox="0 0 40 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full"
        >
            {/* Background with gradient */}
            <defs>
                <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#06b6d4" />
                    <stop offset="50%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>

                <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#0f172a" />
                    <stop offset="100%" stopColor="#020617" />
                </linearGradient>

                <filter id="glow">
                    <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                    <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                </filter>
            </defs>

            {/* Outer circle with glass effect */}
            <circle
                cx="20"
                cy="20"
                r="19"
                fill="url(#bgGradient)"
                stroke="url(#logoGradient)"
                strokeWidth="1.5"
                className="opacity-90"
                filter="url(#glow)"
            />

            {/* Inner medical cross with animation */}
            <g className="animate-pulse-slow">
                {/* Vertical line */}
                <rect
                    x="18"
                    y="10"
                    width="4"
                    height="20"
                    fill="url(#logoGradient)"
                    rx="2"
                />
                {/* Horizontal line */}
                <rect
                    x="10"
                    y="18"
                    width="20"
                    height="4"
                    fill="url(#logoGradient)"
                    rx="2"
                />
            </g>

            {/* Heart beat line */}
            <path
                d="M8 22 L14 22 L16 18 L20 26 L24 18 L26 22 L32 22"
                stroke="url(#logoGradient)"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="animate-draw"
            />

            {/* Decorative dots */}
            <circle cx="14" cy="22" r="1.5" fill="#06b6d4" className="animate-pulse" />
            <circle cx="20" cy="22" r="1.5" fill="#3b82f6" className="animate-pulse delay-150" />
            <circle cx="26" cy="22" r="1.5" fill="#8b5cf6" className="animate-pulse delay-300" />
        </svg>
    );

    // Alternative minimal icon (for collapsed sidebar)
    const MinimalIcon = () => (
        <div className="relative">
            {/* Animated background pulse */}
            <motion.div
                variants={pulseVariants}
                initial="initial"
                animate="animate"
                className="absolute inset-0 bg-gradient-to-r from-cyan-500/30 to-blue-500/30 rounded-lg blur-xl"
            />

            <div className="relative flex items-center justify-center w-full h-full bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg shadow-xl">
                <Activity className="w-1/2 h-1/2 text-white" strokeWidth={2.5} />
            </div>
        </div>
    );

    // Medical badge indicator
    const MedicalBadge = () => (
        <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1"
        >
            <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
            </span>
        </motion.div>
    );

    const content = (
        <div className={`flex items-center gap-3 group ${className}`}>
            {/* Logo container with enhanced effects */}
            <motion.div
                variants={logoVariants}
                initial="initial"
                animate="animate"
                whileHover="hover"
                whileTap="tap"
                className={`relative ${selectedSize.container} flex-shrink-0`}
            >
                {/* Multiple glow layers */}
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-lg blur-2xl group-hover:blur-3xl transition-all duration-500" />
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/30 to-blue-500/30 rounded-lg blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                {/* Logo */}
                <div className={`relative ${selectedSize.icon}`}>
                    {variant === 'minimal' ? <MinimalIcon /> : <LogoIcon />}
                </div>

                {/* Medical indicator for active status */}
                <MedicalBadge />
            </motion.div>

            {/* Text section with medical typography */}
            {showText && (
                <motion.div
                    variants={textVariants}
                    initial="initial"
                    animate="animate"
                    className="flex flex-col"
                >
                    <div className="flex items-center gap-1.5">
                        <motion.span
                            className={`font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent ${selectedSize.text} tracking-tight`}
                            whileHover={{ letterSpacing: '0.05em' }}
                            transition={{ duration: 0.2 }}
                        >
                            Altaf M.H
                        </motion.span>

                        {/* Verified badge */}
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.5 }}
                            className="flex items-center justify-center w-4 h-4 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500"
                        >
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                        </motion.div>
                    </div>

                    <div className="flex items-center gap-1">
                        <span className={`text-slate-400 ${selectedSize.subtext} font-medium tracking-wide`}>
                           Healing hearts, serving humanity
                        </span>

                        {/* Live indicator */}
                        <motion.div
                            animate={{ opacity: [1, 0.5, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="w-1 h-1 rounded-full bg-green-400"
                        />
                    </div>


                </motion.div>
            )}
        </div>
    );

    // If href is provided, wrap in Link
    if (href) {
        return (
            <Link href={href} prefetch className="block outline-none focus:ring-2 focus:ring-cyan-500/50 rounded-lg">
                {content}
            </Link>
        );
    }

    return content;
}

// Add these to your global CSS for animations
const styles = `
    @keyframes draw {
        0% {
            stroke-dasharray: 100;
            stroke-dashoffset: 100;
        }
        100% {
            stroke-dasharray: 100;
            stroke-dashoffset: 0;
        }
    }

    .animate-draw {
        stroke-dasharray: 100;
        stroke-dashoffset: 100;
        animation: draw 2s ease-in-out forwards;
    }

    .animate-pulse-slow {
        animation: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }

    .delay-150 {
        animation-delay: 150ms;
    }

    .delay-300 {
        animation-delay: 300ms;
    }
`;

// Inject styles
if (typeof document !== 'undefined') {
    const styleElement = document.createElement('style');
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);
}

// Shield icon component
const Shield = ({ className }: { className?: string }) => (
    <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
    >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
);

export default AppLogo;
