# How Broadcast Message with Notifications Works

## Complete Flow Explanation

### 1. System Architecture Overview

```
┌─────────────────┐      ┌──────────────┐      ┌─────────────┐
│  Super Admin    │─────▶│   Backend    │───── │  Database   │
│  Dashboard      │      │   API        │      │ (MongoDB)   │
└─────────────────┘      └──────────────┘      └─────────────┘
                                │
                                ▼
                         ┌──────────────┐
                         │ Notification │
                         │   System     │
                         └──────────────┘
                                │
                    ┌───────────┴───────────┐
                    ▼                       ▼
            ┌──────────────┐        ┌──────────────┐
            │  Admin User  │        │ Regular User │
            │  Navbar      │        │  Navbar      │
            └──────────────┘        └──────────────┘
```

---

## 2. Step-by-Step Implementation

### STEP 1: Database Model (Notification Schema)

**File:** `Backend/models/Notification.js`

```javascript
const NotificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // For fast queries
    },
    type: {
      type: String,
      enum: ["info", "success", "warning", "alert"],
      default: "info",
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    read: {
      type: Boolean,
      default: false, // Unread by default
    },
    link: {
      type: String,
      default: null,
    },
  },
  { timestamps: true },
);
```

**What it stores:**

- `userId` - Who receives the notification
- `type` - Visual style (info/success/warning/alert)
- `title` - Notification headline
- `message` - Notification content
- `read` - Whether user has read it
- `createdAt` - When it was created (automatic)

---

### STEP 2: Backend Controller (Broadcasting Logic)

**File:** `Backend/controllers/notificationController.js`

#### For Super Admin (Broadcast to All):

```javascript
export const broadcastToAll = async (req, res) => {
  try {
    // 1. Get data from request
    const { title, message, type = "info", targetDepartment = null } = req.body;
    const superAdminUser = req.user;

    // 2. Validate input
    if (!title || !message) {
      return res
        .status(400)
        .json({ message: "Title and message are required" });
    }

    // 3. Check if user is super admin
    const userRole =
      typeof superAdminUser.role === "object"
        ? superAdminUser.role.name
        : superAdminUser.role;

    if (userRole !== "SUPER_ADMIN") {
      return res
        .status(403)
        .json({ message: "Only super admins can broadcast" });
    }

    // 4. Import User model
    const User = (await import("../models/User.models.js")).default;

    // 5. Build query - all users OR specific department
    const query = { isActive: true };
    if (targetDepartment) {
      query.department = targetDepartment;
    }

    // 6. Find all target users
    const users = await User.find(query).select("_id");

    // 7. Create notification for each user
    const notifications = users.map((user) => ({
      userId: user._id,
      type,
      title: `[Super Admin] ${title}`,
      message,
      link: null,
    }));

    // 8. Insert all notifications at once (bulk insert)
    await Notification.insertMany(notifications);

    // 9. Send success response
    res.status(201).json({
      message: "Message broadcasted successfully",
      recipientCount: users.length,
    });
  } catch (error) {
    console.error("Broadcast Error:", error.message);
    res.status(500).json({ message: "Error broadcasting message" });
  }
};
```

**What happens:**

1. Super admin sends title, message, type, and optional department
2. Backend validates the super admin role
3. Finds all active users (or users in specific department)
4. Creates individual notification records for each user
5. Saves all notifications to database
6. Returns success with count of recipients

---

### STEP 3: API Route

**File:** `Backend/routes/notificationRoutes.js`

```javascript
import express from "express";
import { broadcastToAll } from "../controllers/notificationController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Super admin broadcast endpoint
router.post("/broadcast-all", broadcastToAll);

export default router;
```

**Endpoint:** `POST /api/notifications/broadcast-all`

---

### STEP 4: Frontend API Service

**File:** `super-admin-panel/src/services/notificationApi.js`

```javascript
import API from "@/lib/api";

// Broadcast to all users or specific department (super admin only)
export const broadcastToAllApi = (data) =>
  API.post("/notifications/broadcast-all", data);

// Get notifications for current user
export const getNotificationsApi = (limit = 20, skip = 0) =>
  API.get(`/notifications?limit=${limit}&skip=${skip}`);

// Mark notification as read
export const markAsReadApi = (id) => API.put(`/notifications/${id}/read`);
```

**What it does:**

- Wraps API calls with axios
- Automatically adds JWT token from localStorage
- Handles request/response

---

### STEP 5: Frontend Broadcast Component

