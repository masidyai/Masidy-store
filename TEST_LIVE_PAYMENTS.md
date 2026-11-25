# 🧪 Test Your Live Stripe Payments

## ✅ Your Store is Now Set Up with LIVE Keys!

Your store is configured with **masidy.com's live Stripe keys** and ready to accept real payments.

---

## ⚠️ IMPORTANT: Live Mode vs Test Mode

You're now in **LIVE MODE** which means:
- ❌ **Test cards won't work** (like 4242 4242 4242 4242)
- ✅ **Real credit cards will be charged**
- 💰 **Money will go to your Stripe account**
- 📧 **Customers will receive real receipts**

---

## 🧪 How to Test Safely

### Option 1: Use Test Mode First (Recommended)

To test without charging real money, add test keys:

```env
# In .env.local, uncomment and add test keys:
STRIPE_SECRET_KEY=replace_with_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_TEST_KEY
```

Then test cards work:
- Card: `4242 4242 4242 4242`
- Expiry: Any future date
- CVC: Any 3 digits

### Option 2: Make a Real Test Purchase

If you want to test live mode:
1. Use your own real credit card
2. Make a small purchase (like $1)
3. Then immediately **refund** it in Stripe dashboard
4. You'll only pay Stripe fees (~$0.30)

### Option 3: Use Stripe Test Mode Toggle

In Stripe dashboard, toggle between Test/Live mode to test safely.

---

## 🧪 Testing Steps

### Step 1: Open Your Store
Go to: http://localhost:3000

### Step 2: Add Items to Cart
1. Browse products
2. Click "Add to Cart" on any item
3. Cart icon should show quantity

### Step 3: Open Cart
1. Click cart icon (top right)
2. You should see your items
3. Click "Checkout" button

### Step 4: Fill Checkout Form
1. Enter your email
2. Enter shipping address
3. Click "Continue to Payment"

### Step 5: Complete Payment
You'll be redirected to **Stripe Checkout** page:

**If using LIVE mode**:
- Use a real credit card
- Payment will be charged for real

**If using TEST mode**:
- Use test card: 4242 4242 4242 4242
- No real charge

### Step 6: Verify Success
After payment:
1. You'll be redirected to success page
2. You'll receive confirmation email
3. Order appears in your admin dashboard

---

## 🔍 Verify in Stripe Dashboard

### Check Payments:
1. Go to: https://dashboard.stripe.com/payments
2. Make sure you're in correct mode (Test/Live toggle)
3. You should see your payment

### Check Orders:
1. Go to your admin: http://localhost:3000/admin
2. You should see the order
3. Status should be "completed"

---

## 🚨 If Payment Fails

### Common Issues:

#### 1. "Card Declined"
- If using live mode with test card → Switch to test mode
- If using real card → Check card details are correct
- Check if card has sufficient funds

#### 2. "Invalid API Key"
- Keys might be for wrong mode (test vs live)
- Keys might be expired
- Check keys are copied correctly (no extra spaces)

#### 3. "Payment Not Completing"
- Check browser console for errors (F12)
- Check terminal/server logs
- Verify webhook is working

#### 4. "Order Not Created"
- Database might not be connected
- Check terminal for error messages
- Run migration: http://localhost:3000/api/migrate

---

## 💰 About Live Payments

### What Happens with Live Mode:

1. **Customer pays** → Money is held by Stripe
2. **Stripe takes fee** → 2.9% + €0.25 per transaction
3. **Money goes to your bank** → After 2-7 days (depending on country)
4. **You can see balance** → Stripe Dashboard → Balance

### Stripe Fees:
- **European cards**: 1.5% + €0.25
- **Non-European cards**: 2.9% + €0.25
- **Currency conversion**: Additional 2%

### Payouts:
- **Automatic**: Stripe pays you every few days
- **Manual**: You can request payout anytime
- **Bank account**: Goes to the bank you linked in Stripe

---

## 🔐 Security Checklist

Before going live publicly:

- [ ] Test checkout flow completely
- [ ] Verify emails are sending
- [ ] Check orders appear in admin
- [ ] Test refund process
- [ ] Configure webhook (for order updates)
- [ ] Set up SSL certificate (https)
- [ ] Add privacy policy
- [ ] Add terms of service
- [ ] Test on mobile devices
- [ ] Check payment page on different browsers

---

## 🚀 When Ready to Go LIVE

### For Local Testing:
✅ Your setup is ready now at http://localhost:3000

### For Production (masidy.store):

1. **Deploy to Vercel**:
   ```bash
   vercel --prod
   ```

2. **Add Environment Variables in Vercel**:
   - Go to: Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add:
     - `STRIPE_LIVE_SECRET_KEY` = your secret key
     - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` = your publishable key
     - All other env variables from `.env.local`

3. **Redeploy**:
   ```bash
   vercel --prod
   ```

4. **Test on live site**: https://masidy.store

---

## 📊 Monitor Your Payments

### Stripe Dashboard:
- **Payments**: See all transactions
- **Customers**: See customer list
- **Disputes**: Handle chargebacks
- **Balance**: Check your money
- **Reports**: Download financial reports

### Your Admin Dashboard:
- http://localhost:3000/admin
- See all orders
- Mark orders as shipped
- View customer information

---

## 🆘 Need Help?

### If something doesn't work:

1. **Check browser console**: F12 → Console tab
2. **Check server logs**: Look at terminal where `npm run dev` is running
3. **Check Stripe logs**: Dashboard → Developers → Logs
4. **Test in Stripe test mode** first to isolate issues

### Tell me if:
- Payment button doesn't work
- Checkout page shows error
- Payment completes but order not created
- Email not sending
- Any other issue

I'll help you fix it immediately! 🔧

---

## ✅ Summary

**Your store now**:
- ✅ Has live Stripe keys configured
- ✅ Can accept real credit card payments
- ✅ Will process actual money
- ✅ Is ready to go live on masidy.store

**Next steps**:
1. Test checkout locally
2. Verify everything works
3. Deploy to Vercel with same environment variables
4. Start selling! 🎉

**Remember**: You're in LIVE mode - real money will be charged!
