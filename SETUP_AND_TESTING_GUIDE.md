# 🚀 VibgyorNode v2.0 - Setup & Testing Guide

## 📋 Overview
VibgyorNode v2.0 is a fully enhanced chat and calling platform with modern UI, real-time features, and WebRTC support. This guide will help you set up and test the application.

## 🔧 Setup Instructions

### 1. **Backend Setup**
```bash
# Navigate to project root
cd vibgyorNode

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your MongoDB URI and other settings

# Seed the database with test data
node scriptFiles/seed.js --clear=true --users=5 --chats=10 --messages=20 --calls=5

# Start the server
npm start
```

### 2. **Frontend Setup**
```bash
# Navigate to frontend directory
cd vibgyor-frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

## 🔑 Test Credentials

### **Primary Test Numbers:**
1. **+91-7776665555** (OTP: 123456) - Regular User
2. **+91-8887776666** (OTP: 123456) - Regular User

### **Admin Test Numbers:**
3. **+91-9998887777** (OTP: 123456) - Super Admin
4. **+91-7776665555** (OTP: 123456) - Sub Admin

## 🎯 Testing Features

### **1. Authentication**
- Login with phone number and OTP
- JWT token-based authentication
- Automatic token refresh

### **2. Chat Features**
- **Real-time messaging** with Socket.IO
- **Message types**: Text, images, videos, audio, documents
- **Message reactions** with emojis
- **Message editing** and deletion
- **Message forwarding**
- **Typing indicators**
- **Read receipts**
- **Message search**

### **3. Call Features**
- **Audio calls** with WebRTC
- **Video calls** with WebRTC
- **Screen sharing** (video calls)
- **Call history** tracking
- **Call quality** monitoring
- **Call recording** (optional)
- **Incoming call notifications**

### **4. UI Features**
- **Modern, classy design** with glass morphism
- **Dark/Light mode** support
- **Responsive design** for all devices
- **Smooth animations** and transitions
- **Loading states** and error handling
- **Professional call interface**

## 🌐 API Endpoints

### **Enhanced API (v2.0)**
- **Base URL**: `http://192.168.1.54:3000/api/v1`
- **Chats**: `GET/POST /api/v1/user/chats`
- **Messages**: `GET/POST /api/v1/user/messages`
- **Calls**: `GET/POST /api/v1/user/calls`
- **WebSocket**: `ws://localhost:3000`

### **Legacy API (v1.0)**
- **Base URL**: `http://192.168.1.54:3000/user`
- **Auth**: `/user/auth`
- **Chats**: `/user/chats`
- **Messages**: `/user/messages`
- **Calls**: `/user/calls`

## 🧪 Testing Scenarios

### **Scenario 1: Basic Chat**
1. Login with **+91-7776665555** (OTP: 123456)
2. Login with **+91-8887776666** (OTP: 123456) in another browser/device
3. Start a chat between the two users
4. Send text messages, images, and other media
5. Test message reactions and editing

### **Scenario 2: Audio Call**
1. Both users logged in
2. User 1 initiates audio call to User 2
3. User 2 receives incoming call notification
4. User 2 accepts the call
5. Test audio quality and call controls
6. End the call and check call history

### **Scenario 3: Video Call**
1. Both users logged in
2. User 1 initiates video call to User 2
3. User 2 accepts the video call
4. Test video quality, screen sharing
5. Test call controls (mute, camera toggle)
6. End the call

### **Scenario 4: Real-time Features**
1. Test typing indicators
2. Test online/offline status
3. Test message delivery and read receipts
4. Test real-time message updates

## 🔍 Troubleshooting

### **Common Issues:**

1. **Database Connection Error**
   - Check MongoDB URI in `.env`
   - Ensure MongoDB is running
   - Run seed script to populate data

2. **WebSocket Connection Issues**
   - Check CORS settings
   - Verify Socket.IO configuration
   - Check browser console for errors

3. **Call Issues**
   - Ensure HTTPS in production
   - Check WebRTC permissions
   - Verify STUN/TURN server configuration

4. **Authentication Issues**
   - Check JWT token expiration
   - Verify phone number format
   - Check OTP generation

## 📊 Performance Features

### **Backend Optimizations:**
- **Response compression** with gzip
- **Rate limiting** for API protection
- **Response time logging**
- **Memory management**
- **Database indexing**

### **Frontend Optimizations:**
- **Component memoization**
- **Lazy loading**
- **Virtual scrolling** for large lists
- **Debounced search**
- **Efficient re-rendering**

## 🎨 UI/UX Features

### **Design System:**
- **Modern color palette** with primary, secondary, accent colors
- **Typography** with Inter font family
- **Spacing** and layout consistency
- **Shadow system** (soft, medium, large, glow)
- **Animation system** (fade, slide, bounce)

### **Components:**
- **Enhanced Button** with multiple variants
- **Loading Spinner** with different styles
- **Chat List** with modern cards
- **Message Bubbles** with gradients
- **Call Interface** with professional design

## 🚀 Production Deployment

### **Environment Variables:**
```env
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb://localhost:27017/vibgyorNode
JWT_SECRET=your-secret-key
CORS_ORIGIN=https://yourdomain.com
```

### **Security Features:**
- **Helmet.js** for security headers
- **CORS** configuration
- **Rate limiting**
- **Input validation**
- **SQL injection protection**

## 📱 Mobile Support

- **Responsive design** for all screen sizes
- **Touch-friendly** interface
- **Mobile-optimized** call interface
- **Safe area** support for iOS
- **Progressive Web App** ready

## 🔄 Real-time Features

### **Socket.IO Events:**
- `chat:message` - Send message
- `chat:typing` - Typing indicator
- `chat:read` - Read receipt
- `call:initiate` - Start call
- `call:accept` - Accept call
- `call:reject` - Reject call
- `call:end` - End call
- `call:signaling` - WebRTC signaling

## 📈 Monitoring & Analytics

- **Health check** endpoint: `/health`
- **API info** endpoint: `/api/v1/info`
- **Response time** logging
- **Error tracking**
- **Performance metrics**

## 🎉 Success Indicators

When everything is working correctly, you should see:
- ✅ Server starts with enhanced logging
- ✅ Database connects successfully
- ✅ WebSocket connection established
- ✅ Modern UI loads with smooth animations
- ✅ Real-time messaging works
- ✅ Audio/Video calls function properly
- ✅ All features respond quickly

## 📞 Support

For issues or questions:
1. Check the console logs for errors
2. Verify all environment variables
3. Ensure all dependencies are installed
4. Check network connectivity
5. Review the API documentation

---

**Happy Testing! 🚀**

The VibgyorNode v2.0 platform is now ready for comprehensive testing with all enhanced features!
