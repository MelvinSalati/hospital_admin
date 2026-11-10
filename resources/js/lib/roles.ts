// resources/js/lib/roles.ts

export function getUserRole(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('userRole');
}

/** True only for receptionist / reception roles. */
export function isReceptionist(role?: string | null): boolean {
    const r = (role ?? getUserRole() ?? '').toLowerCase();
    return r === 'receptionist' || r === 'reception';
}
