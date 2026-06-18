# BigQuery Release Radar 📡

BigQuery Release Radar is a modern, lightweight, and visually stunning web application built with Python Flask and vanilla frontend technologies (HTML, CSS, JavaScript). It tracks official Google Cloud BigQuery release notes in real-time, splits them into neat, searchable, and filtered categories, and provides interactive tools to share individual updates on X (Twitter).

---

## Key Features

- **Automated RSS Sync**: Fetches the official BigQuery Atom release feed directly on request.
- **Granular Update Breaking**: Automatically parses combined daily release logs into separate sub-cards based on release types (Features, Changes, Deprecations, etc.).
- **Live Search & Filter**: Real-time frontend filtering by release type or text keywords.
- **Interactive Tweet Draft Modal**: Customize text, check length limitations (280 characters), and post instantly.
- **Highlight-to-Tweet**: Simply select any text on the dashboard to trigger a floating "Tweet selection" button to share quotes.
- **Premium Aesthetics**: Gorgeous dark-mode styling utilizing glassmorphism, responsive grids, soft glowing color palettes, and custom animations.

---

## Project Structure

```text
bq-releases-notes/
├── app.py                 # Flask server & XML parsing engine
├── templates/
│   └── index.html         # Frontend structure & Modals
├── static/
│   ├── app.js             # Logic, XML parser, state management & sharing
│   └── style.css          # Theme, glassmorphism designs & keyframe animations
├── .gitignore             # Git exclusion rules
├── requirements.txt       # Python dependencies
└── README.md              # Project documentation
```

---

## Installation & Setup

### 1. Prerequisites
Ensure you have **Python 3.9+** and **pip** installed.

### 2. Clone and Navigate
```bash
git clone https://github.com/Battousai0508/Guillermo-event-talks-app.git
cd Guillermo-event-talks-app
```

### 3. Create a Virtual Environment
```bash
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

### 4. Install Dependencies
```bash
pip install -r requirements.txt
```
*(If `requirements.txt` is missing, you can run: `pip install flask requests`)*

### 5. Run the Server
```bash
python3 app.py
```

Open your browser and navigate to:
👉 **[http://127.0.0.1:5001](http://127.0.0.1:5001)**

---

## Technologies Used

- **Backend**: Python, Flask, `xml.etree.ElementTree` (standard library XML parsing), Requests.
- **Frontend**: Vanilla HTML5, CSS3, ES6 JavaScript, Lucide Icons (CDN), Google Fonts.
