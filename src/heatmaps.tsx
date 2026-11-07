import { useMemo } from 'react';
import { CartesianChart } from '@base-ui/charts/cartesian-chart';
import { HeatmapPlot } from '@base-ui/charts/heatmap-plot';
import { Heatmap, HeatmapCell, type HeatmapCellProps } from '@mui/x-charts-premium/Heatmap';
import { CELL, type PixelElement } from './pixels';

export type HeatmapProps = { cells: (PixelElement | null)[]; width: number; height: number };

export function MuiHeatmap({ cells, width, height }: HeatmapProps) {
  const data = useMemo(
    () =>
      Array.from(
        { length: width * height },
        (_, index) => [index % width, Math.floor(index / width), index] as const,
      ),
    [width, height],
  );
  const slots = useMemo(
    () => ({
      cell: function Pixel(props: HeatmapCellProps) {
        return (
          <HeatmapCell
            {...props}
            className="chart-pixel"
            ref={(node) => {
              cells[props.ownerState.value] = node;
            }}
          />
        );
      },
    }),
    [cells],
  );
  return (
    <Heatmap
      width={width * CELL}
      height={height * CELL}
      margin={0}
      series={[{ id: 'doom', data }]}
      xAxis={[
        { data: Array.from({ length: width }, (_, i) => i), position: 'none', categoryGapRatio: 0 },
      ]}
      yAxis={[
        {
          data: Array.from({ length: height }, (_, i) => i),
          position: 'none',
          reverse: false,
          categoryGapRatio: 0,
        },
      ]}
      hideLegend
      slots={slots}
      tooltip={{ trigger: 'none' }}
    />
  );
}

export function BaseHeatmap({ cells, width, height }: HeatmapProps) {
  const data = useMemo(
    () => ({
      x: Array.from({ length: width * height }, (_, i) => i % width),
      y: Array.from({ length: width * height }, (_, i) => Math.floor(i / width)),
    }),
    [width, height],
  );
  return (
    <CartesianChart.Root
      data={data}
      xAxis={{ id: 'x', dataKey: 'x', scale: 'band' }}
      yAxis={{ id: 'y', dataKey: 'y', scale: 'band', reverse: true }}
      series={{ id: 'doom', dataKeys: { x: 'x', y: 'y' } }}
      style={{ width: width * CELL, height: height * CELL }}
    >
      <CartesianChart.Surface width={width * CELL} height={height * CELL}>
        <HeatmapPlot.Root series="doom">
          <HeatmapPlot.Points>
            {(points) =>
              points.map((point) => (
                <HeatmapPlot.Cell
                  key={point.index}
                  point={point}
                  state={null}
                  className="chart-pixel"
                  ref={(node) => {
                    cells[point.index] = node;
                  }}
                />
              ))
            }
          </HeatmapPlot.Points>
        </HeatmapPlot.Root>
      </CartesianChart.Surface>
    </CartesianChart.Root>
  );
}
