# Power Monitoring POC - Porting Plan

This document outlines the plan to port the power-monitoring-poc into the main Home Automation Controller application.

---

## POC Architecture Summary

### Main Components / Processes

#### 1. Data Layer (Pre-processing)
**File:** `server/src/pre-process-data.js`

- **Input:** CSV files exported from Home Assistant (stored in `data/inbox/`)
- **Processing:**
  - Parses CSV rows and derives: metric type, object (device), aggregation period, date/time fields
  - Deduplicates entries (keeps largest value per device per period)
  - Groups data by hourly, daily, and monthly aggregations
- **Output:** JSON files in `data/processed/` with naming convention:
  - `{year}.{metric}.monthly.json`
  - `{year}-{month}.{metric}.daily.json`
  - `{year}-{month}-{day}.{metric}.hourly.json`

#### 2. API Layer (Express Server)
**File:** `server/src/index.ts`

- **Single endpoint:** `GET /data/:metric/:year`
- **Query params:** `?month=MM` and `?day=DD` for granularity
- **Logic:**
  - No month → returns monthly data
  - Month only → returns daily data
  - Month + day → returns hourly data
- Reads JSON files from `data/processed/` and returns `{ results: [...] }`

#### 3. Dashboard Layer (HTML + JS)
**Files:** `dashboards/home-automation.html`, `dashboards/home-automation.js`

- Loads external libraries (ECharts, Moment.js from CDN)
- Fetches data via API endpoint
- Passes data to the `<bar-chart-2>` web component via attributes

#### 4. Component Layer (Web Component)
**File:** `components/charts/bar-chart-2.js`

- **Custom Element:** `<bar-chart-2>`
- **Observed Attributes:** `config`, `dataset`
- **Key Features:**
  - Groups data by x-axis (hour/day/month) and series (devices)
  - Unit normalization (cents ↔ euros)
  - Calculates per-device totals
  - Sorts series by total value or alphabetically
  - Filters out zero-value devices
  - Renders stacked bar chart via ECharts
  - Legend shows humanized names + totals (e.g., "Kitchen Kettle Plug (€3.42)")

---

### Data Entry Shape (Post-Processing)

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

---

## Porting Plan

### Phase 1: Backend Services

1. **Create `src/power-monitoring/` module:**
   - `power-monitoring.service.ts` — Main service class for data operations
   - `power-monitoring.interfaces.ts` — TypeScript interfaces for data shapes
   - `power-monitoring.processor.ts` — Port pre-processing logic from JS to TS

2. **Create API endpoints in `src/index.ts`:**
   - `GET /ui/power-monitoring/data/:metric/:year` — Main data API
   - Add authentication checks (same as existing pages)

3. **Data directory setup:**
   - Configure paths: `DIR_POWER_MONITORING_INBOX`, `DIR_POWER_MONITORING_PROCESSED`
   - Optionally add file monitoring to auto-process new CSV files

### Phase 2: Frontend Integration

4. **Update `src/ui/power-monitoring.page.ts`:**
   - Port the dashboard HTML with ECharts/Moment.js CDN includes
   - Embed the bar-chart-2 web component code inline (or serve as static asset)
   - Add metric/date selector controls
   - Add JavaScript for API calls and component data binding

### Phase 3: Enhanced Features & Data Source Options

#### 3A: UI Enhancements
5. **Add aggregation level controls** (hourly/daily/monthly toggle) — ✅ Completed
6. **Add date/metric selectors** (dropdowns or date pickers) — ✅ Completed
7. **Implement drill-down navigation** (click bar → zoom to hourly view)
8. **Device categorization** (group devices by type: technical, lifestyle, etc.)
9. **Tooltip customization** (show detailed breakdown on hover)
10. **Dynamic canvas sizing** (auto-size based on container)

#### 3B: Data Source Options

**Current Implementation:** CSV Export + Pre-processing (Manual/Scheduled)

**Alternative Data Sources to Consider:**

**Option 1: Direct SQLite Query** (Database Access)
- Mount HASS SQLite database as read-only volume
- Query `statistics` or `states` tables directly
- Aggregate data on-the-fly in your service
- **Pros:** Real-time, no export needed, direct control
- **Cons:** Database locking risk, large DB, slower aggregations, schema coupling
- **When to use:** Need maximum performance with real-time data, comfortable with DB risks

**Option 2: Home Assistant REST API** (HTTP API)
- Query HASS REST API endpoints (`/api/history/period`, `/api/states`)
- Use HASS's built-in aggregation features
- **Pros:** Real-time, stable API, no DB locking, schema-independent
- **Cons:** Network latency, HASS dependency, rate limits, multiple API calls for large ranges
- **When to use:** Need real-time data with decoupling from HASS internals

**Option 3: Hybrid Approach** (Recommended)
- Query HASS REST API periodically (e.g., hourly via cron)
- Cache aggregated results in processed directory
- Serve from cache with auto-refresh
- Display "last updated" timestamp in UI
- **Pros:** Near real-time, fast responses, reduced HASS load, fallback capability
- **Cons:** More complex, requires cache storage, data delayed by refresh interval
- **When to use:** Need balance of performance, reliability, and near real-time updates

**Implementation Tasks for Data Source Alternatives:**
- [ ] Create Home Assistant REST API connector
- [ ] Add authentication token management
- [ ] Implement periodic sync job (cron-based)
- [ ] Add "last updated" timestamp to UI
- [ ] Create SQLite query service (if Option 1 chosen)
- [ ] Add database read-only mount configuration

---

## New Files Structure

```
src/power-monitoring/
├── power-monitoring.interfaces.ts    # TypeScript interfaces for data shapes
├── power-monitoring.service.ts       # API + data service  
├── power-monitoring.processor.ts     # CSV → JSON processing logic

src/ui/
└── power-monitoring.page.ts          # Update existing placeholder with full UI
```

---

## Implementation Checklist

- [x] Create `src/power-monitoring/power-monitoring.interfaces.ts`
- [x] Create `src/power-monitoring/power-monitoring.processor.ts`
- [x] Create `src/power-monitoring/power-monitoring.service.ts`
- [x] Add data API endpoint `/ui/power-monitoring/data/:metric/:year`
- [x] Update `power-monitoring.page.ts` with ECharts and controls
- [x] Integrate bar-chart-2 web component (ECharts inline implementation)
- [x] Add metric selector (running_cost, energy_usage, time_in_use)
- [x] Add date selectors (year, month, day)
- [x] Add aggregation level toggle (hourly/daily/monthly)
- [ ] Test with sample data
- [ ] Configure data directories in Docker setup

---

## Current Gaps in POC (Not Yet Implemented)

| Feature | Status |
|---------|--------|
| Drill-down navigation | ❌ Not yet implemented |
| Multiple metrics toggle | ❌ Not yet implemented |
| Device categorisation | ❌ Commented out |
| Tooltip customisation | ❌ TODOs in code |
| Dynamic canvas sizing | ❌ Hardcoded to 1000×500 |
| Multi-month/year support | ❌ Pre-processing hardcoded to single month |

---

## Dependencies

- **ECharts** — Chart library (loaded from CDN)
- **Moment.js** — Date handling (loaded from CDN)
- **Express.js** — Already in use in main app
