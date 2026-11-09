import { useMemo } from 'react';
import { CartesianChart } from '@base-ui/charts/cartesian-chart';
import { HeatmapPlot } from '@base-ui/charts/heatmap-plot';
import { CELL, type PixelElement } from '../pixels';

const series = { id: 'doom', dataKeys: { x: 'x', y: 'y' } };

export function BaseHeatmap({
  cells,
  width,
  height,
}: {
  cells: (PixelElement | null)[];
  width: number;
  height: number;
}) {
  const { data, xAxis, yAxis } = useMemo(() => {
    // Explicit band domains skip coordinate scans and must match the column value types.
    const xDomain = Array.from({ length: width }, (_, i) => String(i));
    const yDomain = Array.from({ length: height }, (_, i) => String(i));
    return {
      data: {
        x: Array.from({ length: width * height }, (_, i) => xDomain[i % width]),
        y: Array.from({ length: width * height }, (_, i) => yDomain[Math.floor(i / width)]),
      },
      xAxis: { id: 'x', dataKey: 'x', scale: { type: 'band' as const, domain: xDomain } },
      yAxis: {
        id: 'y',
        dataKey: 'y',
        scale: { type: 'band' as const, domain: yDomain },
        reverse: true,
      },
    };
  }, [width, height]);

  return (
    <CartesianChart.Root
      data={data}
      xAxis={xAxis}
      yAxis={yAxis}
      series={series}
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
                    if (!node) return;
                    cells[point.index] = node;
                    return () => {
                      if (cells[point.index] === node) cells[point.index] = null;
                    };
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
