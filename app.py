import time
from flask import Flask, render_template, jsonify, request

app = Flask(__name__)

# ==========================================================================
# In-Memory Database / State Management
# ==========================================================================

# 1. Parking Spots State
parking_spots = [
    {"id": "A-01", "occupied": True},
    {"id": "A-02", "occupied": False},
    {"id": "A-03", "occupied": True},
    {"id": "A-04", "occupied": False},
    {"id": "A-05", "occupied": False},
    {"id": "B-01", "occupied": False},
    {"id": "B-02", "occupied": True},
    {"id": "B-03", "occupied": False},
    {"id": "B-04", "occupied": False},
    {"id": "B-05", "occupied": False}
]

# 2. Library Study Pods State
library_pods = [
    {"number": 1, "occupied": False},
    {"number": 2, "occupied": True},
    {"number": 3, "occupied": False},
    {"number": 4, "occupied": True},
    {"number": 5, "occupied": False},
    {"number": 6, "occupied": False},
    {"number": 7, "occupied": True},
    {"number": 8, "occupied": False}
]

# 3. Smart Lighting & HVAC State
# Rates of energy savings (kWh per second for simulation)
lighting_rooms = {
    "room-301": {
        "name": "Classroom 301",
        "occupied": True,
        "saved_base": 0.0,
        "vacant_since": None, # timestamp when it became vacant
        "rate": 0.04          # kWh saved per second empty
    },
    "room-102": {
        "name": "ECE Tech Lab 102",
        "occupied": True,
        "saved_base": 0.0,
        "vacant_since": None,
        "rate": 0.06
    }
}

# 4. System Notice logs
system_logs = [
    {"source": "GATEWAY", "message": "Listening on MQTT channels...", "type": "info", "time": "02:00:00 PM"},
    {"source": "PARKING SENSOR", "message": "Node A-01 telemetry updated: OCCUPIED.", "type": "alert", "time": "02:02:15 PM"},
    {"source": "PARKING SENSOR", "message": "Node B-02 telemetry updated: OCCUPIED.", "type": "alert", "time": "02:05:40 PM"},
    {"source": "HVAC", "message": "Eco-mode routine checked in for 24 classrooms.", "type": "success", "time": "02:08:10 PM"}
]

# 5. Canteen Hourly Occupancy Graph Data
canteen_traffic = [
    {"hour": "8:00 AM", "val": 15},
    {"hour": "10:00 AM", "val": 40},
    {"hour": "12:00 PM", "val": 75},
    {"hour": "1:00 PM", "val": 95},
    {"hour": "2:00 PM", "val": 55},
    {"hour": "4:00 PM", "val": 35},
    {"hour": "6:00 PM", "val": 10}
]

# Helper to get current formatted time
def get_current_time_str():
    return time.strftime("%I:%M:%S %p")

# Helper to log events on backend
def log_event(source, message, type_):
    log_item = {
        "source": source,
        "message": message,
        "type": type_,
        "time": get_current_time_str()
    }
    system_logs.insert(0, log_item)
    # Cap log size
    if len(system_logs) > 40:
        system_logs.pop()
    return log_item

# ==========================================================================
# Web Routes
# ==========================================================================

@app.route('/')
def home():
    return render_template('index.html')

# ==========================================================================
# REST API Endpoints
# ==========================================================================

# --- Parking API ---
@app.route('/api/parking', methods=['GET'])
def get_parking():
    occupied = len([s for s in parking_spots if s["occupied"]])
    vacant = len(parking_spots) - occupied
    return jsonify({
        "spots": parking_spots,
        "total": len(parking_spots),
        "occupied": occupied,
        "vacant": vacant
    })

@app.route('/api/parking/toggle', methods=['POST'])
def toggle_parking():
    data = request.json or {}
    spot_id = data.get("id")
    
    for spot in parking_spots:
        if spot["id"] == spot_id:
            spot["occupied"] = not spot["occupied"]
            state = "OCCUPIED" if spot["occupied"] else "VACANT"
            log_type = "alert" if spot["occupied"] else "success"
            
            log_event("PARKING SENSOR", f"Node {spot_id} state changed to {state}.", log_type)
            
            return jsonify({
                "success": True,
                "spot": spot,
                "occupied_count": len([s for s in parking_spots if s["occupied"]]),
                "vacant_count": len([s for s in parking_spots if not s["occupied"]])
            })
            
    return jsonify({"success": False, "error": "Spot not found"}), 404

