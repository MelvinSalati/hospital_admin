import { Form, Head } from '@inertiajs/react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import AuthLayout from '@/layouts/auth-layout';
import { register } from '@/routes';
import { store } from '@/routes/login';
import { request } from '@/routes/password';
import { useState, useEffect } from 'react';

type Props = {
    status?: string;
    canResetPassword: boolean;
    canRegister: boolean;
};

export default function Login({
    status,
    canResetPassword,
    canRegister,
}: Props) {
    const quotes = [
        { text: "Healing hearts, serving humanity", author: "Altaf Memorial Hospital" },
        { text: "Excellence in healthcare, compassion in service", author: "Altaf Memorial Hospital" },
        { text: "Your health, our priority", author: "Altaf Memorial Hospital" },
        { text: "Where every life matters", author: "Altaf Memorial Hospital" },
        { text: "Advanced care, human touch", author: "Altaf Memorial Hospital" }
    ];

    const [currentQuote, setCurrentQuote] = useState(quotes[0]);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentQuote(quotes[Math.floor(Math.random() * quotes.length)]);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <AuthLayout
            title={"Altaf Memorial Hospital"}
               >
            <div>
                 <Form
                {...store.form()}
                resetOnSuccess={['password']}
                className="flex flex-col gap-6"
            >
                {({ processing, errors }) => (
                    <>

                        <div className="grid gap-6">
                            {/* Email Field */}
                            <div className="grid gap-2">
                                <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Email Address
                                </Label>
                                <div className="relative">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <Input
                                        id="email"
                                        type="email"
                                        name="email"
                                        required
                                        autoFocus
                                        tabIndex={1}
                                        autoComplete="email"
                                        placeholder="doctor@altamemorial.org"
                                        className="pl-10 border-gray-200 h-12  focus:border-[#2596be] focus:ring-[#2596be] rounded-xl"
                                    />
                                </div>
                                <InputError message={errors.email} />
                            </div>

                            {/* Password Field */}
                            <div className="grid gap-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Password
                                    </Label>
                                    {canResetPassword && (
                                        <TextLink
                                            href={request()}
                                            className="text-sm text-[#2596be] hover:text-[#1a6b8a] dark:text-[#28c2de] transition-colors"
                                            tabIndex={5}
                                        >
                                            Forgot password?
                                        </TextLink>
                                    )}
                                </div>
                                <div className="relative">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                    </div>
                                    <PasswordInput
                                        id="password"
                                        name="password"
                                        required
                                        tabIndex={2}
                                        autoComplete="current-password"
                                        placeholder="••••••••"
                                        className="pl-10 h-12 border-gray-200 dark:border-gray-700 focus:border-[#2596be] focus:ring-[#2596be] rounded-xl"
                                    />
                                </div>
                                <InputError message={errors.password} />
                            </div>

                            {/* Remember Me */}
                            <div className="flex items-center space-x-3 dark:bg-blue-900/20 p-3 rounded-lg">
                                <Checkbox
                                    id="remember"
                                    name="remember"
                                    tabIndex={3}
                                    className="border-[#2596be] text-[#2596be] focus:ring-[#2596be]"
                                />
                                <Label htmlFor="remember" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                                    Keep me signed in
                                </Label>
                            </div>

                            {/* Login Button */}
                            <Button
                                type="submit"
                                size={'lg'}
                                className="mt-2 w-[240px]  text-white font-medium py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
                                tabIndex={4}
                                disabled={processing}
                            >
                                {processing ? (
                                    <span className="flex items-center gap-2">
                                        <Spinner className="h-4 w-4" />
                                        Signing in...
                                    </span>
                                ) : (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                                        </svg>
                                        Sign In
                                    </span>
                                )}
                            </Button>
                        </div>
                    </>
                )}
            </Form>
            </div>

            {/* Status Message */}
            {status && (
                <div className="mt-4 rounded-lg bg-green-50 dark:bg-green-900/20 p-4 text-center">
                    <p className="text-sm font-medium text-green-600 dark:text-green-400">
                        {status}
                    </p>
                </div>
            )}


        </AuthLayout>
    );
}
