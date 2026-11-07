# Base UI Charts source build

Built from `mui/base-ui-charts` commit `db47a70f7ab983eb1483910521b542b9695fe307`.
The package is not currently published to the checked registries.

Run `pnpm install --ignore-scripts`, `pnpm --filter @base-ui/charts-vendor build`, and `pnpm --filter @base-ui/charts build` in that revision.
Archive each generated `build` directory as `package/`. Set the package versions to `0.0.0-source.db47a70f7ab9`.
The local override resolves the vendor package without publishing anything.
Library source and license terms are unchanged.

# Base UI Mosaic source build

Built from `mui/base-ui-mosaic` commit `2ae53b9ee2cb5f0b20cdc518b30ace2209d84b6f`, the latest default-branch revision on 2026-11-05.
Run `pnpm install --ignore-scripts` and `pnpm --filter @base-ui/mosaic build` at that revision.
Set the generated `packages/mosaic/build/package.json` version to `0.0.0-source.2ae53b9ee2cb`.
Archive the generated `build` directory as `package/` into `base-ui-mosaic-2ae53b9ee2cb.tgz`.
The app consumes this local archive instead of the published `@base-ui-private/mosaic` package.
Library source and license terms are unchanged.

Base UI Charts revision `db47a70f7ab983eb1483910521b542b9695fe307` was also verified as the latest default-branch revision on 2026-11-05.