**File:** `super-admin-panel/src/components/SuperAdminBroadcast.js`

```javascript
export default function SuperAdminBroadcast() {
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    message: "",
    type: "info",
    targetDepartment: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const payload = {
        title: form.title,
        message: form.message,
        type: form.type,
      };

      // Only include department if selected
      if (form.targetDepartment) {
        payload.targetDepartment = form.targetDepartment;
      }

      // Call API
      await broadcastToAllApi(payload);

      // Show success and close
      setSuccess(true);
      setTimeout(() => setIsOpen(false), 2000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send");
    }
  };

  return (
    <button onClick={() => setIsOpen(true)}>Broadcast Message</button>
    // ... modal form
  );
}
```

**User Flow:**

1. Super admin clicks "Broadcast Message" button
2. Modal opens with form
3. Fills in: Target (all/department), Type, Title, Message
4. Clicks "Send Message"
5. API call is made
6. Success message shows
7. Modal closes automatically

---

### STEP 6: Notification Display (Navbar)

**File:** `super-admin-panel/src/components/Navbar.js`

```javascript
export default function Navbar() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch notifications on mount
  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchNotifications();
    }, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const res = await getNotificationsApi(20, 0);
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  return (
    <header>
      {/* Bell icon with badge */}
      <button onClick={() => setShowNotifications(!showNotifications)}>
        <Bell size={20} />
        {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
      </button>

      {/* Notifications dropdown */}
      {showNotifications && (
        <div className="notifications-dropdown">
          {notifications.map((notif) => (
            <div key={notif._id} className={!notif.read ? "unread" : ""}>
              <h4>{notif.title}</h4>
              <p>{notif.message}</p>
              <button onClick={() => markAsRead(notif._id)}>Mark read</button>
            </div>
          ))}
        </div>
      )}
    </header>
  );
}
```

**What happens:**

1. When user logs in, notifications are fetched
2. Unread count shows in badge on bell icon
3. Auto-refreshes every 30 seconds
4. User clicks bell to see dropdown
5. Can mark as read or delete
6. Unread notifications highlighted

---

## 3. Complete Data Flow Example

### Example: Super Admin sends message to HR Department

**Step 1: Super Admin Action**

```
Super Admin Dashboard
  ↓
Clicks "Broadcast Message"
  ↓
Fills form:
  - Target: HR Department
  - Type: Warning
  - Title: "Policy Update"
  - Message: "Please review new HR policy"
  ↓
Clicks "Send Message"
```

**Step 2: Frontend Processing**

```javascript
// API call made
POST /api/notifications/broadcast-all
{
  "title": "Policy Update",
  "message": "Please review new HR policy",
  "type": "warning",
  "targetDepartment": "60d5ec49f1b2c72b8c8e4f1a"
}
```

**Step 3: Backend Processing**

```javascript
// 1. Validate super admin role ✓
// 2. Find all users in HR department
const users = await User.find({
  department: "60d5ec49f1b2c72b8c8e4f1a",
  isActive: true,
});
// Result: 15 users found

// 3. Create 15 notification records
const notifications = [
  {
    userId: "user1_id",
    type: "warning",
    title: "[Super Admin] Policy Update",
    message: "Please review new HR policy",
    read: false,
  },
  {
    userId: "user2_id",
    type: "warning",
    title: "[Super Admin] Policy Update",
    message: "Please review new HR policy",
    read: false,
  },
  // ... 13 more
];

// 4. Save to database
await Notification.insertMany(notifications);

// 5. Return success
return { recipientCount: 15 };
```

**Step 4: Database State**

```
Notifications Collection:
┌──────────────────────────────────────────────────┐
│ _id: "abc123"                                    │
│ userId: "user1_id"                               │
│ type: "warning"                                  │
│ title: "[Super Admin] Policy Update"            │
│ message: "Please review new HR policy"          │
│ read: false                                      │
│ createdAt: 2024-01-15T10:30:00Z                 │
└──────────────────────────────────────────────────┘
... (14 more similar records)
```

**Step 5: User Receives Notification**

```
HR User logs in
  ↓
Navbar fetches notifications
GET /api/notifications?limit=20&skip=0
  ↓
Response:
{
  "notifications": [
    {
      "_id": "abc123",
      "title": "[Super Admin] Policy Update",
      "message": "Please review new HR policy",
      "type": "warning",
      "read": false,
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "unreadCount": 1
}
  ↓
Bell icon shows badge: "1"
  ↓
User clicks bell
  ↓
Sees notification with yellow warning icon
  ↓
Clicks "Mark read"
  ↓
PUT /api/notifications/abc123/read
  ↓
Badge disappears
```

