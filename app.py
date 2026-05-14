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
            name TEXT UNIQUE NOT NULL
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
        default_chickens = ['Larry', 'Iggy', 'Curly', 'Salt']
        for name in default_chickens:
            cursor.execute('INSERT INTO chickens (name) VALUES (?)', (name,))
    conn.commit()
    conn.close()

init_db()

@app.route('/')
def index():
    la_tz = pytz.timezone('America/Los_Angeles')
    today = datetime.now(la_tz).strftime('%Y-%m-%d')
    
    conn = get_db_connection()
    # Fetch all egg data and structure it as {date: {chicken_name: laid}}
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
    
    # Fetch updated data for return
    production = conn.execute('''
        SELECT ep.date, c.name as chicken_name, ep.laid
        FROM egg_production ep
        JOIN chickens c ON ep.chicken_id = c.id
    ''').fetchall()
    
    egg_data = {}
    for r in production:
        d = r['date']
        if d not in egg_data:
            egg_data[d] = {}
        egg_data[d][r['chicken_name']] = bool(r['laid'])
        
    chickens = [r['name'] for r in conn.execute('SELECT name FROM chickens').fetchall()]
    conn.close()

    return jsonify(success=True, egg_data=egg_data, chickens=chickens)

@app.route('/data')
def get_data():
    conn = get_db_connection()
    
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
        
    chickens = [r['name'] for r in conn.execute('SELECT name FROM chickens').fetchall()]
    conn.close()
    
    # Maintain same format as JSON
    full_data = egg_data
    full_data['chickens'] = chickens
    return jsonify(full_data)

@app.route('/get_chickens')
def get_chickens():
    conn = get_db_connection()
    chickens = [r['name'] for r in conn.execute('SELECT name FROM chickens').fetchall()]
    conn.close()
    return jsonify(success=True, chickens=chickens)

@app.route('/add_chicken', methods=['POST'])
def add_chicken():
    chicken_name = request.json.get('chicken_name')
    if not chicken_name:
        return jsonify(success=False, message='Chicken name cannot be empty.')

    conn = get_db_connection()
    try:
        conn.execute('INSERT INTO chickens (name) VALUES (?)', (chicken_name,))
        conn.commit()
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify(success=False, message='Chicken already exists.')
    
    chickens = [r['name'] for r in conn.execute('SELECT name FROM chickens').fetchall()]
    conn.close()

    return jsonify(success=True, chickens=chickens)

@app.route('/remove_chicken', methods=['POST'])
def remove_chicken():
    chicken_name = request.json.get('chicken_name')
    if not chicken_name:
        return jsonify(success=False, message='Chicken name required.')

    conn = get_db_connection()
    conn.execute('DELETE FROM chickens WHERE name = ?', (chicken_name,))
    # egg_production entries are deleted automatically due to ON DELETE CASCADE
    conn.commit()
    
    chickens = [r['name'] for r in conn.execute('SELECT name FROM chickens').fetchall()]
    conn.close()

    return jsonify(success=True, chickens=chickens)


if __name__ == '__main__':
    try:
        app.run(port=5000)
    except Exception as e:
        print(f"Error starting server: {e}")
