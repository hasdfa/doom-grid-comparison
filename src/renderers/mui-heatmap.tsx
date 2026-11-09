import { useCallback, useMemo } from 'react';
import {
  Heatmap,
  HeatmapCell,
  type HeatmapCellProps,
  type HeatmapProps,
} from '@mui/x-charts-premium/Heatmap';
import { CELL, type PixelElement } from '../pixels';

// Every value needs a color or the plot omits its cell. The painter owns subsequent fills.
const zAxis: HeatmapProps['zAxis'] = [
  { colorMap: { type: 'piecewise', thresholds: [], colors: ['#080906'] } },
];
const emptyTooltip = () => null;

export function MuiHeatmap({
  cells,
  width,
  height,
}: {
  cells: (PixelElement | null)[];
  width: number;
  height: number;
}) {
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
      tooltip: emptyTooltip,
      cell: function Pixel(props: HeatmapCellProps) {
        const index = props.ownerState.value;
        const register = useCallback(
          (node: SVGRectElement | null) => {
            if (!node) return;
            cells[index] = node;
            return () => {
              if (cells[index] === node) cells[index] = null;
            };
          },
          [cells, index],
        );
        return (
          <HeatmapCell
            {...props}
            className={[props.className, 'chart-pixel'].filter(Boolean).join(' ')}
            ref={register}
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
      zAxis={zAxis}
      hideLegend
      disableKeyboardNavigation
      slots={slots}
    />
  );
}
