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
        return {}
    with open(DATA_FILE, 'r') as f:
        return json.load(f)

# Function to save data to the JSON file
def save_data(data):
    with open(DATA_FILE, 'w') as f:
        json.dump(data, f, indent=4)

# Initialize data
egg_data = load_data()

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
    save_data(egg_data)

    return jsonify(success=True, egg_data=egg_data)

@app.route('/data')
def get_data():
    return jsonify(load_data())


if __name__ == '__main__':
    # Create a default SSL context
    #context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    try:
        # Assuming cert.pem and key.pem are in the same directory as app.py
        #context.load_cert_chain('cert.pem', 'key.pem')
        #print("Running with SSL enabled on https://127.0.0.1:5000/")
        app.run(port=5000)
    except FileNotFoundError:
        print("SSL certificates (cert.pem, key.pem) not found. Running without SSL on http://127.0.0.1:5000/.")
        app.run(port=5000)