# --- Library API ---
@app.route('/api/library', methods=['GET'])
def get_library():
    vacant_count = len([p for p in library_pods if not p["occupied"]])
    return jsonify({
        "pods": library_pods,
        "vacant": vacant_count
    })

@app.route('/api/library/reserve', methods=['POST'])
def reserve_pod():
    data = request.json or {}
    pod_num = data.get("number")
    
    for pod in library_pods:
        if pod["number"] == pod_num:
            if pod["occupied"]:
                return jsonify({"success": False, "error": "Pod is already occupied"}), 400
                
            pod["occupied"] = True
            log_event("RESERVATION", f"Study Pod 0{pod_num} successfully reserved.", "success")
            log_event("IoT INTERACTOR", f"Desk 0{pod_num} pressure sensor active. Power relay closed.", "success")
            
            return jsonify({
                "success": True,
                "pod": pod,
                "vacant_count": len([p for p in library_pods if not p["occupied"]])
            })
            
    return jsonify({"success": False, "error": "Pod not found"}), 404

# --- Canteen API ---
@app.route('/api/canteen', methods=['GET'])
def get_canteen():
    return jsonify({
        "traffic": canteen_traffic,
        "recommendation": "Cafeteria counts indicate peak rushes occur between 12:30 PM and 1:45 PM. To bypass queues, dine outside these blocks.",
        "best_time": "Best Visit Time: 2:00 PM onwards"
    })

# --- Lighting API ---
@app.route('/api/lighting', methods=['GET'])
def get_lighting():
    # Dynamically calculate cumulative energy saved
    now = time.time()
    rooms_response = {}
    
    for r_id, room in lighting_rooms.items():
        saved = room["saved_base"]
        if not room["occupied"] and room["vacant_since"] is not None:
            # calculate additional savings since it went vacant
            elapsed = now - room["vacant_since"]
            saved += elapsed * room["rate"]
            
        rooms_response[r_id] = {
            "name": room["name"],
            "occupied": room["occupied"],
            "saved": round(saved, 2)
        }
        
    return jsonify(rooms_response)

@app.route('/api/lighting/toggle', methods=['POST'])
def toggle_lighting():
    data = request.json or {}
    room_id = data.get("room")
    
    if room_id not in lighting_rooms:
        return jsonify({"success": False, "error": "Room not found"}), 404
        
    room = lighting_rooms[room_id]
    now = time.time()
    
    if room["occupied"]:
        # Turning Occupied -> Vacant (empty)
        room["occupied"] = False
        room["vacant_since"] = now
        log_event("HVAC CONTROLLER", f"{room['name']} empty. Relay closed, HVAC entered ECO mode.", "success")
    else:
        # Turning Vacant -> Occupied
        room["occupied"] = True
        if room["vacant_since"] is not None:
            elapsed = now - room["vacant_since"]
            room["saved_base"] += elapsed * room["rate"]
            room["vacant_since"] = None
        log_event("HVAC CONTROLLER", f"{room['name']} occupancy detected. Relay toggled to ACTIVE.", "info")
        
    return jsonify({
        "success": True,
        "room_id": room_id,
        "occupied": room["occupied"]
    })

# --- Notification Logs API ---
@app.route('/api/logs', methods=['GET'])
def get_logs():
    return jsonify(system_logs)

@app.route('/api/logs/clear', methods=['POST'])
def clear_logs():
    global system_logs
    system_logs = []
    log_event("GATEWAY", "System logs reset by administration.", "info")
    return jsonify({"success": True})

@app.route('/api/notify', methods=['POST'])
def post_notice():
    data = request.json or {}
    category = data.get("type", "info")
    title = data.get("title", "").strip()
    desc = data.get("desc", "").strip()
    
    if not title or not desc:
        return jsonify({"success": False, "error": "Missing title or message"}), 400
        
    log_item = log_event(f"NOTICE BROADCAST ({category.upper()})", f"{title}: {desc}", category)
    return jsonify({
        "success": True,
        "log": log_item
    })

# --- Auto-Attendance API ---
@app.route('/api/attendance', methods=['POST'])
def register_attendance():
    data = request.json or {}
    srn = data.get("srn", "R20EL412")
    name = data.get("name", "Aarav Mehta")
    room = data.get("room", "Classroom 301")
    
    log_event("BEACON SYSTEM", f"NFC UID verified: 04:A2:5F:C1. Attendance logged for SRN: {srn}.", "success")
    
    return jsonify({
        "success": True,
        "student": name,
        "srn": srn,
        "room": room,
        "message": f"Attendance registered for {name} ({srn}) in {room}."
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)
