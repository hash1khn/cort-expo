import { useEffect, useState } from 'react';

interface EtaSnapshot {
    etaMinutes: number;
    calculatedAt: string; // ISO timestamp from backend
}

/**
 * Counts down locally from the last backend ETA snapshot.
 * No socket or API calls — just subtracts elapsed wall-clock time.
 * Re-computes every 60 seconds and immediately when the snapshot changes.
 *
 * Returns null until the first eta:update arrives.
 */
export function useEtaCountdown(snapshot: EtaSnapshot | null): number | null {
    const [displayMinutes, setDisplayMinutes] = useState<number | null>(null);

    useEffect(() => {
        if (!snapshot) {
            setDisplayMinutes(null);
            return;
        }

        const compute = () => {
            const elapsedMs = Date.now() - new Date(snapshot.calculatedAt).getTime();
            const remaining = snapshot.etaMinutes - elapsedMs / 60_000;
            return Math.max(0, Math.floor(remaining));
        };

        setDisplayMinutes(compute());

        const interval = setInterval(() => setDisplayMinutes(compute()), 60_000);
        return () => clearInterval(interval);
    }, [snapshot]);

    return displayMinutes;
}
