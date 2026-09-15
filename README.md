# 🎯 SAIL-MIOM House Management System

A full-stack house management and complaint tracking system built with React, Firebase, and stunning glassmorphism design.

![Tech Stack](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![Firebase](https://img.shields.io/badge/Firebase-Latest-FFCA28?logo=firebase)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![Tailwind](https://img.shields.io/badge/Tailwind-3-38B2AC?logo=tailwind-css)

## ✨ Features

### 🔐 **Dual Authentication System**
- **Admin Portal** - Full system control
- **Moderator Portal** - Limited complaint management
- Firebase Authentication with Email/Password
- Role-based access control (RBAC)
- Persistent sessions

### 📊 **Real-Time Dashboards**
- **Admin Dashboard**
  - View all complaints
  - Assign to moderators
  - Update status
  - Delete complaints
  - Analytics with charts
  - Moderator management

- **Moderator Dashboard**
  - View assigned complaints only
  - Update complaint status
  - Real-time statistics
  - Focused workflow

### 🎨 **Premium Glassmorphism UI**
- Frosted glass effects throughout
- Gradient accents
- Smooth animations with Framer Motion
- Dark theme optimized
- Fully responsive design
- Mobile-friendly navigation

### 📝 **Complaint Management**
- Public complaint submission
- File tracking with ID
- Status updates (pending, active, resolved, rejected)
- Priority levels (low, medium, high)
- Category classification
- Assignment to moderators

### 🔔 **Real-Time Notifications**
- Live notification system
- Unread count badges
- Mark as read functionality
- Automatic triggers:
  - New complaint → Notify admin
  - Assignment → Notify moderator

### 📈 **Analytics & Charts**
- Bar charts for status distribution
- Pie charts for complaint breakdown
- Real-time statistics
- Visual data insights

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- Firebase account
- npm or yarn

### Installation

1. **Clone and Install**
```bash
npm install
```

2. **Firebase Setup**

Create a Firebase project at [https://console.firebase.google.com](https://console.firebase.google.com)

Enable:
- Authentication → Email/Password
- Firestore Database
- (Optional) Hosting

3. **Environment Variables**

Create `.env` file:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

4. **Create Admin User**

In Firebase Console:

**Authentication:**
- Add User
- Email: `admin123@gmail.com`
- Password: `admin123`

**Firestore:**
- Collection: `users`
- Document ID: [User's UID from Authentication]
- Fields:
  ```json
  {
    "email": "admin123@gmail.com",
    "role": "admin",
    "displayName": "Admin",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
  ```

5. **Run Development Server**
```bash
npm run dev
```

Visit `http://localhost:5173`

## 🎯 Usage

### Public Access (No Login)
- **Home** (`/`) - Landing page with features
- **File Complaint** (`/file-complaint`) - Submit new complaint
- **Track Complaint** (`/track-complaint`) - Track with complaint ID

### Admin Access
1. Go to `/login`
2. Login with admin credentials
3. Access `/dashboard`
4. Features:
   - View all complaints
   - Create moderators
   - Assign complaints
   - Update status
   - View analytics
   - Delete complaints

### Moderator Access
1. Go to `/moderator-login`
2. Login with moderator credentials (created by admin)
3. Access `/moderator-dashboard`
4. Features:
   - View assigned complaints
   - Update status
   - Mark as resolved

## 📱 Navigation

### Navbar Structure

**Left:** SAIL-MIOM Logo

**Center:**
- Home
- File Complaint
- Track Complaint

**Right (Not Logged In):**
- Admin Login
- Moderator Login

**Right (Logged In):**
- Dashboard (role-based)
- Notifications 🔔
- Profile Menu
  - User info with role badge
  - Dashboard link
  - Logout

## 🗂️ Project Structure

```
src/
├── components/
│   ├── Navbar.tsx              # Navigation with glassmorphism
│   ├── ProtectedRoute.tsx      # Route protection
│   └── LoadingSpinner.tsx      # Loading component
│
├── pages/
│   ├── Home.tsx                # Landing page
│   ├── Login.tsx               # Admin/Moderator login
│   ├── Dashboard.tsx           # Admin dashboard
│   ├── ModeratorDashboard.tsx  # Moderator dashboard
│   ├── FileComplaint.tsx       # Complaint submission
│   ├── TrackComplaint.tsx      # Complaint tracking
│   └── ModeratorManagement.tsx # Moderator CRUD
│
├── contexts/
│   └── AuthContext.tsx         # Authentication context
│
├── services/
│   ├── firebase.ts             # Firebase configuration
│   ├── auth.service.ts         # Authentication logic
│   └── complaint.service.ts    # Complaint CRUD operations
│
├── App.tsx                     # Main app with routing
├── main.tsx                    # Entry point
└── index.css                   # Tailwind + custom styles
```

## 🔒 Security

### Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isAdmin() {
      return isAuthenticated() && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    function isModerator() {
      return isAuthenticated() && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'moderator';
    }
    
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isAdmin();
    }
    
    match /complaints/{complaintId} {
      allow read: if isAuthenticated();
      allow create: if true;
      allow update: if isAdmin() || isModerator();
      allow delete: if isAdmin();
    }
    
    match /notifications/{notificationId} {
      allow read: if isAuthenticated() && 
                     resource.data.userEmail == request.auth.token.email;
      allow create: if isAuthenticated();
      allow update: if isAuthenticated() && 
                       resource.data.userEmail == request.auth.token.email;
      allow delete: if isAdmin();
    }
  }
}
```

## 🎨 Design System

### Colors
- **Primary**: Blue gradient (#85ADFF)
- **Secondary**: Purple gradient (#AC8AFF)
- **Success**: Green (#4ADE80)
- **Warning**: Yellow (#FACC15)
- **Error**: Red (#F87171)

### Typography
- **Headline**: Plus Jakarta Sans
- **Body**: Inter
- **Code**: Monaco, Courier

### Components
- Glass cards with blur effect
- Gradient buttons with glow
- Animated dropdowns
- Smooth transitions
- Hover effects
- Scale animations

## 📊 Data Models

### User (Firestore)
```typescript
{
  email: string;
  role: 'admin' | 'moderator';
  displayName?: string;
  createdAt: string;
}
```

### Complaint (Firestore)
```typescript
{
  title: string;
  description: string;
  status: 'pending' | 'active' | 'resolved' | 'rejected';
  priority: 'low' | 'medium' | 'high';
  category: string;
  assignedTo?: string;
  createdAt: string;
  updatedAt?: string;
}
```

### Notification (Firestore)
```typescript
{
  message: string;
  type: string;
  userEmail: string;
  read: boolean;
  createdAt: string;
}
```

## 🧪 Testing

### Manual Testing Checklist
- [ ] Admin login works
- [ ] Moderator login works
- [ ] Dashboard redirects correctly
- [ ] File complaint works
- [ ] Track complaint works
- [ ] Notifications appear
- [ ] Charts render
- [ ] Mobile responsive
- [ ] Logout works
- [ ] Real-time updates work

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

### Deploy to Firebase Hosting
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

### Deploy to Vercel/Netlify
- Connect GitHub repository
- Set environment variables
- Deploy automatically on push

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| React 18 | UI Framework |
| TypeScript | Type Safety |
| Vite | Build Tool |
| Tailwind CSS | Styling |
| Framer Motion | Animations |
| Recharts | Data Visualization |
| Firebase Auth | Authentication |
| Firestore | Database |
| React Router | Routing |

## 📝 Key Files

- `SETUP_GUIDE.md` - Complete setup instructions
- `AUTHENTICATION_FIXES.md` - All authentication improvements
- `GLASSMORPHISM_DESIGN.md` - Design documentation
- `firebase-setup.md` - Firebase configuration guide

## 🐛 Troubleshooting

### Login Issues
- Verify admin user exists in Firebase Auth
- Check user role in Firestore
- Verify environment variables
- Check browser console for errors

### Real-Time Updates Not Working
- Check Firestore security rules
- Verify Firebase connection
- Check network tab in DevTools

### Charts Not Rendering
- Ensure Recharts is installed
- Check data is being fetched
- Verify responsive container parent

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License.

## 👥 Authors

- Your Name - Initial work

## 🙏 Acknowledgments

- Firebase for backend infrastructure
- Tailwind CSS for styling system
- Framer Motion for animations
- Recharts for data visualization

## 📞 Support

For issues and questions:
- Check the setup guides
- Review troubleshooting section
- Check Firebase Console for errors
- Review browser console logs

---

**Built with ❤️ using React + Firebase + Glassmorphism**

🌟 Star this repo if you find it helpful!
