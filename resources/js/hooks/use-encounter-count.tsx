import { useEffect, useState } from 'react';
import http from '@/utils/Http';

const POLL_INTERVAL_MS = 60_000;

interface EncounterCountResponse {
    count: number;
}

export function useEncounterCount(
    enabled: boolean,
    departmentId: string | number | null,
): number {
    const [count, setCount] = useState(0);

    useEffect(() => {
        if (!enabled || departmentId == null) {
            setCount(0);
            return;
        }

        let mounted = true;
        let loading = false;
        let timer: ReturnType<typeof setInterval>;

        const controller = new AbortController();

        const load = async () => {
            // Don't poll while the tab is inactive.
            if (document.hidden || loading) return;

            loading = true;

            try {
                const { data } = await http.get<EncounterCountResponse>(
                    `/departments/${departmentId}/encounters/count`,
                    { signal: controller.signal },
                );

                if (mounted) {
                    const newCount = Number(data.count) || 0;

                    setCount((previous) =>
                        previous === newCount ? previous : newCount,
                    );
                }
            } catch (error) {
                if (!controller.signal.aborted) {
                    console.error('Unable to fetch encounter count:', error);
                }
            } finally {
                loading = false;
            }
        };

        // Initial request.
        load();

        // Poll every 60 seconds.
        timer = setInterval(load, POLL_INTERVAL_MS);

        // Refresh when the user returns to the tab.
        const handleVisibilityChange = () => {
            if (!document.hidden) {
                load();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            mounted = false;
            controller.abort();
            clearInterval(timer);

            document.removeEventListener(
                'visibilitychange',
                handleVisibilityChange,
            );
        };
    }, [enabled, departmentId]);

    return count;
}
