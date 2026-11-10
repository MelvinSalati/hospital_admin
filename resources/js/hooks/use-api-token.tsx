// resources/js/hooks/use-api-token.ts
import { useEffect } from 'react';

export function useApiToken() {
    useEffect(() => {
        if (localStorage.getItem('auth_token')) return;

        const csrf = document.querySelector<HTMLMetaElement>(
            'meta[name="csrf-token"]',
        )?.content;
        if (!csrf) return;

        fetch('/api-token', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'X-CSRF-TOKEN': csrf,
                Accept: 'application/json',
            },
        })
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => {
                if (data?.token) {
                    localStorage.setItem('auth_token', data.token);
                }
            })
            .catch(() => {
                /* not authenticated — ignore */
            });
    }, []);
}
