from flask import Flask, render_template, jsonify, request
from datetime import datetime
import pytz
import os
import json
import ssl

app = Flask(__name__)

# Path to the data file
DATA_FILE = 'egg_data.json'

# Function to load data from the JSON file
def load_data():
    if not os.path.exists(DATA_FILE):
        # Initialize with default chickens if file does not exist
        return {'chickens': ['Larry', 'Iggy', 'Curly', 'Salt', 'Peppa']}
    with open(DATA_FILE, 'r') as f:
        data = json.load(f)
        if 'chickens' not in data:
            data['chickens'] = ['Larry', 'Iggy', 'Curly', 'Salt', 'Peppa']
        return data

# Function to save data to the JSON file
def save_data(data_to_save):
    with open(DATA_FILE, 'w') as f:
        json.dump(data_to_save, f, indent=4)

# Initialize data
full_data = load_data()
egg_data = {date: eggs for date, eggs in full_data.items() if date != 'chickens'}
chickens_list = full_data.get('chickens', [])

@app.route('/')
def index():
    la_tz = pytz.timezone('America/Los_Angeles')
    today = datetime.now(la_tz).strftime('%Y-%m-%d')
    return render_template('index.html', today=today, egg_data=egg_data)

@app.route('/update', methods=['POST'])
def update():
    data = request.get_json()
    date = data.get('date')
    chicken = data.get('chicken')
    laid_egg = data.get('laid_egg')

    if date not in egg_data:
        egg_data[date] = {}

    egg_data[date][chicken] = laid_egg

    data_to_save = egg_data.copy()
    data_to_save['chickens'] = chickens_list
    save_data(data_to_save)

    return jsonify(success=True, egg_data=egg_data, chickens=chickens_list)

@app.route('/data')
def get_data():
    return jsonify(load_data())

@app.route('/get_chickens')
def get_chickens():
    return jsonify(success=True, chickens=chickens_list)

@app.route('/add_chicken', methods=['POST'])
def add_chicken():
    global chickens_list
    global full_data

    chicken_name = request.json.get('chicken_name')
    if not chicken_name or chicken_name in chickens_list:
        return jsonify(success=False, message='Chicken name cannot be empty or already exists.')

    chickens_list.append(chicken_name)
    
    full_data = egg_data.copy()
    full_data['chickens'] = chickens_list
    save_data(full_data)

    return jsonify(success=True, chickens=chickens_list)


    return jsonify(success=True, chickens=chickens_list)

@app.route('/remove_chicken', methods=['POST'])
def remove_chicken():
    global chickens_list
    global egg_data
    global full_data

    chicken_name = request.json.get('chicken_name')
    if not chicken_name or chicken_name not in chickens_list:
        return jsonify(success=False, message='Chicken not found.')

    chickens_list.remove(chicken_name)

    # Remove chicken's egg data from all dates
    for date in list(egg_data.keys()):
        if chicken_name in egg_data[date]:
            del egg_data[date][chicken_name]
        # If a date has no more egg entries, remove the date
        if not egg_data[date]:
            del egg_data[date]

    full_data = egg_data.copy()
    full_data['chickens'] = chickens_list
    save_data(full_data)

    return jsonify(success=True, chickens=chickens_list)


if __name__ == '__main__':
    try:
        app.run(port=5000)
    except Exception as e:
        print(f"Error starting server: {e}")


