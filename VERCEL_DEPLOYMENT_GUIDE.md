# Vercel Deployment Guide for Church Management System

## 🚀 Complete Vercel Deployment Configuration

### **Step 1: Framework Preset**
- **Framework Preset**: Select **"Next.js"** (not "Other")
- Vercel will automatically detect this is a Next.js project

### **Step 2: Root Directory**
- **Root Directory**: Set to `frontend`
- Click "Edit" and change from `./` to `frontend`
- This tells Vercel that your Next.js app is in the frontend folder

### **Step 3: Build and Output Settings**
Click on "Build and Output Settings" and configure:

**Build Command:**
```bash
cd frontend && npm run build
```

**Output Directory:**
```
frontend/.next
```

**Install Command:**
```bash
cd frontend && npm install
```

### **Step 4: Environment Variables**
Click on "Environment Variables" and add these variables:

#### **Required Environment Variables:**
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
NEXT_PUBLIC_API_URL=https://your-backend-url.com
NEXT_PUBLIC_APP_NAME=Church Management System
NEXT_PUBLIC_APP_VERSION=1.0.0
```

**Important Notes:**
- Replace `your-project-id.supabase.co` with your actual Supabase URL
- Replace `your_anon_key_here` with your actual Supabase anon key
- For `NEXT_PUBLIC_API_URL`, you'll need to deploy your backend first (see Backend Deployment section)

### **Step 5: Project Settings**
- **Project Name**: `church-management-system` (or your preferred name)
- **Team**: Select your personal account or team
- **Git Repository**: Should auto-populate with `SajanMathew14/church-management-system`
- **Branch**: `main`

## 🔧 **Backend Deployment Options**

Since Vercel is primarily for frontend, you have several options for the backend:

### **Option 1: Vercel Serverless Functions (Recommended)**
Convert your Express.js backend to Vercel serverless functions:

1. Create `api/` folder in your project root
2. Convert each route to a serverless function
3. Update your frontend to use `/api/` endpoints

### **Option 2: Railway (Easy Backend Hosting)**
1. Go to [Railway.app](https://railway.app)
2. Connect your GitHub repository
3. Select the backend folder
4. Railway will auto-deploy your Express.js app
5. Use the Railway URL in your `NEXT_PUBLIC_API_URL`

### **Option 3: Render (Free Backend Hosting)**
1. Go to [Render.com](https://render.com)
2. Create a new Web Service
3. Connect your GitHub repository
4. Set build command: `cd backend && npm install`
5. Set start command: `cd backend && npm start`

## 📋 **Complete Deployment Checklist**

### **Before Deploying:**
- [ ] Ensure your Supabase database is set up and running
- [ ] Have your Supabase credentials ready
- [ ] Decide on backend hosting solution
- [ ] Test your application locally

### **Vercel Configuration:**
- [ ] Framework Preset: **Next.js**
- [ ] Root Directory: **frontend**
- [ ] Build Command: `cd frontend && npm run build`
- [ ] Output Directory: `frontend/.next`
- [ ] Install Command: `cd frontend && npm install`

### **Environment Variables to Add:**
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `NEXT_PUBLIC_API_URL`
- [ ] `NEXT_PUBLIC_APP_NAME`
- [ ] `NEXT_PUBLIC_APP_VERSION`

### **After Deployment:**
- [ ] Test frontend deployment
- [ ] Deploy backend (if using separate service)
- [ ] Update `NEXT_PUBLIC_API_URL` with actual backend URL
- [ ] Test full application functionality
- [ ] Set up custom domain (optional)

## 🔍 **Troubleshooting Common Issues**

### **Build Fails:**
- Ensure root directory is set to `frontend`
- Check that all dependencies are in `frontend/package.json`
- Verify build command includes `cd frontend`

### **Environment Variables Not Working:**
- Ensure all variables start with `NEXT_PUBLIC_` for client-side access
- Check spelling and formatting
- Redeploy after adding variables

### **API Calls Failing:**
- Verify `NEXT_PUBLIC_API_URL` is correct
- Ensure backend is deployed and accessible
- Check CORS settings in your backend

## 🌐 **Recommended Deployment Flow**

1. **Deploy Frontend to Vercel** (with placeholder API URL)
2. **Deploy Backend to Railway/Render**
3. **Update Frontend Environment Variables** with real backend URL
4. **Redeploy Frontend** with updated API URL
5. **Test Complete Application**

## 📝 **Sample Environment Variables**

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://qntmivdrmuigvuobbniv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# API Configuration (update after backend deployment)
NEXT_PUBLIC_API_URL=https://your-backend.railway.app

# App Configuration
NEXT_PUBLIC_APP_NAME=Church Management System
NEXT_PUBLIC_APP_VERSION=1.0.0
```

## 🚀 **Quick Start Commands**

After deployment, your app will be available at:
- **Frontend**: `https://your-project-name.vercel.app`
- **Backend**: `https://your-backend-service.com` (depending on hosting choice)

## 📞 **Need Help?**

If you encounter issues:
1. Check Vercel deployment logs
2. Verify all environment variables are set
3. Ensure Supabase is properly configured
4. Test API endpoints independently

Your Church Management System will be live and accessible worldwide once deployed! 🎉
