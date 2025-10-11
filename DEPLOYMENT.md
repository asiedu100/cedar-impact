# Networking Hub Deployment Guide

## Option 1: Static Site Deployment (Simple)

### Deploy to Render (Static Site)
1. Go to [render.com](https://render.com) and sign up/login
2. Click "New +" → "Static Site"
3. Connect your GitHub repository or upload files directly
4. Configure:
   - **Name**: networking-hub
   - **Build Command**: `npm install`
   - **Publish Directory**: `/` (root)
   - **Start Command**: `npm start`
5. Deploy!

### Deploy to Netlify
1. Go to [netlify.com](https://netlify.com)
2. Drag and drop your project folder
3. Or connect GitHub repository
4. Deploy automatically!

### Deploy to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Deploy with zero configuration!

## Option 2: Full Backend Deployment

### Deploy Backend to Render
1. Use the `server.js` and `backend-package.json` files
2. On Render:
   - **New +** → **Web Service**
   - Connect GitHub repository
   - Configure:
     - **Name**: networking-hub-api
     - **Environment**: Node
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`
     - **Port**: 3000 (auto-detected)

### Environment Variables (if needed)
- `NODE_ENV`: production
- `PORT`: 3000 (auto-set by Render)

## Option 3: Docker Deployment

Create a `Dockerfile`:
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## Quick Deploy Commands

### For Static Site:
```bash
# Install dependencies
npm install

# Test locally
npm start

# Deploy to Render/Netlify/Vercel
# (Use their respective CLI tools or web interfaces)
```

### For Backend:
```bash
# Install dependencies
npm install

# Test locally
npm run dev

# Deploy to Render
# (Connect GitHub repo and auto-deploy)
```

## Features After Deployment:
- ✅ User registration and login
- ✅ Event management
- ✅ QR code generation
- ✅ Attendance tracking
- ✅ Gender analytics
- ✅ Data export
- ✅ Responsive design
- ✅ Background images

## URLs After Deployment:
- **Static**: `https://your-app-name.onrender.com`
- **Backend**: `https://your-api-name.onrender.com`

Choose the option that fits your needs! Static deployment is simpler, backend deployment gives you a real database.
