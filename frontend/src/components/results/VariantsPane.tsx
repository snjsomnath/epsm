import React, { useState } from 'react';
import { useVirtualizer, VirtualItem } from '@tanstack/react-virtual';
import { useSelectionStore } from '../../state/selectionStore';

let CSVLink: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  CSVLink = require('react-csv').CSVLink;
} catch (e) {
  CSVLink = null;
}

export interface VariantRow {
  id: string;
  name: string;
  status: 'queued' | 'running' | 'success' | 'partial' | 'failed';
  euiTotal?: number;
  euiHeating?: number;
  euiCooling?: number;
  euiElec?: number;
  euiGas?: number;
  unmetHtg?: number;
  unmetClg?: number;
  resultSizeMB?: number;
}

interface VariantsPaneProps {
  rows: VariantRow[];
  onPin?: (variantId: string) => void;
  height?: number;
}

export const VariantsPane: React.FC<VariantsPaneProps> = ({ rows, onPin, height = 480 }) => {
  const parentRef = React.useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
    overscan: 8,
  });
  const { set, variantId } = useSelectionStore();
  const [visibleCols, setVisibleCols] = useState({ status: true, eui: true, heating: false, cooling: false, electric: false, gas: false });

  const csvData = rows.map(r => ({ id: r.id, name: r.name, status: r.status, eui: r.euiTotal }));

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-2 py-1 border-b">
        <div className="text-sm font-semibold">Variants</div>
        <div className="ml-auto flex items-center gap-2">
          <label className="text-xs">Cols:</label>
          <label className="text-xs"><input type="checkbox" checked={visibleCols.status} onChange={() => setVisibleCols(v => ({ ...v, status: !v.status }))} /> status</label>
          <label className="text-xs"><input type="checkbox" checked={visibleCols.eui} onChange={() => setVisibleCols(v => ({ ...v, eui: !v.eui }))} /> EUI</label>
          {CSVLink ? <CSVLink data={csvData} filename="variants.csv" className="ml-2 px-2 py-1 border rounded text-xs">Export CSV</CSVLink> : <button className="ml-2 px-2 py-1 border rounded text-xs" disabled>CSV N/A</button>}
        </div>
      </div>

      <div className="grid grid-cols-10 px-3 py-2 text-xs uppercase tracking-wide text-gray-500 border-b">
        <div className="col-span-3">variant</div>
        {visibleCols.status && <div>status</div>}
        {visibleCols.eui && <div className="text-right">eui</div>}
        {visibleCols.heating && <div className="text-right">heating</div>}
        {visibleCols.cooling && <div className="text-right">cooling</div>}
        {visibleCols.electric && <div className="text-right">elec</div>}
        {visibleCols.gas && <div className="text-right">gas</div>}
        <div className="text-right">size</div>
      </div>

      <div ref={parentRef} className="flex-1 overflow-auto" style={{ height }}>
        <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
          {rowVirtualizer.getVirtualItems().map((vi: VirtualItem) => {
            const row = rows[vi.index];
            const active = variantId === row.id;
            return (
              <div
                key={row.id}
                role="row"
                aria-selected={active}
                onClick={() => set('variant', row.id)}
                className={`grid grid-cols-10 items-center px-3 h-10 cursor-pointer border-b hover:bg-gray-50 ${active ? 'bg-gray-100' : ''}`}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${vi.start}px)` }}
              >
                <div className="col-span-3 truncate" title={row.name}>{row.name}</div>
                {visibleCols.status && <div><StatusPill status={row.status} /></div>}
                {visibleCols.eui && <div className="text-right">{fmt(row.euiTotal)}</div>}
                {visibleCols.heating && <div className="text-right">{fmt(row.euiHeating)}</div>}
                {visibleCols.cooling && <div className="text-right">{fmt(row.euiCooling)}</div>}
                {visibleCols.electric && <div className="text-right">{fmt(row.euiElec)}</div>}
                {visibleCols.gas && <div className="text-right">{fmt(row.euiGas)}</div>}
                <div className="text-right">{row.resultSizeMB ? `${row.resultSizeMB.toFixed(1)} MB` : '–'}</div>
                <div className="text-right text-xs"><button className="px-2 py-0.5 border rounded" onClick={(e) => { e.stopPropagation(); navigator.clipboard?.writeText(row.id); }}>Copy</button></div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="px-3 py-2 flex items-center gap-2 border-t">
        <button
          className="px-2 py-1 rounded border"
          disabled={!variantId}
          onClick={() => variantId && onPin?.(variantId)}
        >
          Pin for compare
        </button>
        <span className="text-xs text-gray-500">Tip: Shift‑click to multi‑select (WIP)</span>
      </div>
    </div>
  );
};

const fmt = (v?: number) => (v == null ? '–' : v.toFixed(1));

const StatusPill: React.FC<{ status: VariantRow['status'] }> = ({ status }) => {
  const map: Record<VariantRow['status'], string> = {
    queued: 'bg-gray-200',
    running: 'bg-blue-200',
    success: 'bg-green-200',
    partial: 'bg-amber-200',
    failed: 'bg-red-200',
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs ${map[status]}`}>{status}</span>;
};
