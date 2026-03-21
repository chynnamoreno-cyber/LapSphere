# Stock Edit Feature - Quick Guide

## Overview
You can now edit product stock directly from the **Stock Alerts** screen. This eliminates the need to navigate to the Products page to add stock when you see a low stock alert.

## How to Use

### 1. Open Stock Alerts
- Go to **Admin Dashboard** → **Stock Alerts** tab

### 2. View Alert Cards
Each alert card shows:
- **Product Name**: Which product needs stock
- **Type**: "low" (< 10 items) or "out_of_stock" (0 items)
- **Current Stock**: How many items are in stock
- **Threshold**: Alert trigger level (usually 10)
- **Edit Stock Button**: Blue button with pencil icon

### 3. Click "Edit Stock"
- Press the blue **Edit Stock** button on any alert card
- A modal dialog appears with the product name

### 4. Enter New Stock Quantity
- Type the new stock amount (must be a number ≥ 0)
- Example: If product has 0 stock, type "50" to add 50 items

### 5. Confirm Update
- Click **Update Stock** button
- System will:
  - ✅ Update product stock in database
  - ✅ Automatically create/resolve stock alerts
  - ✅ Show success message with updated amount
  - ✅ Refresh the alert list

### 6. Cancel (Optional)
- Click **Cancel** button to close without changes

## Features

✅ **Direct Editing**: No need to find product in Products page  
✅ **Real-time Updates**: Stock immediately reflects in system  
✅ **Auto Alert Management**: Alerts resolve when stock is restored  
✅ **Input Validation**: Prevents invalid stock numbers  
✅ **Error Handling**: Shows clear error messages if update fails

## Example Workflow

```
1. See "VivoBook 15" with type: out_of_stock
2. Click "Edit Stock" button
3. Modal opens showing product name
4. Enter "20" (to restock 20 units)
5. Click "Update Stock"
6. Alert resolved, product now has 20 items
7. Alert disappears from list or shows "Resolved"
```

## Technical Details

- **Endpoint Used**: `PUT /products/:id`
- **Field Updated**: `countInStock`
- **Auto-Validation**: Stock alerts automatically created/resolved based on new stock level
- **Authentication**: Uses your admin JWT token

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Invalid Input" error | Make sure you enter a number (e.g., "10", not "abc") |
| Update fails | Check your internet connection and try again |
| "Product not found" error | Refresh the page and try again |
| Alert still shows after update | Pull down to refresh the alerts list |

---

**Status**: ✅ Feature ready to use  
**Date Added**: March 20, 2026
