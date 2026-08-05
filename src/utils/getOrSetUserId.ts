export function getOrSetUserId(): number {
    if (typeof window === 'undefined') return 0;

    let userId = localStorage.getItem('userId');

    const maxSafeInteger = Number.MAX_SAFE_INTEGER;
    const storedUserId = userId ? Number(userId) : NaN;

    if (!Number.isSafeInteger(storedUserId) || storedUserId <= 0) {
        // Keep the ID compatible with JSON numbers and uint64 on the backend.
        // Date.now() * 1000 + 0..999 is unique enough per client and remains
        // below Number.MAX_SAFE_INTEGER.
        const timestamp = Date.now() * 1000;
        const randomPart = Math.floor(Math.random() * 1000);
        const nextUserId = Math.min(timestamp + randomPart, maxSafeInteger);
        userId = String(nextUserId);
        localStorage.setItem('userId', userId);
    }

    return Number(userId);
}
