import os
import requests
import xml.etree.ElementTree as ET
import re
import io
import csv
from flask import Flask, jsonify, render_template, request, make_response

app = Flask(__name__)

# Feed URL
FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def clean_html(raw_html):
    # Quick utility to strip HTML tags
    cleanr = re.compile('<.*?>')
    cleantext = re.sub(cleanr, '', raw_html)
    return " ".join(cleantext.split())

def parse_entry_content(content_html, date_str, link_str):
    # Split by h3, h2, h4 headers
    parts = re.split(r'<(h3|h2|h4)[^>]*>(.*?)</\1>', content_html, flags=re.IGNORECASE)
    items = []
    
    if len(parts) <= 1:
        text = clean_html(content_html)
        if text.strip():
            items.append({
                "date": date_str,
                "type": "other",
                "text": text,
                "link": link_str
            })
        return items
        
    initial_text = clean_html(parts[0])
    if initial_text.strip():
        items.append({
            "date": date_str,
            "type": "other",
            "text": initial_text,
            "link": link_str
        })
        
    for i in range(1, len(parts), 3):
        if i + 2 < len(parts):
            header_type = parts[i+1].strip().lower()
            body_content = parts[i+2]
            
            if "feature" in header_type:
                current_type = "feature"
            elif "deprecated" in header_type or "deprecation" in header_type:
                current_type = "deprecated"
            elif "change" in header_type or "changed" in header_type or "update" in header_type:
                current_type = "changed"
            else:
                current_type = "other"
                
            text = clean_html(body_content)
            items.append({
                "date": date_str,
                "type": current_type,
                "text": text,
                "link": link_str
            })
            
    return items

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

@app.route("/api/releases/bigquery_releases.csv")
def export_releases():
    data = parse_release_notes()
    if "error" in data:
        return make_response("Failed to fetch data for export", 500)
        
    search_query = request.args.get("query", "").lower().strip()
    filter_type = request.args.get("type", "all").lower().strip()
    
    # Process XML entries to list of items
    all_items = []
    for entry in data.get("entries", []):
        all_items.extend(parse_entry_content(entry["content"], entry["title"], entry["link"]))
        
    # Filter
    filtered_items = []
    for item in all_items:
        matches_filter = (filter_type == "all" or item["type"] == filter_type)
        matches_search = (not search_query or 
                          search_query in item["text"].lower() or 
                          search_query in item["date"].lower() or 
                          search_query in item["type"].lower())
        if matches_filter and matches_search:
            filtered_items.append(item)
            
    # Generate CSV using standard csv module
    si = io.StringIO()
    # Add UTF-8 BOM so Excel opens it correctly
    si.write('\ufeff')
    cw = csv.writer(si, quoting=csv.QUOTE_ALL)
    cw.writerow(['Date', 'Category', 'Update Text', 'Link'])
    
    for item in filtered_items:
        cw.writerow([item["date"], item["type"], item["text"], item["link"]])
        
    output = make_response(si.getvalue())
    output.headers["Content-Disposition"] = 'attachment; filename="bigquery_releases.csv"'
    output.headers["Content-Type"] = "text/csv; charset=utf-8"
    return output

if __name__ == "__main__":
    # Standard development host/port
    app.run(host="0.0.0.0", port=5001, debug=True)
