<?php

namespace App\Services\Imaging;

use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ImagingService
{
    public const DISK         = 'public';
    public const STAGING_DISK = 'staging';
    public const FOLDER       = 'imaging-results';

    /**
     * Move a staged file to the public folder. Returns the final relative path.
     */
    public function promoteFromStaging(string $stagingPath, string $originalName): string
    {
        $ext       = pathinfo($originalName, PATHINFO_EXTENSION);
        $filename  = Str::uuid() . ($ext ? '.' . strtolower($ext) : '');
        $finalPath = self::FOLDER . '/' . $filename;

        $stream = Storage::disk(self::STAGING_DISK)->readStream($stagingPath);
        if (!$stream) {
            throw new \RuntimeException("Staged file missing: {$stagingPath}");
        }

        Storage::disk(self::DISK)->put($finalPath, $stream);
        if (is_resource($stream)) {
            fclose($stream);
        }

        Storage::disk(self::STAGING_DISK)->delete($stagingPath);

        return $finalPath;
    }

    public function discardStaged(string $stagingPath): void
    {
        try {
            Storage::disk(self::STAGING_DISK)->delete($stagingPath);
        } catch (\Throwable) {
        }
    }

    public function publicUrl(?string $relativePath): ?string
    {
        return $relativePath ? asset('storage/' . ltrim($relativePath, '/')) : null;
    }
}
