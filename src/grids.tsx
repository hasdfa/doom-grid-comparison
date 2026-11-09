import { memo } from 'react';
import { HEIGHT, WIDTH, type PixelElement } from './pixels';
import { PremiumGrid } from './renderers/premium';
import { MosaicGrid } from './renderers/mosaic';
import { AgGrid } from './renderers/aggrid';
import { TanStackGrid } from './renderers/tanstack';
import { MuiHeatmap } from './renderers/mui-heatmap';
import { BaseHeatmap } from './renderers/base-heatmap';
import { SchedulerGrid } from './renderers/scheduler';

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
  { id: 'mosaic', label: 'Base UI Mosaic', version: 'Mosaic data-source · da4474be8f3d' },
  { id: 'aggrid', label: 'AG Grid', version: 'AG Grid Community 36.3.0' },
  { id: 'tanstack', label: 'TanStack Table', version: 'TanStack Table 9.3.1' },
  { id: 'mui-heatmap', label: 'MUI X Heatmap', version: 'MUI X Charts 9.17.0' },
  { id: 'base-heatmap', label: 'Base UI Heatmap', version: 'Base UI Charts · db47a70f7ab9' },
  { id: 'scheduler', label: 'MUI X Scheduler', version: 'Scheduler 9.0.0-beta.15' },
];

const adapters = {
  premium: PremiumGrid,
  mosaic: MosaicGrid,
  aggrid: AgGrid,
  tanstack: TanStackGrid,
  'mui-heatmap': MuiHeatmap,
  'base-heatmap': BaseHeatmap,
  scheduler: SchedulerGrid,
};

export const PixelGrid = memo(function PixelGrid({
  renderer,
  cells,
  width = WIDTH,
  height = HEIGHT,
}: {
  renderer: Renderer;
  cells: (PixelElement | null)[];
  width?: number;
  height?: number;
}) {
  const Adapter = adapters[renderer];
  return <Adapter cells={cells} width={width} height={height} />;
});
