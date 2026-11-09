# Mosaic branch comparison

The report contains 160 observations: 20 passes per build, resolution, and workload.
Passes 1–10 used T3 headless Chrome 157. Passes 11–20 used visible Chrome 154 on a VNC desktop.
Both groups used a 1280 × 800 viewport and DPR 2. Build order alternated by pass.
The report separates browser groups and includes all observations without exclusions.
Server load varied substantially. Combined means describe a mixed browser and load sample.
These tests measure direct cell painting, not row-update API throughput.

- Master: `2ae53b9ee2cb5f0b20cdc518b30ace2209d84b6f`
- Data source: `da4474be8f3dc8b89c16612a2311b67477602b9c`
- Resolutions: 96 × 60 and 320 × 200
- Workloads: three-second DOOM walk/shoot and 60 synthetic color frames

`results.json` records each observation. `summary.json` contains combined means and sample standard deviations.
`index.html` displays the charts, per-browser averages, methodology, and raw observations.
FPS values were recorded from the UI at one decimal place.

Published report: https://doom-mosaic-ten-passes-nov9-a419.seemyslop.online/

Run `DISPLAY=:1 node tests/mosaic-vnc-measure.mjs` on a desktop with Google Chrome installed.
Set `BENCHMARK_OUTPUT` and `BENCHMARK_PROFILE` to use separate result and profile paths.
The script records passes 11–20 against pinned hosted builds and resumes completed observations.
It opens a separate visible Chrome profile and closes that profile after completion.
