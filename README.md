# AgriMind AI - Railway Deployment Guide

This repository contains the complete microservice architecture for the AgriMind AI platform.

## Repository Structure
- `/syngetia web` - The Flask frontend dashboard.
- `/syngetia node js server` - The Node.js Express API.
- `/syngetia ml service` - The Python FastAPI Machine Learning service.

## How to Deploy on Railway (Monorepo Setup)

You do not need to split this repository. You can deploy all three services directly from this single repo on Railway.

### 1. Push to GitHub
Commit all files in this directory and push them to a GitHub repository.

### 2. Create the ML Service (FastAPI)
1. In Railway, click **New Project** -> **Deploy from GitHub repo** and select your repository.
2. Go to the new service's **Settings** -> **Deploy**.
3. Set the **Root Directory** to `/syngetia ml service`.
4. *Railway will automatically detect the `Procfile` and use it to start the service.*
5. Go to the **Settings** -> **Networking** and click **Generate Domain**. (Save this URL, e.g., `https://agrimind-ml.up.railway.app`).

### 3. Create the Node API Service
1. In Railway, click **New** -> **GitHub Repo** and select your repository again.
2. Go to the new service's **Settings** -> **Deploy**.
3. Set the **Root Directory** to `/syngetia node js server`.
4. *Railway will automatically detect the `Procfile` and use it to start the service.*
5. Go to **Variables** and add:
   - `DATABASE_URL`: Your PostgreSQL connection string.
   - `GEMINI_API_KEY`: Your Google Gemini API Key.
   - `ML_API_URL`: The URL you generated in step 2 (e.g., `https://agrimind-ml.up.railway.app/predict`).
6. Go to **Settings** -> **Networking** and click **Generate Domain**. (Save this URL, e.g., `https://agrimind-api.up.railway.app`).

### 4. Create the Web Frontend Service (Flask)
1. *Before you push*, open `syngetia web/static/js/app.js` on line 3 and change `API_BASE_URL` to your Node API URL from step 3. Commit and push this change to GitHub.
2. In Railway, click **New** -> **GitHub Repo** and select your repository again.
3. Go to the new service's **Settings** -> **Deploy**.
4. Set the **Root Directory** to `/syngetia web`.
5. *Railway will automatically detect the `Procfile` and install `gunicorn` from `requirements.txt` to start the service.*
6. Go to **Settings** -> **Networking** and click **Generate Domain**.

**Done! Your enterprise platform is live!**
