// components/register/tabs/LicenseTab.tsx

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Upload, X, FileText, Image, AlertCircle, ShieldCheck } from 'lucide-react';

interface LicenseTabProps {
    data: any;
    setData: (key: string, value: any) => void;
    errors: Record<string, string>;
    /** Pass data.profession_id so this tab reacts to profession selection */
    professionId: string;
}

/** IDs of professions that require a license. Extend as needed. */
const LICENSED_PROFESSION_IDS = ['1', '2', '3'];

function getFileIcon(name: string) {
    const ext = name.split('.').pop()?.toLowerCase() ?? '';
    return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)
        ? <Image    className="h-4 w-4 text-gray-400" />
        : <FileText className="h-4 w-4 text-gray-400" />;
}

export default function LicenseTab({ data, setData, errors, professionId }: LicenseTabProps) {
    const [preview, setPreview] = useState<string | null>(null);

    // ── Guard: no profession selected yet ─────────────────────────────────────
    if (!professionId) {
        return (
            <div className="flex flex-col items-center justify-center gap-3 py-16
                            border-2 border-dashed border-gray-200 rounded-lg text-center">
                <AlertCircle className="h-10 w-10 text-gray-300" />
                <h3 className="text-base font-medium text-gray-500">
                    No Profession Selected
                </h3>
                <p className="text-sm text-gray-400 max-w-xs">
                    Please complete the <strong>Professional</strong> tab first by selecting
                    your profession. This tab will update automatically.
                </p>
            </div>
        );
    }

    // ── Guard: profession doesn't require a license ───────────────────────────
    if (!LICENSED_PROFESSION_IDS.includes(professionId)) {
        return (
            <div className="flex flex-col items-center justify-center gap-3 py-16
                            bg-green-50 border border-green-200 rounded-lg text-center">
                <ShieldCheck className="h-10 w-10 text-green-500" />
                <h3 className="text-base font-medium text-green-800">
                    License Not Required
                </h3>
                <p className="text-sm text-green-700 max-w-xs">
                    Based on your selected profession, a medical license is not
                    required for registration. You may proceed to the next step.
                </p>
            </div>
        );
    }

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleUpload = (file: File | null) => {
        setData('license_document', file);
        if (file) {
            // Revoke old preview to avoid memory leaks
            if (preview) URL.revokeObjectURL(preview);
            setPreview(URL.createObjectURL(file));
        } else {
            setPreview(null);
        }
    };

    const remove = () => {
        setData('license_document', null);
        if (preview) URL.revokeObjectURL(preview);
        setPreview(null);
    };

    // ── Active license form ───────────────────────────────────────────────────
    return (
        <div className="space-y-6">
            {/* Info banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                    <strong>Medical License Required:</strong> As a medical
                    professional, you must provide your license details before
                    your account can be activated.
                </p>
            </div>

            {/* License number + expiry */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <Label htmlFor="license_number" className="text-sm font-medium text-gray-700">
                        License Number <span className="text-red-500">*</span>
                    </Label>
                    <Input
                        id="license_number"
                        type="text"
                        value={data.license_number ?? ''}
                        onChange={(e) => setData('license_number', e.target.value)}
                        className="mt-1"
                        placeholder="e.g. MED-12345"
                    />
                    {errors.license_number && (
                        <p className="mt-1 text-sm text-red-600">{errors.license_number}</p>
                    )}
                </div>

                <div>
                    <Label htmlFor="license_expiry_date" className="text-sm font-medium text-gray-700">
                        Expiry Date <span className="text-red-500">*</span>
                    </Label>
                    <Input
                        id="license_expiry_date"
                        type="date"
                        value={data.license_expiry_date ?? ''}
                        onChange={(e) => setData('license_expiry_date', e.target.value)}
                        className="mt-1"
                        min={new Date().toISOString().split('T')[0]} // can't pick past dates
                    />
                    {errors.license_expiry_date && (
                        <p className="mt-1 text-sm text-red-600">{errors.license_expiry_date}</p>
                    )}
                </div>
            </div>

            {/* Document upload */}
            <div>
                <Label className="text-sm font-medium text-gray-700">
                    License Document <span className="text-red-500">*</span>
                </Label>

                {/* Only show drop-zone when no file is selected yet */}
                {!data.license_document ? (
                    <label
                        htmlFor="license_document"
                        className="mt-1 flex flex-col items-center justify-center gap-2
                                   px-6 py-10 border-2 border-dashed border-gray-300 rounded-lg
                                   cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
                    >
                        <Upload className="h-8 w-8 text-gray-400" />
                        <span className="text-sm text-gray-600">
                            <span className="font-medium text-blue-600 hover:text-blue-500">
                                Click to upload
                            </span>
                            {' '}or drag and drop
                        </span>
                        <span className="text-xs text-gray-400">PDF, JPG, PNG up to 10 MB</span>
                        <input
                            id="license_document"
                            type="file"
                            className="sr-only"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => handleUpload(e.target.files?.[0] ?? null)}
                        />
                    </label>
                ) : (
                    /* File preview card */
                    <div className="mt-1 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                                {getFileIcon(data.license_document.name)}
                                <span className="text-sm text-gray-700 truncate max-w-[240px]">
                                    {data.license_document.name}
                                </span>
                                <span className="text-xs text-gray-400 shrink-0">
                                    {(data.license_document.size / 1024 / 1024).toFixed(2)} MB
                                </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                {/* Allow replacing the file */}
                                <label
                                    htmlFor="license_document_replace"
                                    className="text-xs text-blue-600 hover:text-blue-700 cursor-pointer"
                                >
                                    Replace
                                    <input
                                        id="license_document_replace"
                                        type="file"
                                        className="sr-only"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        onChange={(e) => handleUpload(e.target.files?.[0] ?? null)}
                                    />
                                </label>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={remove}
                                    className="text-red-500 hover:text-red-700 p-1 h-auto"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Image preview thumbnail */}
                        {preview && /\.(jpg|jpeg|png)$/i.test(data.license_document.name) && (
                            <img
                                src={preview}
                                alt="License preview"
                                className="mt-3 h-32 rounded border border-gray-200 object-contain"
                            />
                        )}
                    </div>
                )}

                {errors.license_document && (
                    <p className="mt-1 text-sm text-red-600">{errors.license_document}</p>
                )}
            </div>

            {/* Verification note */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-800">
                    <strong>Note:</strong> Your license will be verified by our
                    administrative team. Please ensure all information is accurate
                    and the document is legible.
                </p>
            </div>
        </div>
    );
}
