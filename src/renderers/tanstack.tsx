import { useMemo } from 'react';
import { createColumnHelper, tableFeatures, useTable } from '@tanstack/react-table';
import { CELL, type PixelElement } from '../pixels';
import './tanstack.css';

const tableFeaturesConfig = tableFeatures({});
const columnHelper = createColumnHelper<typeof tableFeaturesConfig, { id: number }>();

export function TanStackGrid({
  cells,
  width,
  height,
}: {
  cells: (PixelElement | null)[];
  width: number;
  height: number;
}) {
  const rows = useMemo(() => Array.from({ length: height }, (_, id) => ({ id })), [height]);
  const tableColumns = useMemo(
    () =>
      columnHelper.columns(
        Array.from({ length: width }, (_, x) => columnHelper.display({ id: `c${x}` })),
      ),
    [width],
  );
  const table = useTable({ features: tableFeaturesConfig, columns: tableColumns, data: rows });
  return (
    <table
      className="tanstack-grid"
      style={{ width: width * CELL, height: height * CELL }}
      aria-label="DOOM pixel table"
    >
      <tbody>
        {table.getRowModel().rows.map((row) => (
          <tr key={row.id}>
            {row.getAllCells().map((cell, x) => (
              <td
                key={cell.id}
                className="tanstack-pixel"
                ref={(node) => {
                  if (!node) return;
                  const index = row.original.id * width + x;
                  cells[index] = node;
                  return () => {
                    if (cells[index] === node) cells[index] = null;
                  };
                }}
              />
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
