
import { useState, useEffect, useRef } from 'react';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function useAutosave<T>(
    data: T, 
    onSave: (data: T) => Promise<any>, 
    delay = 1500
) {
    const [status, setStatus] = useState<SaveStatus>('idle');
    const firstRender = useRef(true);
    const dataRef = useRef(data);
    const onSaveRef = useRef(onSave);
    const timeoutId = useRef<number | null>(null);

    // Update refs whenever data or callback changes
    useEffect(() => {
        dataRef.current = data;
    }, [data]);

    useEffect(() => {
        onSaveRef.current = onSave;
    }, [onSave]);

    useEffect(() => {
        // Don't save on initial render
        if (firstRender.current) {
            firstRender.current = false;
            return;
        }

        if (timeoutId.current) {
            clearTimeout(timeoutId.current);
        }

        setStatus('saving');

        timeoutId.current = window.setTimeout(async () => {
            try {
                // Use the ref to call the latest version of the function
                // without forcing this effect to re-run if the function identity changes.
                await onSaveRef.current(dataRef.current);
                setStatus('saved');
            } catch (e) {
                console.error("Autosave failed", e);
                setStatus('error');
            }
        }, delay);

        return () => {
            if (timeoutId.current) {
                clearTimeout(timeoutId.current);
            }
        };
    // We only want this effect to re-run based on a stringified version of the data
    // and the delay. We explicitly exclude onSave to prevent timer resets.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(data), delay]);

    return status;
}
