import React from 'react';
import { useSelectionStore } from '../../state/selectionStore';

interface NameMap { [id: string]: string }
interface BreadcrumbsProps {
  userNames?: NameMap;
  scenarioNames?: NameMap;
  runNames?: NameMap;
  idfNames?: NameMap;
  variantNames?: NameMap;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ userNames = {}, scenarioNames = {}, runNames = {}, idfNames = {}, variantNames = {} }) => {
  const { userId, scenarioId, runId, idfId, variantId, set } = useSelectionStore();
  const crumbs: Array<{ label: string; onClick: () => void; active: boolean } | null> = [
    { label: 'Users', onClick: () => set('user', userId), active: !userId },
    userId ? { label: userNames[userId] || `User ${userId}`, onClick: () => set('user', userId), active: !!userId && !scenarioId } : null,
    scenarioId ? { label: scenarioNames[scenarioId] || `Scenario ${scenarioId}`, onClick: () => set('scenario', scenarioId), active: !!scenarioId && !runId } : null,
    runId ? { label: runNames[runId] || `Run ${runId}`, onClick: () => set('run', runId), active: !!runId && !idfId } : null,
    idfId ? { label: idfNames[idfId] || `IDF ${idfId}`, onClick: () => set('idf', idfId), active: !!idfId && !variantId } : null,
    variantId ? { label: variantNames[variantId] || `Variant ${variantId}`, onClick: () => set('variant', variantId), active: !!variantId } : null,
  ].filter(Boolean) as any;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
      {crumbs.map((c, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span aria-hidden>›</span>}
          <button
            className={`hover:underline ${c!.active ? 'font-semibold' : ''}`}
            onClick={c!.onClick}
          >
            {c!.label}
          </button>
        </React.Fragment>
      ))}
    </nav>
  );
};
