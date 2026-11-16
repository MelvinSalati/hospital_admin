// components/app-logo.tsx

import { Link } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';
import React from 'react';
import logo from '../../assets/img/logo.jpg'; // same path you used in AppLogoIcon

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
        sm: { icon: 'h-8 w-8', text: 'text-lg', subtext: 'text-[10px]', container: 'h-8 w-8' },
        md: { icon: 'h-10 w-10', text: 'text-xl', subtext: 'text-xs', container: 'h-10 w-10' },
        lg: { icon: 'h-12 w-12', text: 'text-2xl', subtext: 'text-sm', container: 'h-12 w-12' },
    };

    const selectedSize = sizes[size];

    // Animation variants
    const logoVariants = {
        initial: { scale: 0.9, opacity: 0 },
        animate: {
            scale: 1,
            opacity: 1,
            transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] },
        },
        hover: {
            scale: 1.05,
            transition: { duration: 0.2, ease: 'easeInOut' },
        },
        tap: { scale: 0.95 },
    };

    const textVariants = {
        initial: { x: -10, opacity: 0 },
        animate: {
            x: 0,
            opacity: 1,
            transition: { delay: 0.2, duration: 0.4, ease: 'easeOut' },
        },
    };

    const pulseVariants = {
        initial: { opacity: 0.5, scale: 1 },
        animate: {
            opacity: [0.5, 0.8, 0.5],
            scale: [1, 1.2, 1],
            transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
        },
    };

    // Logo image (replaces the old SVG)
    const LogoIcon = () => (
        <img
            src={logo}
            alt="Altaf M.H logo"
            className="h-full w-full rounded-full object-cover ring-1 ring-cyan-500/40"
        />
    );

    // Alternative minimal icon (for collapsed sidebar)
    const MinimalIcon = () => (
        <div className="relative h-full w-full">
            <motion.div
                variants={pulseVariants}
                initial="initial"
                animate="animate"
                className="absolute inset-0 rounded-lg bg-gradient-to-r from-cyan-500/30 to-blue-500/30 blur-xl"
            />
            <div className="relative flex h-full w-full items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 shadow-xl">
                <Activity className="h-1/2 w-1/2 text-white" strokeWidth={2.5} />
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
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex h-3 w-3 rounded-full bg-cyan-500"></span>
            </span>
        </motion.div>
    );

    const content = (
        <div className={`group flex items-center gap-3 ${className}`}>
            <motion.div
                variants={logoVariants}
                initial="initial"
                animate="animate"
                whileHover="hover"
                whileTap="tap"
                className={`relative ${selectedSize.container} flex-shrink-0`}
            >
                {/* Glow layers */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-500/20 to-blue-500/20 blur-2xl transition-all duration-500 group-hover:blur-3xl" />
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-500/30 to-blue-500/30 opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-100" />

                {/* Logo */}
                <div className={`relative ${selectedSize.icon}`}>
                    {variant === 'minimal' ? <MinimalIcon /> : <LogoIcon />}
                </div>

                <MedicalBadge />
            </motion.div>

            {showText && (
                <motion.div
                    variants={textVariants}
                    initial="initial"
                    animate="animate"
                    className="flex flex-col"
                >
                    <div className="flex items-center gap-1.5">
                        <motion.span
                            className={`bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text font-bold tracking-tight text-transparent ${selectedSize.text}`}
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
                            className="flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-r from-cyan-500 to-blue-500"
                        >
                            <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                        </motion.div>
                    </div>

                    <div className="flex items-center gap-1">
                        <span className={`font-medium tracking-wide text-slate-400 ${selectedSize.subtext}`}>
                            Healing hearts, serving humanity
                        </span>

                        {/* Live indicator */}
                        <motion.div
                            animate={{ opacity: [1, 0.5, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="h-1 w-1 rounded-full bg-green-400"
                        />
                    </div>
                </motion.div>
            )}
        </div>
    );

    if (href) {
        return (
            <Link href={href} prefetch className="block rounded-lg outline-none focus:ring-2 focus:ring-cyan-500/50">
                {content}
            </Link>
        );
    }

    return content;
}

export default AppLogo;