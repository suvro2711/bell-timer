# Docker Deployment Guide for My Dashboard

## Quick Start

### Local Testing
```bash
# Build and run with Docker Compose
docker-compose up --build

# Access the app at http://localhost:5000
```

### Build Docker Image Manually
```bash
# Build the image
docker build -t my-dashboard .

# Run the container
docker run -p 5000:5000 \
  -e GOOGLE_SHEETS_CREDENTIALS='your-credentials-json' \
   -e GOOGLE_SHEETS_SPREADSHEET_ID='1LchZQ5zxXbRW428FTWoumoPXCZGKE-EJKB85SOgb6kk' \
   my-dashboard
```

## Deploy to Render

### Steps:
1. Go to [render.com](https://render.com) and sign up/login
2. Click "New +" → "Web Service"
3. Connect your GitHub repository `suvro2711/my-dashboard`
4. Configure:
   - **Name**: my-dashboard
   - **Environment**: Docker
   - **Region**: Choose closest to you
   - **Branch**: main (or feat)
   - **Dockerfile Path**: ./Dockerfile

5. Add Environment Variables:
   - `GOOGLE_SHEETS_CREDENTIALS` = `<your-service-account-json>`
   - `GOOGLE_SHEETS_SPREADSHEET_ID` = `1LchZQ5zxXbRW428FTWoumoPXCZGKE-EJKB85SOgb6kk`
   - `NODE_ENV` = `production`

6. Click "Create Web Service"

Your app will be live at: `https://my-dashboard-<random>.onrender.com`

## Deploy to Railway

### Steps:
1. Go to [railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select `suvro2711/my-dashboard`
4. Railway will auto-detect the Dockerfile
5. Add environment variables in Settings → Variables:
   - `GOOGLE_SHEETS_CREDENTIALS`
   - `GOOGLE_SHEETS_SPREADSHEET_ID`
6. Deploy!

## Deploy to Fly.io

### Steps:
```bash
# Install Fly CLI
# Windows: iwr https://fly.io/install.ps1 -useb | iex
# Mac/Linux: curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# Create app
fly launch

# Set secrets
fly secrets set GOOGLE_SHEETS_CREDENTIALS='<your-credentials-json>'
fly secrets set GOOGLE_SHEETS_SPREADSHEET_ID='1LchZQ5zxXbRW428FTWoumoPXCZGKE-EJKB85SOgb6kk'

# Deploy
fly deploy
```

## Environment Variables Required

```
GOOGLE_SHEETS_CREDENTIALS=<full-service-account-json>
GOOGLE_SHEETS_SPREADSHEET_ID=1LchZQ5zxXbRW428FTWoumoPXCZGKE-EJKB85SOgb6kk
NODE_ENV=production
```

## Troubleshooting

### Container won't start
- Check logs: `docker logs <container-id>`
- Verify environment variables are set
- Ensure Google Sheets is shared with service account

### Build fails
- Make sure Docker is installed and running
- Check Dockerfile syntax
- Verify all source files are present

### Connection issues
- Verify port 5000 is exposed
- Check firewall settings
- Ensure Google Sheets API is enabled

## Local Development with Docker
```bash
# Build for development
docker-compose up

# Rebuild after changes
docker-compose up --build

# Stop containers
docker-compose down

# View logs
docker-compose logs -f
```

## Production Recommendations
- **Render**: Free tier available, great for small apps
- **Railway**: $5/month, easy deployment
- **Fly.io**: Pay-as-you-go, global edge deployment
- All support Docker natively
