from flask import Flask, render_template, jsonify, request
from datetime import datetime
import pytz
import os
import sqlite3

app = Flask(__name__)

DB_FILE = 'eggs.db'

def get_db_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    conn.execute('PRAGMA foreign_keys = ON')
    return conn

def init_db():
    conn = get_db_connection()
    conn.execute('''
        CREATE TABLE IF NOT EXISTS chickens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            is_active INTEGER DEFAULT 1,
            arrival_date TEXT,
            deactivation_date TEXT
        )
    ''')
    conn.execute('''
        CREATE TABLE IF NOT EXISTS egg_production (
            date TEXT NOT NULL,
            chicken_id INTEGER NOT NULL,
            laid BOOLEAN NOT NULL,
            PRIMARY KEY (date, chicken_id),
            FOREIGN KEY (chicken_id) REFERENCES chickens (id) ON DELETE CASCADE
        )
    ''')
    # Default chickens if table is empty
    cursor = conn.cursor()
    cursor.execute('SELECT COUNT(*) FROM chickens')
    if cursor.fetchone()[0] == 0:
        la_tz = pytz.timezone('America/Los_Angeles')
        today = datetime.now(la_tz).strftime('%Y-%m-%d')
        default_chickens = ['Larry', 'Iggy', 'Curly', 'Salt']
        for name in default_chickens:
            cursor.execute('INSERT INTO chickens (name, arrival_date) VALUES (?, ?)', (name, today))
    conn.commit()
    conn.close()

init_db()

@app.route('/')
def index():
    la_tz = pytz.timezone('America/Los_Angeles')
    today = datetime.now(la_tz).strftime('%Y-%m-%d')
    
    conn = get_db_connection()
    # Fetch egg data only for active chickens (or chickens that were active on that date)
    production = conn.execute('''
        SELECT ep.date, c.name as chicken_name, ep.laid
        FROM egg_production ep
        JOIN chickens c ON ep.chicken_id = c.id
    ''').fetchall()
    
    egg_data = {}
    for row in production:
        date = row['date']
        if date not in egg_data:
            egg_data[date] = {}
        egg_data[date][row['chicken_name']] = bool(row['laid'])
    
    conn.close()
    return render_template('index.html', today=today, egg_data=egg_data)

@app.route('/archive')
def archive_page():
    return render_template('archive.html')

