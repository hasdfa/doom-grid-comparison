import type { PixelElement } from './pixels';
import { memo, useMemo } from 'react';
import { DataGridPremium, type GridColDef } from '@mui/x-data-grid-premium';
import { DataGrid as Mosaic } from '@base-ui/mosaic';
import { AgGridReact } from 'ag-grid-react';
import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
  type ColDef,
  type ICellRendererParams,
} from 'ag-grid-community';
import { createColumnHelper, tableFeatures, useTable } from '@tanstack/react-table';
import { SchedulerGrid } from './scheduler';
import { MuiHeatmap, BaseHeatmap } from './heatmaps';
import { CELL, HEIGHT, WIDTH } from './pixels';

export type Renderer =
  | 'premium'
  | 'mosaic'
  | 'aggrid'
  | 'tanstack'
  | 'mui-heatmap'
  | 'base-heatmap'
  | 'scheduler';
export const renderers: { id: Renderer; label: string; version: string }[] = [
  { id: 'premium', label: 'MUI X Premium', version: 'Data Grid Premium 9.17.0' },
  { id: 'mosaic', label: 'Base UI Mosaic', version: 'Mosaic · 2ae53b9ee2cb' },
  { id: 'aggrid', label: 'AG Grid', version: 'AG Grid Community 36.3.0' },
  { id: 'tanstack', label: 'TanStack Table', version: 'TanStack Table 9.3.1' },
  { id: 'mui-heatmap', label: 'MUI X Heatmap', version: 'MUI X Charts 9.17.0' },
  { id: 'base-heatmap', label: 'Base UI Heatmap', version: 'Base UI Charts · db47a70f7ab9' },
  { id: 'scheduler', label: 'MUI X Scheduler', version: 'Scheduler 9.0.0-beta.15' },
];
ModuleRegistry.registerModules([AllCommunityModule]);
const agTheme = themeQuartz.withParams({
  spacing: 0,
  backgroundColor: '#080906',
  borderColor: '#080906',
  wrapperBorder: false,
  rowBorder: false,
});
const tableFeaturesConfig = tableFeatures({});
const columnHelper = createColumnHelper<typeof tableFeaturesConfig, { id: number }>();
function TanStackGrid({
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
              <td key={cell.id}>
                <span
                  className="pixel"
                  ref={(node) => {
                    cells[row.original.id * width + x] = node;
                  }}
                />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const emptyHeader = () => null;
const premiumSlots = { columnHeaders: emptyHeader };

export const PixelGrid = memo(function PixelGrid({
  renderer,
  cells,
  width = WIDTH,
  height = HEIGHT,
}: {
  renderer: Renderer;
  width?: number;
  height?: number;
  cells: (PixelElement | null)[];
}) {
  const rows = useMemo(() => Array.from({ length: height }, (_, id) => ({ id })), [height]);
  const mosaicColumns = useMemo(
    () =>
      Array.from({ length: width }, (_, x) => ({
        id: `c${x}`,
        defaultSize: CELL,
        minSize: CELL,
        sortable: false,
      })),
    [width],
  );
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
        renderCell: (params) => (
          <span
            className="pixel"
            ref={(node) => {
              cells[Number(params.id) * width + x] = node;
            }}
          />
        ),
      })),
    [cells, width],
  );
  const agColumns = useMemo<ColDef<{ id: number }>[]>(
    () =>
      Array.from({ length: width }, (_, x) => ({
        colId: `c${x}`,
        width: CELL,
        minWidth: CELL,
        maxWidth: CELL,
        sortable: false,
        resizable: false,
        suppressMovable: true,
        cellRenderer: (params: ICellRendererParams<{ id: number }>) => (
          <span
            className="pixel"
            ref={(node) => {
              if (params.data) cells[params.data.id * width + x] = node;
            }}
          />
        ),
      })),
    [cells, width],
  );
  if (renderer === 'scheduler') return <SchedulerGrid cells={cells} width={width} height={height} />;
  if (renderer === 'base-heatmap')
    return <BaseHeatmap cells={cells} width={width} height={height} />;
  if (renderer === 'mui-heatmap') return <MuiHeatmap cells={cells} width={width} height={height} />;
  if (renderer === 'tanstack') return <TanStackGrid cells={cells} width={width} height={height} />;
  if (renderer === 'aggrid') {
    return (
      <div className="ag-grid" style={{ width: width * CELL, height: height * CELL }}>
        <AgGridReact
          theme={agTheme}
          rowData={rows}
          columnDefs={agColumns}
          getRowId={({ data }) => String(data.id)}
          rowHeight={CELL}
          headerHeight={0}
          suppressRowVirtualisation
          suppressColumnVirtualisation
          suppressCellFocus
          animateRows={false}
          suppressRowHoverHighlight
        />{' '}
      </div>
    );
  }
  if (renderer === 'premium') {
    return (
      <DataGridPremium
        rows={rows}
        columns={columns}
        rowHeight={CELL}
        columnHeaderHeight={0}
        hideFooter
        disableVirtualization
        disableRowSelectionOnClick
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
  return (
    <Mosaic.Root
      rows={rows}
      columns={mosaicColumns}
      rowHeight={CELL}
      headerRowHeight={0}
      virtualization={false}
      className="mosaic-grid"
      style={{ width: width * CELL, height: height * CELL }}
    >
      <Mosaic.Viewport>
        <Mosaic.Table aria-label="DOOM pixel grid">
          <Mosaic.Body>
            {(row) => (
              <Mosaic.Row key={row.id}>
                {(cell) => (
                  <Mosaic.Cell key={cell.column.id} className="mosaic-cell">
                    <span
                      className="pixel"
                      ref={(node) => {
                        cells[Number(row.id) * width + Number(cell.column.id.slice(1))] = node;
                      }}
                    />
                  </Mosaic.Cell>
                )}
              </Mosaic.Row>
            )}
          </Mosaic.Body>
        </Mosaic.Table>
      </Mosaic.Viewport>
    </Mosaic.Root>
  );
});
