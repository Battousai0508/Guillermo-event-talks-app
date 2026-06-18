import os
import requests
import xml.etree.ElementTree as ET
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

# Feed URL
FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def parse_release_notes():
    try:
        response = requests.get(FEED_URL, timeout=10)
        response.raise_for_status()
    except Exception as e:
        return {"error": f"Failed to fetch feed: {str(e)}"}

    try:
        root = ET.fromstring(response.content)
        # Atom Namespace
        ns = {"atom": "http://www.w3.org/2005/Atom"}
        
        entries = []
        for entry in root.findall("atom:entry", ns):
            title_el = entry.find("atom:title", ns)
            id_el = entry.find("atom:id", ns)
            updated_el = entry.find("atom:updated", ns)
            link_el = entry.find("atom:link[@rel='alternate']", ns)
            if link_el is None:
                link_el = entry.find("atom:link", ns)
            content_el = entry.find("atom:content", ns)

            title = title_el.text if title_el is not None else "Unknown Date"
            entry_id = id_el.text if id_el is not None else ""
            updated = updated_el.text if updated_el is not None else ""
            link = link_el.attrib.get("href", "") if link_el is not None else ""
            content = content_el.text if content_el is not None else ""

            entries.append({
                "title": title,
                "id": entry_id,
                "updated": updated,
                "link": link,
                "content": content
            })
        return {"entries": entries}
    except Exception as e:
        return {"error": f"Failed to parse XML: {str(e)}"}

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/releases")
def get_releases():
    data = parse_release_notes()
    if "error" in data:
        return jsonify(data), 500
    return jsonify(data)

if __name__ == "__main__":
    # Standard development host/port
    app.run(host="0.0.0.0", port=5001, debug=True)
