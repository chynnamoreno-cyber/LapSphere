# Order Status Notifications Setup

## What's Fixed

### 1. ✅ Navigation Error
- Fixed "My Orders" navigation error in checkout flow
- Uses `navigation.reset()` to properly navigate from nested CheckoutNavigator to root-level "My Orders" tab

### 2. ✅ Order Status Notifications
- Created `Notification` model to store all notifications in the database
- Order status changes (pending, confirmed, shipped, delivered, cancelled) now create database notifications
- Notifications are visible in the Notification Center screen
- Each notification shows:
  - Order status icon and badge
  - Clear message about what happened
  - Timestamp
  - Read/unread status

### 3. ✅ Email Notifications
- Created `emailService.js` to send transactional emails
- Emails sent automatically when order status changes:
  - ✅ Order Confirmed
  - 📦 Order Shipped
  - 🎉 Order Delivered
  - ❌ Order Cancelled
- Professional HTML email templates with order details

### 4. ✅ Notification Center Updates
- NotificationCenter now fetches notifications from backend API
- Shows both push notifications and database notifications
- Order notifications have special styling with order icons
- Unread notifications have visual indicators

## Environment Variables Required

Add these to your `.env` file in the `backend/` folder:

```env
# Email Configuration (for transactional emails)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@lapsphere.com
APP_BASE_URL=https://lapsphere.com
```

### Gmail Setup (Recommended):
1. Enable 2-Factor Authentication on your Gmail account
2. Create an App Password: https://myaccount.google.com/apppasswords
3. Use the 16-character app password in `EMAIL_PASSWORD`

### Alternative Providers:
You can use any SMTP provider (SendGrid, AWS SES, etc.) by changing the `EMAIL_HOST` and credentials.

## API Endpoints

### Get Notifications
```
GET /api/v1/notifications?page=1&limit=20&unreadOnly=false
Authorization: Bearer <JWT_TOKEN>
```

### Get Unread Count
```
GET /api/v1/notifications/unread-count
Authorization: Bearer <JWT_TOKEN>
```

### Mark Notification as Read
```
PUT /api/v1/notifications/:id/read
Authorization: Bearer <JWT_TOKEN>
```

### Mark All as Read
```
PUT /api/v1/notifications/mark-all-read
Authorization: Bearer <JWT_TOKEN>
```

### Delete Notification
```
DELETE /api/v1/notifications/:id
Authorization: Bearer <JWT_TOKEN>
```

## Testing

### Test Email Notifications:
1. Place an order in the app
2. As admin, go to Admin > Orders
3. Change order status to "shipped" or "delivered"
4. Check user's email inbox for notification
5. Check Notification Center in app to see the database notification

### Test Order Navigation:
1. Go through checkout process
2. Place an order
3. Should navigate smoothly to My Orders screen showing the new order

## Database Changes

The following Mongodb collection is now in use:
- `notifications` - Stores all user notifications with status, read state, and metadata

## Files Modified/Created

**Created:**
- `backend/models/Notification.js` - Notification database model
- `backend/services/emailService.js` - Email sending service
- `backend/routes/notifications.js` - Notification API endpoints

**Modified:**
- `backend/app.js` - Added notifications route
- `backend/routes/orders.js` - Added notification creation and email sending on order status change
- `frontend-expo/Screens/Checkout/Confirm.js` - Fixed navigation to My Orders
- `frontend-expo/Screens/User/NotificationCenter.js` - Updated to fetch database notifications

## Next Steps (Optional Enhancements)

1. **SMS Notifications** - Add Twilio for SMS alerts on shipped/delivered
2. **In-App Toast** - Show toast when order status changes (if app is open)
3. **Notification Preferences** - Let users choose notification channels (email, SMS, push)
4. **Scheduled Emails** - Send daily digest of all notifications
5. **Admin Notifications** - Notify admin when user cancels an order

## Troubleshooting

**Emails not sending?**
- Check `.env` has correct EMAIL_USER and EMAIL_PASSWORD
- Verify EMAIL_HOST is correct for your provider
- Check backend logs for `[emailService]` errors

**Notifications not appearing in app?**
- Verify user is authenticated (JWT token valid)
- Check backend logs for `[notifyUserOrderStatus]` messages
- Clear app cache and refresh notifications list

**Navigation still broken?**
- Clear app cache: `npm cache clean --force` and clear Expo cache
- Rebuild development client: `npx expo prebuild --clean`
