# 🔧 FIX: Sign-In Issue

## Problem
The database is missing the `is_admin` column that was added in the recent update.

**Error**: `column u.is_admin does not exist`

---

## ✅ QUICK FIX (2 minutes)

### **Option 1: Visit Migration Endpoint** (Easiest)

1. Open your browser
2. Go to: **http://localhost:3000/api/migrate**
3. You'll see a success message
4. Refresh the page
5. Try signing in again! ✅

### **Option 2: Manual Database Update** (If Option 1 doesn't work)

Run this SQL in your database:

```sql
-- Add is_admin column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Create password reset table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 📋 AFTER FIXING

Once the migration is complete:

1. **Sign In** - Should work now!
2. **Become Admin**:
   - Open browser console (F12)
   - Run: `fetch('/api/admin/make-admin', {method: 'POST'}).then(r=>r.json()).then(console.log)`
3. **Visit Admin** - Go to `/admin`

---

## 🎯 WHY THIS HAPPENED

When I added the admin authorization feature, I updated the code to use an `is_admin` column, but your existing database didn't have it yet. The migration endpoint adds it automatically!

---

## ✅ VERIFICATION

After running the migration, you should be able to:
- ✅ Sign in successfully
- ✅ Sign up new users
- ✅ Access your account
- ✅ View orders
- ✅ Use all features

---

**Status**: Ready to fix!
**Time**: 30 seconds
**Action**: Visit http://localhost:3000/api/migrate
