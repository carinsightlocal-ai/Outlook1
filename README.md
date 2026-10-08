# Jaun Fetch Otp - OTP Fetcher Pro (Website Edition) ⚡

Clean, standalone website project directory optimized for **Local Development** and **Vercel Serverless Cloud Deployment**.

---

## 📁 Folder Structure

```text
outlook_otp_website/
├── api/
│   └── index.py            # Vercel entrypoint
├── data/
│   └── database.json       # User profiles & account storage
├── static/
│   ├── css/
│   │   └── style.css       # Animated UI & responsive styling
│   └── js/
│       └── app.js          # Interactive frontend & Web Audio synthesis
├── templates/
│   └── index.html          # Main HTML template
├── .gitignore              # Git ignore rules
├── .vercelignore           # Vercel package optimization
├── requirements.txt        # FastAPI, Uvicorn, and dependencies
├── run.bat                 # 1-Click local runner
├── server.py               # Complete FastAPI backend
└── vercel.json             # Vercel deployment configuration
```

---

## 🚀 How to Run Locally

Double-click `run.bat` or run:

```bash
uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

Open: [http://localhost:8000](http://localhost:8000)

---

## ☁️ How to Deploy to Vercel

1. Push this folder to a GitHub repository or navigate inside the folder in your terminal:
   ```bash
   cd outlook_otp_website
   ```
2. Deploy via Vercel CLI or import repository on [vercel.com](https://vercel.com):
   ```bash
   vercel --prod
   ```
3. Test your live deployment:
   - Health check: `https://<your-project>.vercel.app/api/health`
   - Dashboard: `https://<your-project>.vercel.app/`
