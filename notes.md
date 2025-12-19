# Notes

## InfluxDB Reference

### General commands
sqlite3 mydb.db        # Open/create database
.tables                # List tables
.schema table_name     # Show schema
.headers on
.mode column
.width 10,30
.quit                  # Exit

### Import / export
.mode csv
.import users.csv users
.output out.csv
SELECT * FROM users;
.output stdout

### Tables

#### HASS event data
event_data
event_types
state_attributes
statistics_runs
schema_changes
events
migration_changes
recorder_runs

#### Statistics
states_meta
states

statistics_meta
statistics
statistics_short_term



### Useful queries
SELECT id, unit_of_measurement AS unit, statistic_id FROM statistics_meta LIMIT 100;
SELECT state_id, entity_id, state, metadata_id FROM states LIMIT 10;

SELECT st.state_id, st.state, meta.entity_id
FROM states st
LEFT JOIN states_meta meta ON meta.metadata_id = st.metadata_id
LIMIT 10;

state.last_changed_ts,     # when the metric changed, not stored if same as last_updated
state.last_updated_ts      # when the metric or attributes changed

SELECT 
    st.state_id,
    st.state,
    meta.entity_id,
    st.last_changed_ts,
    st.last_updated_ts
FROM states st
LEFT JOIN states_meta meta ON meta.metadata_id = st.metadata_id
LIMIT 10;

DATETIME(IIF(st.last_changed_ts IS NULL,st.last_updated_ts,st.last_changed_ts), 'unixepoch', 'localtime') AS local,
STRFTIME('%Y-%m-%dT%H:%M:%fZ', IIF(st.last_changed_ts IS NULL,st.last_updated_ts,st.last_changed_ts), 'unixepoch') AS iso,

SELECT 
    st.state_id,
    st.old_state_id,
    st.state,
    meta.entity_id,
    STRFTIME('%Y-%m-%dT%H:%M:%fZ', IIF(st.last_changed_ts IS NULL,st.last_updated_ts,st.last_changed_ts), 'unixepoch') AS utc,
    st.last_changed_ts,
    st.last_updated_ts
FROM states st
LEFT JOIN states_meta meta ON meta.metadata_id = st.metadata_id
WHERE meta.entity_id LIKE '%downstairs_hallway_entry_button%'
ORDER BY st.state_id DESC LIMIT 100;

---
last_reset_ts # only set on "_energy_cost"

SELECT 
    stat.id,
    STRFTIME('%Y-%m-%dT%H:%M:%fZ', stat.created_ts, 'unixepoch') AS created_utc,
    STRFTIME('%Y-%m-%dT%H:%M:%fZ', stat.start_ts, 'unixepoch') AS started_utc,
    stat.mean,
    stat.min,
    stat.max,
    stat.sum,
    stat.created_ts,
    stat.start_ts,
    meta.unit_of_measurement AS unit,
    meta.statistic_id
FROM statistics stat
LEFT JOIN statistics_meta meta ON stat.metadata_id = meta.id
WHERE meta.statistic_id LIKE '%hourly%'
OR meta.statistic_id LIKE '%daily%'
OR meta.statistic_id LIKE '%monthly%'
OR meta.statistic_id LIKE '%today%'
OR meta.statistic_id LIKE '%this_month%'
ORDER BY stat.last_reset_ts DESC
LIMIT 100;

SELECT 
    stat.id,
    stat.state,
    STRFTIME('%Y-%m-%dT%H:%M:%fZ', stat.start_ts, 'unixepoch') AS start_utc,
    STRFTIME('%Y-%m-%dT%H:%M:%fZ', stat.created_ts, 'unixepoch') AS created_utc,
    meta.unit_of_measurement AS unit,
    meta.statistic_id
FROM statistics stat
LEFT JOIN statistics_meta meta ON stat.metadata_id = meta.id
WHERE meta.statistic_id LIKE '%.office_rack_ups_plug_%'
ORDER BY stat.created_ts DESC
LIMIT 200;

SELECT 
    stat.*,
    meta.*,
    STRFTIME('%Y-%m-%dT%H:%M:%fZ', stat.start_ts, 'unixepoch') AS start_utc,
    STRFTIME('%Y-%m-%dT%H:%M:%fZ', stat.created_ts, 'unixepoch') AS created_utc
FROM statistics stat
LEFT JOIN statistics_meta meta ON stat.metadata_id = meta.id
WHERE start_utc LIKE '2025-10%'
ORDER BY stat.created_ts DESC;


### TODO: look into long term statistics structure
