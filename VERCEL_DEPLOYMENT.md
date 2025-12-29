# Vercel Deployment Guide for Bell-Timer

## Prerequisites
1. Vercel account (sign up at vercel.com)
2. GitHub repository connected

## Environment Variables
Add these in Vercel Dashboard → Project Settings → Environment Variables:

### Required:
```
GOOGLE_SHEETS_CREDENTIALS=<your-service-account-json>
GOOGLE_SHEETS_SPREADSHEET_ID=1LchZQ5zxXbRW428FTWoumoPXCZGKE-EJKB85SOgb6kk
NODE_ENV=production
```

## Deployment Steps

### Option 1: Deploy from GitHub (Recommended)
1. Push your code to GitHub:
   ```bash
   git add .
   git commit -m "Add Vercel deployment configuration"
   git push origin main
   ```

2. Go to [vercel.com/new](https://vercel.com/new)
3. Import your GitHub repository `suvro2711/Bell-Timer`
4. Vercel will auto-detect the configuration
5. Add environment variables (see above)
6. Click "Deploy"

### Option 2: Deploy using Vercel CLI
```bash
npm i -g vercel
vercel login
vercel
```

## Post-Deployment
- Your app will be live at: `https://bell-timer-<unique-id>.vercel.app`
- API endpoints: `https://your-app.vercel.app/api/sessions`
- Custom domain: Configure in Vercel Dashboard → Domains

## Important Notes
- ⚠️ Make sure `.env` is in `.gitignore` (already done)
- ⚠️ Never commit secrets to Git
- The Google Sheets credentials must be added as environment variables in Vercel
- Serverless functions have a 10-second timeout by default

## Troubleshooting
- Check Vercel deployment logs for errors
- Verify environment variables are set correctly
- Ensure Google Sheets is shared with the service account email
