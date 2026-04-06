from flask import Flask, request, jsonify
from supabase import create_client, Client
import time

app = Flask(__name__)

# SUPABASE CONFIG
SUPABASE_URL = "https://dhvdnpgnynrcolwbavdi.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRodmRucGdueW5yY29sd2JhdmRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMDAxMTYsImV4cCI6MjA4NTc3NjExNn0.60VvwhOtEmRLM_DTA72bzWc7XYuwXTYcYeU6Gg4ro58"
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Data structure to hold readings until 10 seconds pass
# Format: { "AMB-01": {"hr": [], "spo2": [], "last_push": timestamp} }
ambulance_buffers = {}

def get_average(data_list):
    if not data_list: return 0
    return round(sum(data_list) / len(data_list))

@app.route('/vitals', methods=['POST'])
def receive_vitals():
    try:
        data = request.json
        amb_id = data.get('ambulance_id')
        hr = data.get('heart_rate')
        spo2 = data.get('spo2')

        current_time = time.time()

        # 1. Initialize buffer for this ambulance if not exists
        if amb_id not in ambulance_buffers:
            ambulance_buffers[amb_id] = {
                "hr": [], 
                "spo2": [], 
                "last_push": current_time
            }

        # 2. Add current raw reading to buffer
        ambulance_buffers[amb_id]["hr"].append(hr)
        ambulance_buffers[amb_id]["spo2"].append(spo2)

        # 3. Check if 10 seconds have passed
        time_elapsed = current_time - ambulance_buffers[amb_id]["last_push"]
        
        if time_elapsed >= 10:
            avg_hr = get_average(ambulance_buffers[amb_id]["hr"])
            avg_spo2 = get_average(ambulance_buffers[amb_id]["spo2"])

            print(f"📊 10s Average for {amb_id}: HR {avg_hr}, SpO2 {avg_spo2}")

            # Find active emergency
            query = supabase.table("emergencies") \
                .select("id") \
                .eq("ambulance_id", amb_id) \
                .eq("status", "accepted") \
                .order("created_at", desc=True).limit(1).execute()

            if query.data:
                emergency_id = query.data[0]['id']
                
                # Push Average to Supabase
                supabase.table("live_vitals").insert({
                    "emergency_id": emergency_id,
                    "ambulance_id": amb_id,
                    "heart_rate": avg_hr,
                    "spo2": avg_spo2
                }).execute()
                print(f"✅ Averaged data pushed to Supabase for {emergency_id}")

            # Reset Buffer
            ambulance_buffers[amb_id]["hr"] = []
            ambulance_buffers[amb_id]["spo2"] = []
            ambulance_buffers[amb_id]["last_push"] = current_time
            
            return jsonify({"status": "pushed"}), 200
        
        return jsonify({"status": "buffering"}), 200

    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)