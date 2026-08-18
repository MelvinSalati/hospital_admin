import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import Http from '@/utils/Http';
import { usePage } from '@inertiajs/react';
import { ShieldCheck } from 'lucide-react';
import Notiflix from 'notiflix';
import { useState, useRef, useEffect } from 'react';

export default function ApproveGRN() {
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [otpCode, setOtpCode] = useState(false);
    const [approvalCode, setApprovalCode] = useState('');
    const inputRefs = useRef([]);
    const { auth, grnId} = usePage().props;

    const handleVerifyApprovalCode = async () => {
        const response = await Http.post(
            `bulk-store/${auth.user.id}/verify-approval-code`,
            {
                approval_code: approvalCode,
            },
        );
        console.log(response.data);

        if (response.data.valid) {
            Notiflix.Notify.success('Approval code verified successfully!');
            setOtpCode(true);
        } else {
            Notiflix.Notify.failure('Invalid approval code.');
        }
    };

    // Auto-focus first input on mount
    useEffect(() => {
        if (inputRefs.current[0]) {
            inputRefs.current[0].focus();
        }
    }, []);

    const handleChange = (index, value) => {
        // Only allow numbers
        if (!/^\d*$/.test(value)) return;

        const newOtp = [...otp];
        newOtp[index] = value.slice(-1); // Only take last character
        setOtp(newOtp);

        // Move to next input
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index, e) => {
        // Move to previous input on backspace
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').slice(0, 6);
        if (/^\d*$/.test(pastedData)) {
            const newOtp = [...otp];
            for (let i = 0; i < pastedData.length && i < 6; i++) {
                newOtp[i] = pastedData[i];
            }
            setOtp(newOtp);
            // Focus last filled input
            const lastIndex = Math.min(pastedData.length - 1, 5);
            inputRefs.current[lastIndex]?.focus();
        }
    };

    const handleSubmit = async () => {
        const otpString = otp.join('');

        if (otpString.length !== 6) {
            Notiflix.Notify.failure(
                'Please enter the complete 4-digit verification code.',
            );
            return;
        }

        try {
            const response = await Http.post(
                `bulk-store/${otpString}/verify-token`,
                {
                    user_id: auth.user.id,
                    grn_id: grnId,
                },
            );

            if (response.data.valid) {
                Notiflix.Notify.success(
                    'OTP verified successfully. GRN approved.',
                );

                // Continue with GRN approval
                console.log('GRN approved');
            } else {
                Notiflix.Notify.failure(
                    response.data.message || 'Invalid or expired OTP.',
                );
            }
        } catch (error) {
            console.error(error);

            Notiflix.Notify.failure(
                error.response?.data?.message || 'Unable to verify the OTP.',
            );
        }
    };
    return (
        <div className="h-full justify-center">
            <PageHeader
                title="Approve GRN"
                icon={<ShieldCheck />}
                subtitle="Approve the Goods Received Note"
            />

            {otpCode ? (
                <div className="mx-auto h-full max-w-md p-6">
                    <div className="rounded-xl bg-white dark:bg-slate-800">
                        <h3 className="mb-2 text-center text-sm font-medium text-slate-600 dark:text-slate-300">
                            Enter 4-digit approval code
                        </h3>
                        <p className="mb-6 text-center text-xs text-slate-400">
                            Enter the code sent to your device
                        </p>

                        <div className="flex justify-center gap-3">
                            {otp.map((digit, index) => (
                                <input
                                    key={index}
                                    ref={(el) =>
                                        (inputRefs.current[index] = el)
                                    }
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={1}
                                    value={digit}
                                    onChange={(e) =>
                                        handleChange(index, e.target.value)
                                    }
                                    onKeyDown={(e) => handleKeyDown(index, e)}
                                    onPaste={handlePaste}
                                    className="h-14 w-14 rounded-xl border-2 border-slate-200 text-center text-2xl font-bold text-slate-800 transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                                    autoFocus={index === 0}
                                />
                            ))}
                        </div>

                        <Button
                            onClick={handleSubmit}
                            disabled={otp.join('').length !== 6}
                            className="mt-6 h-12 w-full"
                        >
                            Approve
                        </Button>

                        <button
                            onClick={() => setOtpCode(false)}
                            className="mt-3 w-full text-center text-sm"
                        >
                            Enter approval code instead
                        </button>
                    </div>
                </div>
            ) : (
                <div className="mx-auto max-w-md p-6">
                    <div className="rounded-xl bg-white dark:bg-slate-800">
                        <div className="flex flex-col">
                            <label
                                htmlFor="approve"
                                className="text-sm font-medium text-slate-700 dark:text-slate-300"
                            >
                                Approval Code
                            </label>
                            <input
                                type="text"
                                id="approve"
                                placeholder="Enter your approval code"
                                className="mt-2 h-12 w-full rounded-xl border-2 border-slate-200 px-4 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                                value={approvalCode}
                                onChange={(e) =>
                                    setApprovalCode(e.target.value)
                                }
                            />
                            <p className="mt-2 text-center text-sm text-slate-600 dark:text-slate-400">
                                Please enter your approval code
                            </p>
                            <Button
                                onClick={handleVerifyApprovalCode}
                                className="mt-4 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                            >
                                Approval Code
                            </Button>
                            <button
                                onClick={() => setOtpCode(true)}
                                className="mt-3 text-center text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                            >
                                Use OTP instead
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
