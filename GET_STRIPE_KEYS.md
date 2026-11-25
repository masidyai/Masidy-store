# 🔑 How to Get Your Stripe API Keys

## Your Stripe Account IS Working!

Since you have products in Stripe dashboard, your account is activated! You just need to get the API keys.

---

## 📋 Step-by-Step Instructions

### Step 1: Go to API Keys Page
1. Open Stripe Dashboard: https://dashboard.stripe.com
2. Click **"Developers"** in the left sidebar
3. Click **"API keys"**

OR directly go to: https://dashboard.stripe.com/apikeys

---

### Step 2: Choose Test or Live Mode

At the top right of the dashboard, you'll see a toggle:
- **Test mode** - For testing (fake payments)
- **Live mode** - For real payments

**For testing**: Use Test mode
**For real payments**: Use Live mode (but complete activation first)

---

### Step 3: Copy Your Keys

You'll see two keys:

#### Publishable Key
- Starts with `pk_test_` (test) or `pk_live_` (live)
- This one is safe to share
- Example: `pk_test_51TofE7ID5vxgh0GN...`

#### Secret Key  
- Starts with `sk_test_` (test) or `sk_live_` (live)
- Click "Reveal test key token" or "Reveal live key token"
- **KEEP THIS SECRET!** Don't share publicly
- Example: `replace_with_your_stripe_secret_key`

---

### Step 4: Share Keys With Me

Send me:
1. **Publishable key** (the pk_... one)
2. **Secret key** (the sk_... one)  
3. Tell me if they're **test** or **live** keys

---

### Step 5: I'll Add Them

I'll update your `.env.local` file with:

```env
# If Test Keys
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE
STRIPE_SECRET_KEY=replace_with_your_stripe_secret_key

# If Live Keys
STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_KEY_HERE
STRIPE_SECRET_KEY=replace_with_your_stripe_secret_key
```

---

## 🎯 After Adding Keys

Your store will immediately work with payments!

### If Using Test Keys:
- Use test credit card: `4242 4242 4242 4242`
- Any future expiry date
- Any 3-digit CVC
- Payments won't be real

### If Using Live Keys:
- Real credit cards work
- Real payments are processed
- Money goes to your bank account

---

## ⚠️ Important Notes

### Same Account for Both Sites?
If you want to use the **same Stripe account** for both:
- masidy.com
- masidy.store

Then just use the **same API keys** on both sites. That's totally fine!

### Separate Accounts?
If you want **different accounts**, you need to:
1. Create a new Stripe account for masidy.store
2. Complete the activation (fix the "incomplete" issue)
3. Get separate API keys

**My recommendation**: Use the **same account** for both sites. It's simpler and works immediately!

---

## 🔐 Security Tips

1. **Never share secret keys publicly**
2. **Never commit keys to git** (they're in .env.local which is gitignored)
3. **Use environment variables** (which we already do)
4. **Rotate keys if compromised**

---

## 📱 Screenshot Guide

If you're unsure where to find the keys:

1. **Go to Stripe Dashboard**
2. **Look for "Developers" in left menu**
3. **Click "API keys"**
4. **You'll see this screen**:

```
Standard keys    [Test mode / Live mode toggle]

Publishable key
pk_test_51TofE...
Token            [Copy]

Secret key
replace_with_your_stripe_secret_key
[Reveal test key token]  [Roll key]
```

5. **Copy both keys**
6. **Send them to me**

---

## ✅ What Happens Next

1. I add keys to `.env.local`
2. Restart dev server (or Vercel redeploys)
3. Your checkout button starts working
4. Customers can pay with credit cards
5. Money goes to your Stripe account
6. Orders are automatically created
7. Emails are sent to customers
8. You can see orders in admin dashboard

**It's that simple!** 🎉

---

## 🆘 If Keys Don't Work

If you get the keys and they don't work:

1. **Check if account needs activation** for live mode
2. **Make sure test/live mode matches** (test keys in test mode)
3. **Check if keys are correct** (no extra spaces)
4. **Verify account is in good standing**
5. **Check Stripe dashboard for errors**

But since you have products set up, it should work fine!
