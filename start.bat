@echo off
echo Starting AgriMind AI Platform...

echo Starting Node.js API Server on port 3001...
cd "syngetia node js server"
start cmd /k "npm start"
cd ..

echo Starting Flask Web Server on port 5000...
cd "syngetia web"
start cmd /k "python app.py"
cd ..

echo Both servers are starting! Open your browser to http://127.0.0.1:5000
