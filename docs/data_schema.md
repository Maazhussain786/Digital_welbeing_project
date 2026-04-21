# Data Schema

## Base Columns
- user_id: integer user identifier.
- timestamp: datetime of usage event.
- app: application/site name.
- category: normalized category.
- duration_minutes: usage duration.
- launches: launch count.
- interactions: interaction count.
- is_productive: binary indicator.
- is_time_wasting: binary indicator.

## Engineered Columns
- hour, day_of_week, is_weekend
- cumulative_time_today
- session_count_today
- time_since_last_session
- category_encoded
