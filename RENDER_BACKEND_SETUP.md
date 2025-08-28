# Render Backend Deployment Configuration

## 🚀 **Exact Render Configuration Settings**

Based on your screenshots and Express.js backend, here are the **exact settings** to use:

### **Basic Configuration**

| Setting | Value | Notes |
|---------|-------|-------|
| **Name** | `church-management-system-api` | Or keep `church-management-system` |
| **Language** | `Node` | ✅ Already selected correctly |
| **Branch** | `main` | ✅ Already selected correctly |
| **Root Directory** | `backend` | **IMPORTANT: Change this!** |

### **Build & Start Commands**

| Setting | Command | Explanation |
|---------|---------|-------------|
| **Build Command** | `npm install && npm run build` | Install dependencies and compile TypeScript |
| **Start Command** | `npm start` | Start the compiled Express server |

### **Instance Type Recommendation**

For your Church Management System:
- **Free Tier**: ✅ **Perfect for testing and small churches**
  - 512 MB RAM, 0.1 CPU
  - $0/month
  - Spins down after 15 minutes of inactivity
  
- **Starter**: Good for active churches (50+ members)
  - 512 MB RAM, 0.5 CPU  
  - $7/month
  - Zero downtime

### **Environment Variables**

Click "Add Environment Variable" and add these:

| Variable Name | Value | Source |
|---------------|-------|--------|
| `NODE_ENV` | `production` | Standard |
| `PORT` | `10000` | Render default |
| `SUPABASE_URL` | `https://qntmivdrmuigvuobbniv.supabase.co` | From your .env |
| `SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | From your .env |
| `SUPABASE_SERVICE_ROLE_KEY` | `[Your service role key]` | From Supabase dashboard |

### **Advanced Settings (Click "Advanced")**

| Setting | Value | Notes |
|---------|-------|-------|
| **Auto-Deploy** | `Yes` | ✅ Enable auto-deployment |
| **Health Check Path** | `/health` | Optional health check |

## 📋 **Step-by-Step Setup Process**

### **Step 1: Update Root Directory**
- **Current**: Not set (will use root)
- **Change to**: `backend`
- **Why**: Your Express.js code is in the `backend` folder

### **Step 2: Verify Build Commands**
```bash
Build Command: npm install && npm run build
Start Command: npm start
```

**Important**: Your backend uses TypeScript, so it needs to be compiled before starting.

### **Step 3: Add Environment Variables**
Click "Add Environment Variable" for each:

```env
NODE_ENV=production
PORT=10000
SUPABASE_URL=https://qntmivdrmuigvuobbniv.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFudG1pdmRybXVpZ3Z1b2Jibml2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzMDA0MTAsImV4cCI6MjA3MTg3NjQxMH0.P5E3h2mtAVu29c4G8zudhEn83Bx8thvbiIxaThL4xW8
```

### **Step 4: Choose Instance Type**
- **Recommended**: Start with **Free** for testing
- **Upgrade later**: To **Starter** ($7/month) for production use

### **Step 5: Deploy**
Click "Deploy Web Service"

## 🔧 **Backend Code Verification**

Your `backend/package.json` is correctly configured:

```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/app.js",
    "dev": "nodemon src/app.ts"
  }
}
```

Make sure your `backend/src/app.ts` listens on the correct port:

```typescript
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

**Note**: Your TypeScript code compiles to the `dist/` folder, and the start script runs the compiled JavaScript.

## 🌐 **After Deployment**

### **Your Backend URL**
After deployment, Render will provide a URL like:
```
https://church-management-system-api.onrender.com
```

### **Update Frontend Environment Variable**
Update your Vercel environment variable:
```
NEXT_PUBLIC_API_URL=https://church-management-system-api.onrender.com
```

### **Test Endpoints**
Your API endpoints will be available at:
- `https://your-app.onrender.com/api/users`
- `https://your-app.onrender.com/api/families`
- `https://your-app.onrender.com/api/groups`
- `https://your-app.onrender.com/health` (if you add a health check)

## 🚨 **Important Notes**

### **Free Tier Limitations**
- **Spin Down**: Service sleeps after 15 minutes of inactivity
- **Cold Start**: First request after sleep takes ~30 seconds
- **Monthly Hours**: 750 hours/month (sufficient for most churches)

### **CORS Configuration**
Make sure your Express.js app allows requests from your Vercel domain:

```javascript
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://church-management-system-hrda.vercel.app'
  ]
}));
```

### **Database Connection**
Your Supabase connection should work automatically with the environment variables.

## ✅ **Final Checklist**

Before clicking "Deploy Web Service":

- [ ] **Root Directory**: Set to `backend`
- [ ] **Build Command**: `npm install`
- [ ] **Start Command**: `npm start`
- [ ] **Environment Variables**: All 4 variables added
- [ ] **Instance Type**: Free (for testing) or Starter (for production)
- [ ] **Auto-Deploy**: Enabled

## 🎯 **Expected Result**

After deployment:
1. **Backend API**: Live at `https://your-app.onrender.com`
2. **Auto-Deployment**: Every push to `main` branch updates both frontend (Vercel) and backend (Render)
3. **Full Stack**: Complete Church Management System with frontend + backend

Your auto-deployment will now work for both:
- **Frontend**: Vercel (already working)
- **Backend**: Render (after this setup)

**One push to GitHub = Both frontend and backend deploy automatically!**
