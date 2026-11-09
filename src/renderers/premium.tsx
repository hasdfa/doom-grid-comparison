import { useMemo } from 'react';
import { DataGridPremium, type GridColDef } from '@mui/x-data-grid-premium';
import { CELL, type PixelElement } from '../pixels';

type PremiumGridProps = {
  cells: (PixelElement | null)[];
  width: number;
  height: number;
};

const premiumSlots = { columnHeaders: () => null };

export function PremiumGrid({ cells, width, height }: PremiumGridProps) {
  const rows = useMemo(() => Array.from({ length: height }, (_, id) => ({ id })), [height]);
  const columns = useMemo<GridColDef[]>(
    () =>
      Array.from({ length: width }, (_, x) => ({
        field: `c${x}`,
        width: CELL,
        minWidth: CELL,
        maxWidth: CELL,
        sortable: false,
        filterable: false,
        resizable: false,
        // Contained child pixels paint faster than GridCell backgrounds in this workload.
        renderCell: (params) => (
          <span
            className="pixel premium-pixel"
            ref={(node) => {
              if (!node) return;
              const index = Number(params.id) * width + x;
              cells[index] = node;
              return () => {
                if (cells[index] === node) cells[index] = null;
              };
            }}
          />
        ),
      })),
    [cells, width],
  );
  return (
    <DataGridPremium
      rows={rows}
      columns={columns}
      rowHeight={CELL}
      columnHeaderHeight={0}
      hideFooter
      disableVirtualization
      rowSelection={false}
      disableRowSelectionOnClick
      disableColumnReorder
      disableColumnMenu
      disableColumnFilter
      disableColumnSorting
      disableColumnResize
      slots={premiumSlots}
      className="premium-grid"
      style={{ width: width * CELL, height: height * CELL }}
    />
  );
}
