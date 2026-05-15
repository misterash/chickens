# 🐔 Chicken Egg Counter 🥚

This is a simple and fun web application using Flask that allows you to track how many eggs each of your chickens has laid every day. 🐣

## ✨ Features

- 📝 **Easy Recording**: Log whether each chicken laid an egg on any specific date.
- 📊 **Summary View**: See at a glance who is the most productive hen!
- 🌓 **Dark Mode Support**: Because even chickens like a bit of night-time vibe.
- 🗄️ **Robust Storage**: Powered by **SQLite** for reliable and fast data management.

## 🛠️ Requirements

- **Python**: >= 3.10 🐍
- **uv**: For lightning-fast dependency management ⚡

## 🚀 Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/misterash/chickens
   cd chickens
   ```

2. **Install dependencies**:
   Using `uv`, everything is handled automatically:
   ```bash
   uv sync
   ```

3. **Run the application**:
   ```bash
   uv run app.py
   ```

4. **Access the app**:
   Open your web browser and go to [http://localhost:5000](http://localhost:5000). 🌐

## 🐳 Docker Support

Want to run it in a container? No problem! 📦

1. **Build the image**:
   ```bash
   docker build -t chicken-egg-counter:latest .
   ```

2. **Run the container**:
   ```bash
   docker run -p 5000:5000 chicken-egg-counter:latest
   ```

Happy egg counting! 🍳
