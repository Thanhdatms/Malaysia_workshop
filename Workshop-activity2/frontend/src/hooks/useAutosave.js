import { useEffect, useRef, useState } from 'react';

// Debounced autosave: watches `data`, calls saveFn(data) after `delay` ms of
// no further changes. saveFn's resolved value (if any) is fed to onSaved —
// used to sync server-assigned ids back into local state without causing an
// infinite save loop (the id-sync setState produces data whose JSON already
// matches what we just recorded as "last saved").
//
// Pass enabled: false to pause autosaving (e.g. while an AI-generated draft
// is awaiting human review/confirmation). Call the returned markSaved(data)
// after an external explicit save so the hook doesn't redundantly re-save
// the same content once re-enabled.
export function useAutosave(data, saveFn, { delay = 800, onSaved, enabled = true } = {}) {
  const [status, setStatus] = useState('idle');
  const timeoutRef = useRef(null);
  const lastSavedJson = useRef(JSON.stringify(data));

  useEffect(() => {
    if (!enabled) return undefined;
    const json = JSON.stringify(data);
    if (json === lastSavedJson.current) {
      return undefined;
    }
    setStatus('saving');
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(async () => {
      try {
        const result = await saveFn(data);
        lastSavedJson.current = JSON.stringify(result !== undefined ? result : data);
        setStatus('saved');
        if (result !== undefined && onSaved) onSaved(result);
        setTimeout(() => setStatus((s) => (s === 'saved' ? 'idle' : s)), 1500);
      } catch {
        setStatus('error');
      }
    }, delay);
    return () => clearTimeout(timeoutRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, enabled]);

  function markSaved(savedData) {
    lastSavedJson.current = JSON.stringify(savedData);
    setStatus('saved');
    setTimeout(() => setStatus((s) => (s === 'saved' ? 'idle' : s)), 1500);
  }

  return { status, markSaved };
}
