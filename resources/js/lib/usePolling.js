import { useEffect, useRef } from 'react';

export function usePolling(callback, intervalMs) {
    const callbackRef = useRef(callback);
    callbackRef.current = callback;

    useEffect(() => {
        let intervalId = null;
        let cancelled = false;

        const run = () => {
            if (!cancelled && !document.hidden) {
                callbackRef.current();
            }
        };

        const startInterval = () => {
            if (intervalId != null) {
                return;
            }
            intervalId = setInterval(run, intervalMs);
        };

        const stopInterval = () => {
            if (intervalId != null) {
                clearInterval(intervalId);
                intervalId = null;
            }
        };

        const handleVisibility = () => {
            if (document.hidden) {
                stopInterval();
            } else {
                run();
                startInterval();
            }
        };

        if (document.hidden) {
            callbackRef.current();
        } else {
            run();
            startInterval();
        }

        document.addEventListener('visibilitychange', handleVisibility);

        return () => {
            cancelled = true;
            stopInterval();
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, [intervalMs]);
}
