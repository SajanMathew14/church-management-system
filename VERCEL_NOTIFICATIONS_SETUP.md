# Vercel Deployment Notifications & Monitoring Setup

## 🔔 Notification Configuration Guide

### **1. Email Notifications**

#### **Setup in Vercel Dashboard**
1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Notifications**
3. Configure email notifications:

```json
{
  "email_notifications": {
    "deployment_failed": true,
    "deployment_succeeded": false,
    "deployment_ready": true,
    "deployment_canceled": true,
    "deployment_error": true
  }
}
```

#### **Recommended Email Settings**
- ✅ **Deployment Failed**: Critical - Always notify
- ❌ **Deployment Succeeded**: Optional - Can be noisy
- ✅ **Deployment Ready**: Important - Notify when live
- ✅ **Deployment Canceled**: Important - Track cancellations
- ✅ **Deployment Error**: Critical - Always notify

### **2. Slack Integration**

#### **Step 1: Create Slack Webhook**
1. Go to your Slack workspace
2. Navigate to **Apps** → **Incoming Webhooks**
3. Create a new webhook for your channel
4. Copy the webhook URL

#### **Step 2: Configure in Vercel**
1. In Vercel Dashboard → **Settings** → **Git Integration**
2. Add webhook URL: `https://hooks.slack.com/services/YOUR/WEBHOOK/URL`
3. Configure events:

```json
{
  "webhook_events": [
    "deployment.created",
    "deployment.ready",
    "deployment.failed",
    "deployment.error",
    "deployment.canceled"
  ]
}
```

#### **Step 3: Custom Slack Message Format**
Create a custom webhook handler for better formatting:

