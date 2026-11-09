import { useLayoutEffect, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import {
  ClientSideRowModelModule,
  themeQuartz,
  type ColDef,
  type GetRowIdParams,
  type ICellRendererParams,
} from 'ag-grid-community';
import { CELL, type PixelElement } from '../pixels';

type Row = { id: number };
type Props = { cells: (PixelElement | null)[]; width: number; height: number };
type PixelCellProps = ICellRendererParams<Row, unknown, unknown> & {
  cells: Props['cells'];
  width: number;
  x: number;
};

const modules = [ClientSideRowModelModule];
const theme = themeQuartz.withParams({
  spacing: 0,
  backgroundColor: '#080906',
  borderColor: '#080906',
  wrapperBorder: false,
  rowBorder: false,
});
const getRowId = ({ data }: GetRowIdParams<Row>) => String(data.id);

function PixelCell({ cells, width, x, data, eGridCell }: PixelCellProps) {
  const rowId = data?.id;
  useLayoutEffect(() => {
    if (rowId === undefined) return;
    const index = rowId * width + x;
    cells[index] = eGridCell;
    return () => {
      // A replacement renderer may have registered its cell before this cleanup.
      if (cells[index] === eGridCell) cells[index] = null;
    };
  }, [cells, width, x, rowId, eGridCell]);
  return null;
}

export function AgGrid({ cells, width, height }: Props) {
  const rows = useMemo(() => Array.from({ length: height }, (_, id) => ({ id })), [height]);
  const columns = useMemo<ColDef<Row>[]>(
    () =>
      Array.from({ length: width }, (_, x) => ({
        colId: `c${x}`,
        width: CELL,
        minWidth: CELL,
        maxWidth: CELL,
        sortable: false,
        resizable: false,
        suppressMovable: true,
        cellRenderer: PixelCell,
        cellRendererParams: { cells, width, x },
      })),
    [cells, width],
  );

  return (
    <div className="ag-grid" style={{ width: width * CELL, height: height * CELL }}>
      <AgGridReact<Row>
        modules={modules}
        theme={theme}
        rowData={rows}
        columnDefs={columns}
        getRowId={getRowId}
        rowHeight={CELL}
        headerHeight={0}
        suppressRowVirtualisation
        suppressColumnVirtualisation
        suppressCellFocus
        animateRows={false}
        suppressRowHoverHighlight
      />
    </div>
  );
}
