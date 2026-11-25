# Masidy Store - User Account & Dashboard Guide

## ✅ How the User Account System Works

### **Account Access Flow**

1. **Not Logged In**
   - Click the **user icon** (👤) in the navbar
   - Auth modal appears with options to:
     - **Sign In** (existing users)
     - **Create Account** (new users)

2. **Creating an Account**
   - Click "Create an account" in the modal
   - Enter: Name, Email, Password
   - Click "Create account"
   - Automatically logged in after signup

3. **Signing In**
   - Click user icon in navbar
   - Enter: Email, Password
   - Click "Sign in"
   - Redirects to your account dashboard

4. **When Logged In**
   - User icon in navbar becomes clickable
   - Click user icon → Go to **Account Dashboard**
   - "Sign out" button appears in navbar (desktop)

## 📱 Account Dashboard Features

### **Main Dashboard** (`/account`)

Located at: **http://localhost:3000/account**

#### Features:
- ✅ **Profile Card**
  - Display your name
  - Show your email
  - Show user ID
  - Settings icon (visual indicator)

- ✅ **Orders Card**
  - Quick link to order history
  - Click to view all orders
  - Track shipments

- ✅ **Quick Actions Card**
  - Continue Shopping button
  - Sign out button
  - Easy access to common tasks

- ✅ **Help Section**
  - Links to: Shipping Info, Returns, FAQ, Contact

### **Order History** (`/account/orders`)

Located at: **http://localhost:3000/account/orders**

#### Features:
- ✅ List all your orders
- ✅ Shows for each order:
  - Order number
  - Order date
  - Total amount
  - Status (pending/confirmed/failed)
  - Items in the order
- ✅ Click any order to see details
- ✅ Empty state if no orders yet

### **Order Details** (`/account/orders/[id]`)

Located at: **http://localhost:3000/account/orders/{order-id}**

- ✅ Full order details
- ✅ Shipping information
- ✅ Item breakdown
- ✅ Status tracking

## 🔐 Authentication System

### How It Works

1. **Session-Based Auth**
   - Uses HTTP-only cookies
   - Secure session tokens
   - Stored in Vercel Postgres database

2. **Password Security**
   - Hashed with bcryptjs (12 rounds)
   - Never stored in plain text
   - Secure by default

3. **Session Management**
   - 7-day session duration
   - Automatic session refresh
   - Secure logout clears cookies

### API Endpoints

```
POST /api/auth/signup     - Create new account
POST /api/auth/login      - Sign in
POST /api/auth/logout     - Sign out
GET  /api/auth/me         - Get current user
GET  /api/account/orders  - Get user's orders
```

## 🎯 User Journey

### First Time User
```
1. Browse products → Add to cart
2. Go to checkout
3. See "Create account or continue as guest"
4. Create account with email/password
5. Complete checkout
6. Redirected to account dashboard
7. Can view order in Orders section
```

### Returning User
```
1. Click user icon in navbar
2. Sign in with email/password
3. Redirected to account dashboard
4. Click "Orders" to see order history
5. Click any order to see details
6. Click "Continue Shopping" to browse
```

## 🛠️ Updated Components

### **Navbar** (`components/navbar.tsx`)
- ✅ User icon links to `/account` when logged in
- ✅ Shows sign-in modal when not logged in
- ✅ Sign out button available (desktop)
- ✅ Responsive design

### **Account Page** (`app/account/page.tsx`)
- ✅ Enhanced dashboard layout
- ✅ 3-column grid (responsive)
- ✅ Profile, Orders, Quick Actions cards
- ✅ Help section with useful links
- ✅ Personalized welcome message

### **Orders Page** (`app/account/orders/page.tsx`)
- ✅ Lists all orders
- ✅ Order status badges
- ✅ Item summaries
- ✅ Empty state for new users
- ✅ Clickable order cards

## 🎨 Visual Design

### Dashboard Cards
- Clean white cards with borders
- Orange accent colors on hover
- Icons for visual clarity
- Responsive grid layout

### Status Badges
- **Pending**: Yellow badge
- **Confirmed**: Green badge
- **Failed**: Red badge
- Clear visual feedback

### Navigation
- Orange accent for clickable links
- Hover states on all interactive elements
- Consistent spacing and typography

## 📍 Navigation Paths

```
/ (home)
  └─ Click user icon (not logged in)
      └─ Auth modal → Sign up/Sign in
  
  └─ Click user icon (logged in)
      └─ /account (dashboard)
          ├─ View profile info
          ├─ Click "Orders" → /account/orders
          │   └─ Click order → /account/orders/[id]
          ├─ Click "Continue Shopping" → /search
          └─ Click "Sign out" → Logout & redirect to /
```

## 🚀 Testing the Account System

### Test Flow:
1. Visit http://localhost:3000
2. Click user icon (👤) in navbar
3. Click "Create an account"
4. Enter test data:
   - Name: Test User
   - Email: test@example.com
   - Password: password123
5. Click "Create account"
6. You'll be redirected to `/account` dashboard
7. Explore:
   - See your profile info
   - Click "Orders" (will be empty for new user)
   - Click "Continue Shopping"
   - Click user icon to return to dashboard
   - Click "Sign out" to logout

## 💡 Features Summary

### ✅ What's Working
- User registration (signup)
- User login
- Session management
- Account dashboard
- Order history viewing
- Order detail viewing
- Secure logout
- Protected routes (redirect if not logged in)

### 🔄 Current Limitations
- No profile editing yet (name/email updates)
- No password reset/forgot password
- No email verification
- No two-factor authentication

### 🎯 Recommended Enhancements (Future)

1. **Profile Editing**
   - Edit name
   - Change email
   - Update password
   - Add shipping addresses

2. **Password Recovery**
   - Forgot password flow
   - Email reset links
   - Security questions

3. **User Preferences**
   - Newsletter subscription
   - Email notifications
   - Order tracking preferences

4. **Enhanced Order Tracking**
   - Real-time shipping updates
   - Tracking numbers
   - Estimated delivery dates

---

**Status**: ✅ **FULLY FUNCTIONAL**
**Last Updated**: July 2, 2026
**Dashboard**: http://localhost:3000/account
**Orders**: http://localhost:3000/account/orders

The user account system is complete and working! Users can sign up, sign in, view their dashboard, and manage their orders.