@app.route('/update', methods=['POST'])
def update():
    data = request.get_json()
    date = data.get('date')
    chicken_name = data.get('chicken')
    laid_egg = data.get('laid_egg')

    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get chicken id
    cursor.execute('SELECT id FROM chickens WHERE name = ?', (chicken_name,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return jsonify(success=False, message="Chicken not found")
    
    chicken_id = row[0]
    
    # Update or insert egg production
    cursor.execute('''
        INSERT INTO egg_production (date, chicken_id, laid)
        VALUES (?, ?, ?)
        ON CONFLICT(date, chicken_id) DO UPDATE SET laid=excluded.laid
    ''', (date, chicken_id, laid_egg))
    
    conn.commit()
    
    # Fetch updated data for active chickens
    production = conn.execute('''
        SELECT ep.date, c.name as chicken_name, ep.laid
        FROM egg_production ep
        JOIN chickens c ON ep.chicken_id = c.id
        WHERE c.is_active = 1
    ''').fetchall()
    
    egg_data = {}
    for r in production:
        d = r['date']
        if d not in egg_data:
            egg_data[d] = {}
        egg_data[d][r['chicken_name']] = bool(r['laid'])
        
    chickens = [r['name'] for r in conn.execute('SELECT name FROM chickens WHERE is_active = 1').fetchall()]
    conn.close()

    return jsonify(success=True, egg_data=egg_data, chickens=chickens)

@app.route('/data')
def get_data():
    conn = get_db_connection()
    
    production = conn.execute('''
        SELECT ep.date, c.name as chicken_name, ep.laid
        FROM egg_production ep
        JOIN chickens c ON ep.chicken_id = c.id
        WHERE c.is_active = 1
    ''').fetchall()
    
    egg_data = {}
    for row in production:
        date = row['date']
        if date not in egg_data:
            egg_data[date] = {}
        egg_data[date][row['chicken_name']] = bool(row['laid'])
        
    chickens = [r['name'] for r in conn.execute('SELECT name FROM chickens WHERE is_active = 1').fetchall()]
    conn.close()
    
    full_data = egg_data
    full_data['chickens'] = chickens
    return jsonify(full_data)

@app.route('/get_chickens')
def get_chickens():
    conn = get_db_connection()
    chickens = [r['name'] for r in conn.execute('SELECT name FROM chickens WHERE is_active = 1').fetchall()]
    conn.close()
    return jsonify(success=True, chickens=chickens)

@app.route('/add_chicken', methods=['POST'])
def add_chicken():
    data = request.get_json()
    chicken_name = data.get('chicken_name')
    arrival_date = data.get('arrival_date')
    
    if not chicken_name:
        return jsonify(success=False, message='Chicken name cannot be empty.')
    
    if not arrival_date:
        la_tz = pytz.timezone('America/Los_Angeles')
        arrival_date = datetime.now(la_tz).strftime('%Y-%m-%d')

    conn = get_db_connection()
    try:
        conn.execute('INSERT INTO chickens (name, arrival_date, is_active) VALUES (?, ?, 1)', (chicken_name, arrival_date))
        conn.commit()
    except sqlite3.IntegrityError:
        # Check if it was just deactivated
        cursor = conn.cursor()
        cursor.execute('SELECT is_active FROM chickens WHERE name = ?', (chicken_name,))
        row = cursor.fetchone()
        if row and row[0] == 0:
            conn.execute('UPDATE chickens SET is_active = 1, arrival_date = ?, deactivation_date = NULL WHERE name = ?', (arrival_date, chicken_name))
            conn.commit()
        else:
            conn.close()
            return jsonify(success=False, message='Chicken already exists.')
    
    chickens = [r['name'] for r in conn.execute('SELECT name FROM chickens WHERE is_active = 1').fetchall()]
    conn.close()

    return jsonify(success=True, chickens=chickens)

@app.route('/remove_chicken', methods=['POST'])
def remove_chicken():
    chicken_name = request.json.get('chicken_name')
    if not chicken_name:
        return jsonify(success=False, message='Chicken name required.')

    la_tz = pytz.timezone('America/Los_Angeles')
    today = datetime.now(la_tz).strftime('%Y-%m-%d')

    conn = get_db_connection()
    conn.execute('UPDATE chickens SET is_active = 0, deactivation_date = ? WHERE name = ?', (today, chicken_name))
    conn.commit()
    
    chickens = [r['name'] for r in conn.execute('SELECT name FROM chickens WHERE is_active = 1').fetchall()]
    conn.close()

    return jsonify(success=True, chickens=chickens)

@app.route('/get_archive')
def get_archive():
    conn = get_db_connection()
    archive_data = conn.execute('''
        SELECT 
            c.name, 
            c.is_active, 
            c.arrival_date, 
            c.deactivation_date,
            COUNT(ep.laid) FILTER (WHERE ep.laid = 1) as lifetime_eggs
        FROM chickens c
        LEFT JOIN egg_production ep ON c.id = ep.chicken_id
        GROUP BY c.id
        ORDER BY c.is_active DESC, c.name ASC
    ''').fetchall()
    
    result = []
    for row in archive_data:
        result.append({
            'name': row['name'],
            'status': 'Active' if row['is_active'] else 'Retired',
            'arrival_date': row['arrival_date'],
            'deactivation_date': row['deactivation_date'] or 'N/A',
            'lifetime_eggs': row['lifetime_eggs']
        })
    
    conn.close()
    return jsonify(success=True, archive=result)

@app.route('/update_chicken_dates', methods=['POST'])
def update_chicken_dates():
    data = request.get_json()
    chicken_name = data.get('name')
    arrival_date = data.get('arrival_date')
    deactivation_date = data.get('deactivation_date')

    if not chicken_name:
        return jsonify(success=False, message='Chicken name required.')

    conn = get_db_connection()
    try:
        # Convert 'N/A' or empty strings back to NULL for the database
        db_deactivation_date = deactivation_date if deactivation_date and deactivation_date != 'N/A' else None
        
        conn.execute('''
            UPDATE chickens 
            SET arrival_date = ?, deactivation_date = ? 
            WHERE name = ?
        ''', (arrival_date, db_deactivation_date, chicken_name))
        conn.commit()
        success = True
        message = 'Dates updated successfully.'
    except Exception as e:
        success = False
        message = str(e)
    finally:
        conn.close()

    return jsonify(success=success, message=message)


if __name__ == '__main__':
    try:
        app.run(port=5000)
    except Exception as e:
        print(f"Error starting server: {e}")
