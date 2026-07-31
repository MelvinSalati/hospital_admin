// resources/js/pages/bulkstore/components/ApprovalModal.tsx

import React, { Fragment, useState, useEffect } from 'react';
import {
    Dialog,
    DialogPanel,
    DialogTitle,
    Transition,
    TransitionChild,
} from '@headlessui/react';
import {
    X,
    CheckCircle,
    XCircle,
    Clock,
    User,
    DollarSign,
    FileText,
    Calendar,
    Building2,
    Shield,
    Key,
    AlertCircle,
    Lock,
    Unlock,
    Send,
    Loader2,
    Eye,
    EyeOff,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import {usePage} from '@inertiajs/react'
// ============================================
// TYPES
// ============================================

interface ApprovalModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (approvalCode: string, releaseFunds?: boolean) => Promise<void>;
    purchaseOrder: {
        id: number;
        po_number: string;
        pr_number: string;
        supplier_name: string;
        total_amount: number;
        department_name: string;
        status: string;
        priority: string;
        created_at: string;
    };
    userRole: 'admin' | 'supervisor' | 'staff';
    isLoading?: boolean;
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function ApprovalModal({
    isOpen,
    onClose,
    onConfirm,
    purchaseOrder,
    userRole,
    isLoading = false,
}: ApprovalModalProps) {
    const [approvalCode, setApprovalCode] = useState('');
    const [showCode, setShowCode] = useState(false);
    const [releaseFunds, setReleaseFunds] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const {auth}  = usePage().props
    const isAdmin = auth.user.is_admin;
    const isSupervisor = auth.user.is_supervisor;
    
    // Reset state when modal closes
    useEffect(() => {
        if (!isOpen) {
            setApprovalCode('');
            setError('');
            setSuccess(false);
            setIsSubmitting(false);
            setReleaseFunds(false);
        }
    }, [isOpen]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-ZM', {
            style: 'currency',
            currency: 'ZMW',
            minimumFractionDigits: 2,
        }).format(amount);
    };

    const formatDate = (date: string) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('en-ZM', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    };

    const handleSubmit = async () => {
        if (!approvalCode.trim()) {
            setError('Please enter the approval code');
            return;
        }

        setError('');
        setIsSubmitting(true);

        try {
            await onConfirm(approvalCode, releaseFunds);
            setSuccess(true);
            toast.success(isAdmin ? 'Purchase order authorized and funds released!' : 'Purchase order approved!');
            
            setTimeout(() => {
                onClose();
                setSuccess(false);
                setApprovalCode('');
            }, 1500);
        } catch (err: any) {
            setError(err.message || 'Invalid approval code. Please try again.');
            toast.error(err.message || 'Approval failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Check if purchaseOrder has valid data
    if (!purchaseOrder) {
        return null;
    }

    return (
        <Transition show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <TransitionChild
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
                </TransitionChild>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <TransitionChild
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <DialogPanel className="relative w-full max-w-lg transform overflow-hidden rounded-xl bg-white dark:bg-slate-900 shadow-2xl transition-all">
                                {/* ========================================== */}
                                {/* HEADER */}
                                {/* ========================================== */}
                                <div className="border-b border-slate-100 px-6 py-4 dark:border-slate-800">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                                                isAdmin 
                                                    ? 'bg-blue-100 dark:bg-blue-900/30' 
                                                    : 'bg-emerald-100 dark:bg-emerald-900/30'
                                            }`}>
                                                {isAdmin ? (
                                                    <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                                ) : (
                                                    <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                                                )}
                                            </div>
                                            <div>
                                                <DialogTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">
                                                    {isAdmin ? 'Authorize & Release Funds' : 'Approve Purchase Order'}
                                                </DialogTitle>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                                    {isAdmin 
                                                        ? 'Review and authorize funds for this purchase order'
                                                        : 'Review and approve this purchase order'
                                                    }
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={onClose}
                                            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                                            disabled={isSubmitting}
                                        >
                                            <X className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>

                                {/* ========================================== */}
                                {/* CONTENT */}
                                {/* ========================================== */}
                                <div className="p-6">
                                    {/* Success State */}
                                    {success ? (
                                        <div className="py-8 text-center">
                                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                                                <CheckCircle className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
                                            </div>
                                            <p className="mt-4 text-base font-semibold text-slate-900 dark:text-slate-100">
                                                {isAdmin ? 'Authorization Successful!' : 'Approved Successfully!'}
                                            </p>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                                {isAdmin 
                                                    ? 'Funds have been released for this purchase order'
                                                    : 'Purchase order has been approved and forwarded to admin'
                                                }
                                            </p>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Order Summary */}
                                            <div className="mb-6 rounded-lg border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                                                <h4 className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-wider">
                                                    Order Summary
                                                </h4>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <p className="text-[10px] text-slate-400 dark:text-slate-500">PO Number</p>
                                                        <p className="font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">
                                                            {purchaseOrder.po_number || 'N/A'}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] text-slate-400 dark:text-slate-500">PR Number</p>
                                                        <p className="font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">
                                                            {purchaseOrder.pr_number || 'N/A'}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] text-slate-400 dark:text-slate-500">Supplier</p>
                                                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                                            {purchaseOrder.supplier_name || 'N/A'}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] text-slate-400 dark:text-slate-500">Department</p>
                                                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                                            {purchaseOrder.department_name || 'N/A'}
                                                        </p>
                                                    </div>
                                                    <div className="col-span-2">
                                                        <p className="text-[10px] text-slate-400 dark:text-slate-500">Total Amount</p>
                                                        <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                                                            {formatCurrency(purchaseOrder.total_amount || 0)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Role-based messaging */}
                                            <div className={`mb-4 rounded-lg border p-4 ${
                                                isAdmin 
                                                    ? 'border-blue-200 bg-blue-50 dark:border-blue-900/30 dark:bg-blue-900/20'
                                                    : 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/30 dark:bg-emerald-900/20'
                                            }`}>
                                                <div className="flex items-start gap-3">
                                                    {isAdmin ? (
                                                        <Lock className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                                                    ) : (
                                                        <User className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                                                    )}
                                                    <div>
                                                        <p className={`text-sm font-medium ${
                                                            isAdmin 
                                                                ? 'text-blue-900 dark:text-blue-400'
                                                                : 'text-emerald-900 dark:text-emerald-400'
                                                        }`}>
                                                            {isAdmin 
                                                                ? 'Authorize this purchase order'
                                                                : 'Approve this purchase order'
                                                            }
                                                        </p>
                                                        <p className="text-xs text-slate-600 dark:text-slate-300">
                                                            {isAdmin 
                                                                ? 'As an admin, you can authorize this order and release funds.'
                                                                : 'As a supervisor, you can approve this order for admin review.'
                                                            }
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Approval Code Input */}
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                                        Approval Code
                                                    </label>
                                                    <div className="relative">
                                                        <input
                                                            type={showCode ? 'text' : 'password'}
                                                            value={approvalCode}
                                                            onChange={(e) => setApprovalCode(e.target.value)}
                                                            placeholder="Enter your approval code"
                                                            className={`w-full rounded-lg border px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 ${
                                                                error ? 'border-red-500 focus:ring-red-500/20' : 'border-slate-300'
                                                            }`}
                                                            autoFocus
                                                            disabled={isSubmitting}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') handleSubmit();
                                                            }}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowCode(!showCode)}
                                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                                        >
                                                            {showCode ? (
                                                                <EyeOff className="h-4 w-4" />
                                                            ) : (
                                                                <Eye className="h-4 w-4" />
                                                            )}
                                                        </button>
                                                    </div>
                                                    {error && (
                                                        <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                                                            <AlertCircle className="h-4 w-4" />
                                                            {error}
                                                        </p>
                                                    )}
                                                    <div className="mt-2 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                                        <Key className="h-3.5 w-3.5" />
                                                        <span>Enter your secure approval code to confirm</span>
                                                    </div>
                                                </div>

                                                {isAdmin && (
                                                    <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                                                        <input
                                                            type="checkbox"
                                                            id="releaseFunds"
                                                            checked={releaseFunds}
                                                            onChange={(e) => setReleaseFunds(e.target.checked)}
                                                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                            disabled={isSubmitting}
                                                        />
                                                        <label htmlFor="releaseFunds" className="text-sm text-slate-700 dark:text-slate-300">
                                                            <span className="font-medium">Release funds</span>
                                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                                Authorize payment to supplier upon approval
                                                            </p>
                                                        </label>
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* ========================================== */}
                                {/* FOOTER */}
                                {/* ========================================== */}
                                {!success && (
                                    <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4 dark:border-slate-800">
                                        <button
                                            onClick={onClose}
                                            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                                            disabled={isSubmitting}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleSubmit}
                                            disabled={isSubmitting || !approvalCode.trim()}
                                            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isSubmitting ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                    Processing...
                                                </>
                                            ) : isAdmin ? (
                                                <>
                                                    <Unlock className="h-4 w-4" />
                                                    Authorize & Release
                                                </>
                                            ) : (
                                                <>
                                                    <CheckCircle className="h-4 w-4" />
                                                    Approve
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </DialogPanel>
                        </TransitionChild>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}