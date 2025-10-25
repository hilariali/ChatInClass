# 🔥 Firebase Setup - Quick Guide

## Step 1: Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" → Name it "ChatInClass"
3. Disable Google Analytics → Click "Create project"

## Step 2: Setup Realtime Database
1. Click "Realtime Database" in left sidebar
2. Click "Create Database"
3. Choose "Start in test mode"
4. Select your region → Click "Done"

## Step 3: Get Your Config
1. Click gear icon ⚙️ → "Project settings"
2. Scroll to "Your apps" → Click web icon `</>`
3. Register app as "ChatInClass"
4. Copy the config object that looks like:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyC...",
  authDomain: "chatinclass-xxxxx.firebaseapp.com",
  databaseURL: "https://chatinclass-xxxxx-default-rtdb.firebaseio.com/",
  projectId: "chatinclass-xxxxx",
  storageBucket: "chatinclass-xxxxx.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};
```

## Step 4: Update Your Code
Replace the placeholder config in `index.html` (around line 10) with your real config.

## Step 5: Set Database Rules
In Firebase Console → Realtime Database → Rules, paste:

```json
{
  "rules": {
    "messages": {
      ".read": true,
      ".write": true
    },
    "users": {
      ".read": true,
      ".write": true
    },
    "typing": {
      ".read": true,
      ".write": true
    }
  }
}
```

## Step 6: Test It!
1. Open `index.html` in your browser
2. Should see "🟢 Connected to Firebase" status
3. Open on multiple devices/tabs
4. Messages sync instantly across all devices!

---

**That's it!** Your ChatInClass now has real-time Firebase sync! 🎉