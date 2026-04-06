RES-Q: IoT-Enabled Critical Emergency Response Ecosystem
RES-Q is a mission-critical mobile infrastructure designed to minimize the "Golden Hour" response time in medical emergencies. It bridges the communication gap between patients in distress and Emergency Rooms (ER) by providing automated SOS broadcasting and live IoT telemetry.

🚀 The Core Problem
Conventional emergency response relies on voice calls, which are prone to delays, location inaccuracies, and lack of clinical data. RES-Q replaces this with a data-driven "Push" model, where the hospital is prepared with patient vitals before the ambulance arrives.

🛠 Features
📡 For Patients (User App)
Multi-Vector SOS: Categorized emergency triggers (Cardiac, Accident, Pregnancy) for targeted hospital routing.

Dynamic Radar: Real-time distance calculation (Haversine formula) to locate specialized centers within a 25km radius.

Smart Navigation: Immediate deep-linking to native GPS (Google/Apple Maps) for self-driving patients.

Persistence: Secure authentication with persistent sessions via AsyncStorage.

🏥 For Hospitals (Command Center)
High-Priority Acoustic Alerts: Custom Android/iOS audio alarms via expo-av that trigger even in background states.

Live IoT Vitals Monitor: Real-time visualization of Heart Rate (BPM) and SpO2 using react-native-chart-kit and WebSocket-based telemetry.

Resource Orchestration: Fleet management for IoT-connected ambulances and medical staff roster controls.

Capability Management: Instant database synchronization of facility specializations (e.g., Trauma, Maternity).

🏗 System Architecture
The ecosystem follows a Serverless Realtime Architecture:

Frontend: React Native (Expo SDK 53) utilizing a Development Build for native hardware access.

Backend-as-a-Service: Supabase (PostgreSQL) for relational data and Auth.

Realtime Engine: Supabase Broadcast/Presence (WebSockets) for millisecond-latency SOS alerts.

IoT Simulation: Live vitals pushed via PostgreSQL INSERT triggers to the hospital dashboard.

💻 Tech Stack
Framework: React Native (Expo)

Navigation: Expo Router (File-based)

Backend: Supabase (Realtime, Storage, Auth, Database)

Charts: React Native Chart Kit

Audio: Expo AV

Build Tool: EAS (Expo Application Services)

📦 Installation & Setup
Prerequisites
Node.js (v18+)

Expo GO (for basic testing) or Development Build (for full features)

Supabase Project

Setup
Clone the Repo:

Bash
git clone https://github.com/udaywasu/resq.git
cd resq
Install Dependencies:

Bash
npm install
Environment Variables:
Create a src/services/supabaseClient.ts and initialize your client:

TypeScript
export const supabase = createClient(YOUR_SUPABASE_URL, YOUR_ANON_KEY);
Run the App:

Bash
npx expo start
🛡 Security & Compliance
RLS (Row Level Security): Ensures hospitals only access data relevant to their facility.

Authentication: JWT-based secure sessions.

Data Persistence: Encrypted local storage for session management.

Pro-Tip for your GitHub:
Once you upload this, go to your Repository Settings and add "Topics" like: react-native, supabase, iot, emergency-response, and health-tech. This helps the GitHub algorithm show your project to interested people!
