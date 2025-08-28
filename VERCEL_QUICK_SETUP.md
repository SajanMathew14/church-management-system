# Quick Vercel Setup - Exact Settings

Based on your Vercel interface, here are the **exact settings** to choose:

## 🎯 **Current Settings to Change:**

### **1. Framework Preset**
- **Current**: "Other" ❌
- **Change to**: "Next.js" ✅
- Click the dropdown and select "Next.js"

### **2. Root Directory**
- **Current**: `./` ❌
- **Change to**: `frontend` ✅
- Click "Edit" button and type `frontend`

### **3. Build and Output Settings** (Click to expand)
When you click "Build and Output Settings":

**Build Command:**
```
npm run build
```
(Vercel will automatically run this in the frontend directory)

**Output Directory:**
```
.next
```

**Install Command:**
```
npm install
```

### **4. Environment Variables** (Click to expand)
Add these **5 environment variables**:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://qntmivdrmuigvuobbniv.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFudG1pdmRybXVpZ3Z1b2Jibml2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzMDA0MTAsImV4cCI6MjA3MTg3NjQxMH0.P5E3h2mtAVu29c4G8zudhEn83Bx8thvbiIxaThL4xW8` |
| `NEXT_PUBLIC_API_URL` | `https://your-backend-url.com` |
| `NEXT_PUBLIC_APP_NAME` | `Church Management System` |
| `NEXT_PUBLIC_APP_VERSION` | `1.0.0` |

**Note**: For `NEXT_PUBLIC_API_URL`, use a placeholder for now. We'll update it after deploying the backend.

## ✅ **Final Settings Summary:**

- **Project Name**: `church-management-system` (keep as is)
- **Team**: Keep your selection
- **Framework Preset**: **Next.js** (change from "Other")
- **Root Directory**: **frontend** (change from "./")
- **Repository**: `SajanMathew14/church-management-system` ✅
- **Branch**: `main` ✅

## 🚀 **Step-by-Step Actions:**

1. **Change Framework Preset**: Click dropdown → Select "Next.js"
2. **Change Root Directory**: Click "Edit" → Type `frontend`
3. **Add Environment Variables**: Click "Environment Variables" → Add the 5 variables above
4. **Click "Deploy"**

## ⚠️ **Important Notes:**

- The frontend will deploy successfully even with a placeholder API URL
- You can update the `NEXT_PUBLIC_API_URL` later when you deploy the backend
- Vercel will automatically detect it's a Next.js project once you change the framework preset
- The build will happen in the `frontend` directory automatically

## 🎯 **What Happens Next:**

1. Vercel will clone your repository
2. Navigate to the `frontend` directory
3. Run `npm install`
4. Run `npm run build`
5. Deploy your Next.js application
6. Provide you with a live URL

Your frontend will be live and functional (except for API calls until backend is deployed)!