---

## 4. Key Features Explained

### A. Bulk Insert for Performance

```javascript
// BAD: Loop and save one by one (slow)
for (const user of users) {
  await Notification.create({ userId: user._id, ... });
}

// GOOD: Insert all at once (fast)
await Notification.insertMany(notifications);
```

### B. Auto-Refresh Mechanism

```javascript
// Refresh notifications every 30 seconds
useEffect(() => {
  const interval = setInterval(() => {
    fetchNotifications();
  }, 30000); // 30 seconds

  return () => clearInterval(interval); // Cleanup
}, [user]);
```

### C. Optimistic UI Updates

```javascript
// Update UI immediately, then call API
const markAsRead = async (id) => {
  // 1. Update UI first (optimistic)
  setNotifications((prev) =>
    prev.map((notif) => (notif._id === id ? { ...notif, read: true } : notif)),
  );
  setUnreadCount((prev) => prev - 1);

  // 2. Then call API
  try {
    await markAsReadApi(id);
  } catch (error) {
    // 3. Revert if API fails
    fetchNotifications();
  }
};
```

### D. Role-Based Access Control

```javascript
// Backend checks role before allowing broadcast
const userRole = typeof user.role === "object" ? user.role.name : user.role;

if (userRole !== "SUPER_ADMIN") {
  return res.status(403).json({
    message: "Only super admins can broadcast",
  });
}
```

---

## 5. Security Measures

1. **Authentication Required**
   - All routes protected by `authMiddleware`
   - JWT token verified on every request

2. **Role Validation**
   - Super admin role checked before broadcasting
   - Admin role checked for department broadcasts

3. **Department Scoping**
   - Admins can only message their own department
   - Super admins can target any department

4. Input Validation\*\*
   - Title and message required
   - Type must be one of: info/success/warning/alert

5. **Active Users Only**
   - Only sends to users with `isActive: true`
   - Prevents notifications to deleted/inactive accounts

---

## 6. Testing the System

### Test 1: Super Admin Broadcast to All

```bash
# 1. Login as super admin
POST /api/auth/login
{ "email": "superadmin@example.com", "password": "password" }

# 2. Send broadcast
POST /api/notifications/broadcast-all
Headers: { Authorization: "Bearer <token>" }
Body: {
  "title": "System Update",
  "message": "System will be down for maintenance",
  "type": "warning"
}

# 3. Verify response
Response: { "recipientCount": 150 }

# 4. Login as any user and check notifications
GET /api/notifications
Response: { "notifications": [...], "unreadCount": 1 }
```

### Test 2: Super Admin Broadcast to Department

```bash
# Send to specific department
POST /api/notifications/broadcast-all
Body: {
  "title": "HR Update",
  "message": "New policy for HR",
  "type": "info",
  "targetDepartment": "60d5ec49f1b2c72b8c8e4f1a"
}

# Only HR users will receive this notification
```

---

## 7. Troubleshooting

### Issue: Notifications not appearing

**Check:**

1. Is user logged in? (JWT token valid)
2. Is auto-refresh working? (Check console for API calls)
3. Are notifications in database? (Check MongoDB)
4. Is userId correct in notification records?

### Issue: Broadcast fails

**Check:**

1. Is user super admin? (Check role in JWT)
2. Are there active users? (Check User collection)
3. Is targetDepartment valid? (Check Department collection)
4. Check backend logs for errors

### Issue: Unread count wrong

**Check:**

1. Are notifications marked as read correctly?
2. Is optimistic update reverting?
3. Check database `read` field values

---

## 8. Summary

**The system works in 3 main parts:**

1. **Broadcasting (Super Admin → Backend)**
   - Super admin sends message via UI
   - Backend creates notification for each target user
   - Saves to database

2. **Storage (Database)**
   - Each user gets individual notification record
   - Tracks read/unread status
   - Stores timestamp

3. **Display (Backend → Users)**
   - Users' Navbar fetches their notifications
   - Shows unread count in badge
   - Auto-refreshes every 30 seconds
   - Users can mark as read/delete

**Key Benefits:**

- Real-time communication
- Targeted messaging (all users or specific department)
- Persistent notifications (stored in database)
- Read/unread tracking
- Auto-refresh
- Role-based access control
- Scalable (bulk insert)
