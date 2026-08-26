# Power Monitoring Web Component

## Goal

Build a reusable web component (PoC) that visualises household electricity monitoring data as a stacked bar chart. The component is designed to eventually be embedded inside another application, but is currently being developed as a standalone proof-of-concept.

---

## Requirements

### Functional Requirements

1. **Visualise electricity data** from Home Assistant smart plugs as a **stacked bar chart** (using ECharts)
2. **Support three metrics**:
   - `running_cost` — cost in €/cents per device
   - `energy_usage` — kWh consumed per device
   - `time_in_use` — duration of device activity
3. **Support three aggregation levels** (time granularity):
   - **Hourly** — 24 bars per day, each bar stacked by device
   - **Daily** — up to 31 bars per month, each bar stacked by device
   - **Monthly** — 12 bars per year, each bar stacked by device
4. **Stacked bars by device** — each segment in the stack represents one smart plug/device (e.g. kitchen kettle, washing machine, office desk, etc.)
5. **Legend with totals** — series names are humanized (underscores → title case) and include the total cost/value in the legend label (e.g. "Kitchen Kettle Plug (€3.42)")
6. **Series sorting** — devices sorted by total value (highest cost at bottom of stack) or alphabetically
7. **Zero-value filtering** — devices with zero total are excluded from the chart
8. **Unit normalisation** — handles mixed units (cents vs €/EUR), converting everything to a consistent unit for display

### Non-Functional Requirements

- **Native Web Components** — uses Shadow DOM and Custom Elements API (no framework)
- **Embeddable** — designed to be included in other apps via `<bar-chart-2>` custom element
- **Data via attributes** — component receives `config` and `dataset` as JSON string attributes
- **CDN dependencies** — ECharts loaded from CDN, Moment.js for date handling

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│  DATA LAYER                                                      │
│                                                                  │
│  Home Assistant → CSV export → data/inbox/                       │
│       │                                                          │
│       ▼                                                          │
│  pre-process-data.js                                             │
│  - Parses CSV rows                                               │
│  - Derives: metric, object, aggregation_period, year/month/day   │
│  - Deduplicates (keeps largest value per object per period)       │
│  - Writes JSON files to data/processed/                          │
│  - Writes metadata to data/metadata/                             │
│       │                                                          │
│       ▼                                                          │
│  File naming convention:                                         │
│  - {year}.{metric}.monthly.json                                  │
│  - {year}-{month}.{metric}.daily.json                            │
│  - {year}-{month}-{day}.{metric}.hourly.json                     │
└──────────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│  API LAYER — Express.js Server (server/src/index.ts)             │
│                                                                  │
│  GET /data/:metric/:year              → monthly JSON             │
│  GET /data/:metric/:year?month=MM     → daily JSON               │
│  GET /data/:metric/:year?month=MM&day=DD → hourly JSON           │
│                                                                  │
│  Reads from data/processed/, matches files via regex,            │
│  returns { results: [...] }                                      │
└──────────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│  DASHBOARD LAYER — dashboards/                                   │
│                                                                  │
│  home-automation.html                                            │
│  - Loads ECharts + Moment.js from CDN                            │
│  - Loads bar-chart-2 web component                               │
│  - Contains a single <bar-chart-2 id="day"> element              │
│                                                                  │
│  home-automation.js                                              │
│  - Fetches hourly running_cost data for all days in Oct 2025     │
│  - Formats dataset and passes it to <bar-chart-2> via            │
│    setAttribute('dataset', JSON.stringify(data))                  │
│  - Also sets config attribute                                    │
└──────────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│  COMPONENT LAYER — components/charts/                            │
│                                                                  │
│  bar-chart-2.js (active, ECharts-based)                          │
│  ┌────────────────────────────────────────────────────────┐      │
│  │  <bar-chart-2> Custom Element                          │      │
│  │                                                        │      │
│  │  Observed attributes: config, dataset                  │      │
│  │                                                        │      │
│  │  Config shape:                                         │      │
│  │  {                                                     │      │
│  │    yProperty: 'value',         // y-axis data field    │      │
│  │    xPropery: 'hour',           // x-axis data field    │      │
│  │    seriesProperty: 'object',   // stack grouping field  │      │
│  │    seriesSort: 'total',        // sort order            │      │
│  │    xValues?: [...],            // auto-derived          │      │
│  │    seriesValues?: [...],       // auto-derived          │      │
│  │  }                                                     │      │
│  │                                                        │      │
│  │  Rendering:                                            │      │
│  │  - Groups data by x-axis value and series              │      │
│  │  - Normalises units (cents/€/EUR → €)                  │      │
│  │  - Calculates per-device totals                        │      │
│  │  - Sorts series by total (descending) or alphabetic     │      │
│  │  - Renders stacked bar chart via echarts.init(canvas)  │      │
│  │  - Legend shows humanized names + totals               │      │
│  └────────────────────────────────────────────────────────┘      │
│                                                                  │
│  bar-chart.js (deprecated, Chart.js-based)                       │
│  - Earlier iteration using Chart.js instead of ECharts           │
│  - Same pattern but with labels/datasets attributes              │
└──────────────────────────────────────────────────────────────────┘
```

### Data Entry Shape (after pre-processing)

```json
{
  "id": "string",
  "value": 0.42,
  "unit": "cents | € | EUR",
  "year": "2025",
  "month": "10",
  "day": "15",
  "hour": "14",
  "type": "string",
  "object": "kitchen_kettle_plug",
  "metric": "running_cost",
  "aggregation_period": "hourly"
}
```

### Component Evolution

- **v1** (`bar-chart.js`): Used **Chart.js**, received pre-formatted `labels` and `datasets` arrays
- **v2** (`bar-chart-2.js`): Switched to **ECharts**, receives raw `dataset` + `config`, does its own data transformation (grouping, unit conversion, sorting)

---

## Current State & Gaps

| Area | Status |
|------|--------|
| Data pre-processing | ✅ Working (hardcoded to Oct 2025) |
| Express API server | ✅ Working |
| Bar chart component (ECharts) | ✅ Working prototype |
| Dashboard page | ✅ Basic — single chart, hardcoded to hourly/running_cost/Oct 2025 |
| Drill-down navigation | ❌ Not yet implemented |
| Multiple metrics toggle | ❌ Not yet implemented |
| Device categorisation | ❌ Commented out |
| Tooltip customisation | ❌ TODOs in code |
| Dynamic sizing | ❌ Canvas hardcoded to 1000×500 |
| Multi-month/year support | ❌ Pre-processing hardcoded to single month |
