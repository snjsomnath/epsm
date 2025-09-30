import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSelectionStore } from '../state/selectionStore';

export function useUrlSelectionSync() {
  const [params, setParams] = useSearchParams();
  const { set } = useSelectionStore();

  useEffect(() => {
    const user = params.get('user') || undefined;
    const scenario = params.get('scenario') || undefined;
    const run = params.get('run') || undefined;
    const idf = params.get('idf') || undefined;
    const variant = params.get('variant') || undefined;
    if (user) set('user', user);
    if (scenario) set('scenario', scenario);
    if (run) set('run', run);
    if (idf) set('idf', idf);
    if (variant) set('variant', variant);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const sel = useSelectionStore();
  useEffect(() => {
    const next = new URLSearchParams(params);
    const map: Record<string, string | undefined> = {
      user: sel.userId,
      scenario: sel.scenarioId,
      run: sel.runId,
      idf: sel.idfId,
      variant: sel.variantId,
    };
    Object.entries(map).forEach(([k, v]) => {
      if (!v) next.delete(k); else next.set(k, v);
    });
    setParams(next, { replace: true });
  }, [sel.userId, sel.scenarioId, sel.runId, sel.idfId, sel.variantId]);
}
