# 🐔 Chicken Egg Counter 🥚

A simple Flask-based web application for tracking egg production of individual chickens with a focus on historical preservation and a modern farm aesthetic.

## Project Overview

- **Purpose**: To allow users to record and view egg counts for each chicken on a daily basis and track lifetime performance.
- **Backend**: Python with the [Flask](https://flask.palletsprojects.com/) web framework.
- **Frontend**: HTML/JavaScript using [Materialize CSS](https://materializecss.com/) with a custom **"Modern Farm"** theme.
- **Persistence**: Data is stored locally in `eggs.db` using SQLite.
- **Key Features**:
    - **Active Tracking**: Toggle egg production for each chicken per date on the main dashboard.
    - **Flock Archive**: A dedicated page for viewing all chickens (past and present) with lifetime statistics.
    - **Soft-Deletion (Retirement)**: Chickens are "retired" rather than deleted, preserving all their historical production data.
    - **Lifespan Tracking**: Record arrival and departure dates for every bird.
    - **Modern Farm Aesthetic**: A warm, organic UI using Meadow Green, Eggshell, and Terracotta tones.
    - **Dark Mode Support**: A refined "Deep Forest" dark theme for nighttime tracking.

## Project Structure

- `app.py`: The main Flask application containing API routes and SQLite data management.
- `eggs.db`: The SQLite database file.
- `static/`:
    - `app.js`: Frontend logic for the main tracker.
    - `archive.js`: Frontend logic for the archive and statistics view.
    - `style.css`: Custom "Modern Farm" styles and responsive design.
- `templates/`:
    - `index.html`: Main dashboard template.
    - `archive.html`: Archive and lifetime stats template.
- `pyproject.toml`: Project configuration and dependencies (managed by [uv](https://docs.astral.sh/uv/)).
- `Dockerfile`: Multi-stage build for containerizing the application using `uv`.

## Building and Running

### Local Development

1. **Install Dependencies**:
   ```bash
   uv sync
   ```

2. **Run the Application**:
   ```bash
   uv run app.py
   ```
   The app will be available at `http://localhost:5000`.

### Docker

1. **Build the Image**:
   ```bash
   docker build -t chicken-egg-counter .
   ```

2. **Run the Container**:
   ```bash
   docker run -p 5000:5000 chicken-egg-counter
   ```

## Development Conventions

- **Data Management**: The application uses a relational schema in SQLite. 
    - Chickens are never hard-deleted; the `is_active` flag handles visibility.
    - All egg production records are linked via foreign keys with `ON DELETE CASCADE`.
- **API Endpoints**:
    - `GET /`: Serves the main tracker dashboard.
    - `GET /archive`: Serves the Flock Archive page.
    - `POST /update`: Updates egg data for a specific date and chicken.
    - `GET /data`: Returns the full egg data JSON for active chickens.
    - `GET /get_chickens`: Returns the list of currently active chickens.
    - `GET /get_archive`: Returns comprehensive statistics for all chickens.
    - `POST /add_chicken`: Adds a new chicken (requires `chicken_name`, optional `arrival_date`).
    - `POST /remove_chicken`: Retires a chicken by setting `is_active = 0` and recording a deactivation date.
    - `POST /update_chicken_dates`: Updates historical arrival/departure dates for a bird.
- **UI/UX**: 
    - **Fonts**: Uses "Shadows Into Light" for a handwritten feel, with "Roboto" for numerical readability.
    - **Mobile First**: Tables and cards are optimized for readability on small screens.
- **Timezones**: Uses `America/Los_Angeles` by default for the "today" date calculation.
