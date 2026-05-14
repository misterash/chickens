# Chicken Egg Counter

A simple Flask-based web application for tracking egg production of individual chickens.

## Project Overview

- **Purpose**: To allow users to record and view egg counts for each chicken on a daily basis.
- **Backend**: Python with the [Flask](https://flask.palletsprojects.com/) web framework.
- **Frontend**: HTML/JavaScript using [Materialize CSS](https://materializecss.com/) for a modern, responsive UI.
- **Persistence**: Data is stored locally in `eggs.db` using SQLite.
- **Key Features**:
    - Add and remove chickens.
    - Toggle egg production for each chicken per date.
    - Summary view with date range filtering.
    - Dark mode support.

## Project Structure

- `app.py`: The main Flask application containing API routes and data management logic.
- `eggs.db`: The SQLite database file.
- `static/`: Contains static assets like `app.js` and `style.css`.
- `templates/`: Contains the Jinja2 HTML templates (e.g., `index.html`).
- `pyproject.toml`: Project configuration and dependencies (managed by [uv](https://docs.astral.sh/uv/)).
- `Dockerfile`: Configuration for containerizing the application.

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

- **Data Management**: The application uses SQLite (`eggs.db`) for persistent storage. Data is queried and updated via SQL, ensuring consistency and enabling concurrent access.
- **API Endpoints**:
    - `GET /`: Serves the main application.
    - `POST /update`: Updates egg data for a specific date and chicken.
    - `GET /data`: Returns the full egg data JSON.
    - `GET /get_chickens`: Returns the list of chickens.
    - `POST /add_chicken`: Adds a new chicken to the list.
    - `POST /remove_chicken`: Removes a chicken and its associated data.
- **Timezones**: Uses `America/Los_Angeles` by default for the "today" date calculation.
- **Frontend State**: The frontend maintains a local `window.egg_data` object that is synchronized with the backend on updates.