```javascript
// webhook-handler.js (optional custom handler)
const formatSlackMessage = (event) => {
  const { type, payload } = event;
  
  switch (type) {
    case 'deployment.ready':
      return {
        text: `✅ Deployment Ready`,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Church Management System* deployed successfully!\n*URL:* ${payload.url}\n*Commit:* ${payload.meta.githubCommitSha.slice(0, 7)}`
            }
          }
        ]
      };
    case 'deployment.failed':
      return {
        text: `❌ Deployment Failed`,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Church Management System* deployment failed!\n*Error:* ${payload.errorMessage}\n*Commit:* ${payload.meta.githubCommitSha.slice(0, 7)}`
            }
          }
        ]
      };
    default:
      return { text: `Deployment event: ${type}` };
  }
};
```

### **3. Discord Integration**

#### **Setup Discord Webhook**
1. Go to your Discord server
2. Navigate to **Server Settings** → **Integrations** → **Webhooks**
3. Create a new webhook
4. Copy the webhook URL

#### **Configure in Vercel**
Add Discord webhook URL in Vercel settings:
```
https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN
```

#### **Discord Message Format**
```json
{
  "embeds": [
    {
      "title": "🚀 Deployment Status",
      "description": "Church Management System deployment update",
      "color": 3066993,
      "fields": [
        {
          "name": "Status",
          "value": "✅ Ready",
          "inline": true
        },
        {
          "name": "URL",
          "value": "[View Live Site](https://church-management-system-hrda.vercel.app)",
          "inline": true
        },
        {
          "name": "Commit",
          "value": "abc1234",
          "inline": true
        }
      ],
      "timestamp": "2025-01-28T19:00:00.000Z"
    }
  ]
}
```

### **4. GitHub Status Checks**

#### **Automatic Integration**
Vercel automatically provides GitHub status checks:
- ✅ Build status on commits
- ✅ Deployment preview links on PRs
- ✅ Performance metrics
- ✅ Lighthouse scores

#### **Custom Status Checks**
Add custom checks in `.github/workflows/vercel.yml`:

```yaml
name: Vercel Deployment
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

## 📊 Monitoring Dashboard Setup

### **1. Vercel Analytics**

#### **Enable Analytics**
- ✅ Already integrated in `layout.tsx`
- ✅ Automatic page view tracking
- ✅ Core Web Vitals monitoring
- ✅ Real User Monitoring (RUM)

#### **Custom Events Tracking**
Add custom events for business metrics:

```typescript
// In your components
import { track } from '@vercel/analytics';

// Track user actions
const handleLogin = () => {
  track('user_login', { method: 'email' });
};

const handleDashboardView = () => {
  track('dashboard_view', { user_role: 'admin' });
};
```

### **2. Health Check Monitoring**

#### **Health Check Endpoint**
- ✅ Created at `/api/health`
- ✅ Tests database connectivity
- ✅ Validates environment variables
- ✅ Returns detailed status

#### **External Monitoring**
Set up external monitoring with UptimeRobot:

```json
{
  "monitor_type": "HTTP(s)",
  "url": "https://church-management-system-hrda.vercel.app/api/health",
  "interval": 300,
  "timeout": 30,
  "http_method": "GET",
  "expected_status_codes": [200],
  "alert_contacts": ["your-email@domain.com"]
}
```

### **3. Performance Monitoring**

#### **Core Web Vitals Tracking**
Monitor key performance metrics:
- **LCP (Largest Contentful Paint)**: < 2.5s
- **FID (First Input Delay)**: < 100ms
- **CLS (Cumulative Layout Shift)**: < 0.1

#### **Custom Performance Metrics**
```typescript
// Add to your pages
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

function sendToAnalytics(metric) {
  track('web_vital', {
    name: metric.name,
    value: metric.value,
    id: metric.id,
  });
}

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);
```

## 🚨 Alert Configuration

### **Alert Thresholds**

#### **Critical Alerts (Immediate Response)**
- 🔴 Deployment failures
- 🔴 Health check failures (>5 minutes)
- 🔴 Error rate >5%
- 🔴 Response time >10 seconds

#### **Warning Alerts (Monitor Closely)**
- 🟡 Build time >3 minutes
- 🟡 Health check response time >2 seconds
- 🟡 Error rate >1%
- 🟡 Core Web Vitals degradation

#### **Info Alerts (Track Trends)**
- 🟢 Successful deployments
- 🟢 Performance improvements
- 🟢 New feature releases

### **Alert Channels**

#### **Slack Alerts**
```json
{
  "critical": "#alerts-critical",
  "warning": "#alerts-warning",
  "info": "#deployments"
}
```

#### **Email Alerts**
```json
{
  "critical": ["admin@church.com", "dev@church.com"],
  "warning": ["dev@church.com"],
  "info": ["dev@church.com"]
}
```

## 📋 Monitoring Checklist

### **Daily Monitoring**
- [ ] Check deployment status
- [ ] Review error rates
- [ ] Monitor performance metrics
- [ ] Verify health check status

### **Weekly Review**
- [ ] Analyze deployment frequency
- [ ] Review performance trends
- [ ] Check alert effectiveness
- [ ] Update monitoring thresholds

### **Monthly Optimization**
- [ ] Review and update alert rules
- [ ] Optimize performance budgets
- [ ] Update monitoring documentation
- [ ] Plan monitoring improvements

## 🔧 Troubleshooting Common Issues

### **Notification Not Received**

#### **Email Issues**
1. Check spam/junk folder
2. Verify email address in Vercel settings
3. Check notification preferences
4. Test with different email address

#### **Slack Issues**
1. Verify webhook URL is correct
2. Check Slack app permissions
3. Test webhook manually with curl
4. Verify channel permissions

#### **Discord Issues**
1. Check webhook URL format
2. Verify server permissions
3. Test webhook with sample payload
4. Check rate limiting

### **Health Check Failures**

#### **Database Connection Issues**
1. Check Supabase service status
2. Verify environment variables
3. Test database connectivity
4. Check network connectivity

#### **Environment Variable Issues**
1. Verify all required variables are set
2. Check variable names and values
3. Redeploy after variable changes
4. Test locally with same variables

## 📞 Emergency Response

### **Deployment Failure Response**
1. **Immediate**: Check Vercel deployment logs
2. **Investigate**: Review recent code changes
3. **Rollback**: Use Vercel dashboard to rollback
4. **Fix**: Address root cause and redeploy
5. **Monitor**: Verify fix and monitor stability

### **Performance Degradation Response**
1. **Identify**: Check which metrics are affected
2. **Analyze**: Review recent changes and deployments
3. **Optimize**: Apply performance fixes
4. **Monitor**: Track improvement over time

### **Health Check Failure Response**
1. **Verify**: Check if application is actually down
2. **Investigate**: Review logs and error messages
3. **Fix**: Address underlying issues
4. **Monitor**: Verify resolution and stability

---

## 🎯 Next Steps

1. **Configure Notifications**: Set up Slack/Discord webhooks
2. **Enable Monitoring**: Activate all monitoring features
3. **Test Alerts**: Verify notification delivery
4. **Document Processes**: Create runbooks for common scenarios
5. **Train Team**: Ensure team knows how to respond to alerts

**Your auto-deployment system is now fully monitored and will notify you of any issues!**
