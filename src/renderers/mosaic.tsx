import { useMemo } from 'react';
import { DataGrid as Mosaic } from '@base-ui/mosaic';
import { useClientDataSource } from '@base-ui/mosaic/client-data-source';
import { CELL, type PixelElement } from '../pixels';
import './mosaic.css';

export function MosaicGrid({
  cells,
  width,
  height,
}: {
  cells: (PixelElement | null)[];
  width: number;
  height: number;
}) {
  const rows = useMemo(() => Array.from({ length: height }, (_, id) => ({ id })), [height]);
  const columns = useMemo(
    () =>
      Array.from({ length: width }, (_, x) => ({
        id: `c${x}`,
        defaultSize: CELL,
        minSize: CELL,
        sortable: false,
      })),
    [width],
  );
  const dataSource = useClientDataSource({ rows, columns });
  const cellRefs = useMemo(
    () =>
      Array.from({ length: width * height }, (_, index) => (node: HTMLDivElement | null) => {
        if (!node) return;
        cells[index] = node;
        return () => {
          // A replacement can register before the old cell's cleanup runs.
          if (cells[index] === node) cells[index] = null;
        };
      }),
    [cells, width, height],
  );

  return (
    <Mosaic.Root
      dataSource={dataSource}
      columns={columns}
      rowHeight={CELL}
      headerRowHeight={0}
      virtualization={false}
      className="mosaic-grid"
      style={{ width: width * CELL, height: height * CELL }}
    >
      <Mosaic.Viewport>
        <Mosaic.Table aria-label="DOOM pixel grid">
          <Mosaic.Body>
            {(row) =>
              row.loaded ? (
                <Mosaic.Row key={row.id}>
                  {(cell) => (
                    <Mosaic.Cell
                      key={cell.column.id}
                      className="mosaic-cell"
                      ref={cellRefs[Number(row.id) * width + Number(cell.column.id.slice(1))]}
                    />
                  )}
                </Mosaic.Row>
              ) : null
            }
          </Mosaic.Body>
        </Mosaic.Table>
      </Mosaic.Viewport>
    </Mosaic.Root>
  );
}
