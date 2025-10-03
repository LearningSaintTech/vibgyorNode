# 🚀 Vibgyor Enhanced Communication Platform

A comprehensive, production-ready communication platform with advanced audio/video calling, real-time messaging, and WebRTC capabilities built with Node.js, React, and modern web technologies.

## ✨ Features

### 🔐 Authentication & Security
- **JWT-based Authentication** with refresh tokens
- **Phone & Email OTP** verification
- **Rate limiting** and security headers
- **Input validation** and sanitization
- **CORS** protection

### 💬 Advanced Messaging
- **Real-time messaging** with Socket.IO
- **Message types**: Text, audio, video, images, documents
- **Message reactions** and emoji support
- **Message editing** and deletion
- **Message forwarding** between chats
- **Typing indicators** and read receipts
- **Message search** and media gallery
- **Offline message** queuing

### 📞 High-Quality Calling
- **Audio & Video calls** with WebRTC
- **Screen sharing** capability
- **Call quality monitoring** and adaptation
- **Connection state management**
- **Call history** and statistics
- **Call recording** (optional)
- **Multi-device** support

### 🔔 Real-time Features
- **Live presence** indicators
- **Push notifications**
- **Real-time updates** across devices
- **Auto-reconnection** handling
- **Connection quality** monitoring

### 📱 Modern UI/UX
- **Responsive design** for all devices
- **Dark/Light themes**
- **Smooth animations** and transitions
- **Accessibility** features
- **Progressive Web App** support

## 🏗️ Architecture

### Backend Structure
```
src/
├── user/
│   ├── userModel/           # Database models with validation
│   │   ├── chatModel.js     # Chat schema with user settings
│   │   ├── messageModel.js  # Message schema with reactions
│   │   └── callModel.js     # Call schema with WebRTC data
│   ├── userController/      # Enhanced controllers
│   │   ├── enhancedChatController.js
│   │   ├── enhancedMessageController.js
│   │   └── enhancedCallController.js
│   ├── userRoutes/          # RESTful API routes
│   │   ├── enhancedChatRoutes.js
│   │   ├── enhancedMessageRoutes.js
│   │   └── enhancedCallRoutes.js
│   └── services/            # Business logic services
│       ├── chatService.js
│       ├── messageService.js
│       └── callService.js
├── services/
│   └── enhancedRealtimeService.js  # Socket.IO real-time service
├── middleware/
│   ├── authMiddleware.js
│   ├── validationMiddleware.js
│   └── performanceMiddleware.js
└── utils/
    └── apiResponse.js
```

### Frontend Structure
```
vibgyor-frontend/src/
├── components/
│   ├── Chat/
│   │   ├── EnhancedChatList.jsx
│   │   └── EnhancedMessageList.jsx
│   ├── Call/
│   │   ├── EnhancedAudioCall.jsx
│   │   └── EnhancedVideoCall.jsx
│   └── UI/
│       ├── Button.jsx
│       ├── Input.jsx
│       └── LoadingSpinner.jsx
├── services/
│   ├── enhancedApiService.js
│   ├── enhancedChatService.js
│   ├── enhancedMessageService.js
│   ├── enhancedCallService.js
│   └── enhancedSocketService.js
├── pages/
│   └── EnhancedChatPage.jsx
├── utils/
│   └── performanceUtils.js
└── contexts/
    └── AuthContext.jsx
```

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ 
- MongoDB 4.4+
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd vibgyorNode
```

2. **Install backend dependencies**
```bash
npm install
```

3. **Install frontend dependencies**
```bash
cd vibgyor-frontend
npm install
```

4. **Environment Configuration**
Create `.env` files:

**Backend `.env`:**
```env
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/vibgyor
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-refresh-secret
CORS_ORIGIN=http://localhost:5173
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=your-aws-region
AWS_S3_BUCKET=your-s3-bucket
```

**Frontend `.env`:**
```env
VITE_API_URL=http://192.168.1.54:3000
VITE_APP_NAME=Vibgyor
VITE_APP_VERSION=1.0.0
```

5. **Database Setup**
```bash
# Start MongoDB
mongod

# Run database migrations (if any)
npm run migrate
```

6. **Start the application**

**Backend:**
```bash
npm run dev
```

**Frontend:**
```bash
cd vibgyor-frontend
npm run dev
```

## 📚 API Documentation

### Authentication Endpoints
- `POST /user/auth/register` - User registration
- `POST /user/auth/login` - User login
- `POST /user/auth/refresh` - Refresh token
- `POST /user/auth/logout` - User logout

### Chat Endpoints
- `GET /user/chats` - Get user chats
- `POST /user/chats` - Create/get chat
- `GET /user/chats/:id` - Get chat details
- `PUT /user/chats/:id/settings` - Update chat settings
- `DELETE /user/chats/:id` - Delete chat

### Message Endpoints
- `POST /user/messages` - Send message
- `GET /user/messages/chat/:chatId` - Get chat messages
- `PUT /user/messages/:id` - Edit message
- `DELETE /user/messages/:id` - Delete message
- `POST /user/messages/:id/reactions` - Add reaction

### Call Endpoints
- `POST /user/calls` - Initiate call
- `POST /user/calls/:id/accept` - Accept call
- `POST /user/calls/:id/reject` - Reject call
- `POST /user/calls/:id/end` - End call
- `GET /user/calls/:id/status` - Get call status
- `POST /user/calls/:id/signaling` - WebRTC signaling

## 🔧 Configuration

### WebRTC Configuration
```javascript
const rtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ],
  iceCandidatePoolSize: 10
};
```

### Socket.IO Configuration
```javascript
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN,
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});
```

## 🎯 Performance Optimizations

### Backend Optimizations
- **Database indexing** for optimal queries
- **Connection pooling** for MongoDB
- **Rate limiting** to prevent abuse
- **Compression** middleware
- **Memory monitoring** and cleanup
- **Query optimization** with pagination

### Frontend Optimizations
- **Code splitting** with React.lazy
- **Virtual scrolling** for large lists
- **Image lazy loading** and optimization
- **Debouncing** and throttling
- **Memory management** with cleanup
- **Network optimization** based on connection

## 🧪 Testing

### Backend Testing
```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration

# Coverage report
npm run test:coverage
```

### Frontend Testing
```bash
cd vibgyor-frontend

# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Coverage report
npm run test:coverage
```

## 📊 Monitoring & Analytics

### Performance Monitoring
- **Response time** tracking
- **Memory usage** monitoring
- **Database query** performance
- **WebRTC connection** quality
- **Error tracking** and logging

### Health Checks
- `GET /health` - Application health status
- `GET /metrics` - Performance metrics
- `GET /status` - Service status

## 🔒 Security Features

### Data Protection
- **Input validation** and sanitization
- **SQL injection** prevention
- **XSS protection** with CSP headers
- **CSRF protection**
- **Rate limiting** for API endpoints

### Authentication Security
- **JWT tokens** with expiration
- **Refresh token** rotation
- **Password hashing** with bcrypt
- **OTP verification** for sensitive operations

## 🚀 Deployment

### Production Build
```bash
# Backend
npm run build

# Frontend
cd vibgyor-frontend
npm run build
```

### Docker Deployment
```bash
# Build images
docker-compose build

# Start services
docker-compose up -d
```

### Environment Variables for Production
```env
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb://production-mongo:27017/vibgyor
JWT_SECRET=production-jwt-secret
CORS_ORIGIN=https://yourdomain.com
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new features
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the API endpoints

## 🔄 Version History

### v1.0.0 (Current)
- ✅ Complete chat functionality
- ✅ Audio/Video calling with WebRTC
- ✅ Real-time messaging
- ✅ File sharing and media support
- ✅ Advanced UI/UX
- ✅ Performance optimizations
- ✅ Security enhancements
- ✅ Comprehensive error handling

---

**Built with ❤️ using Node.js, React, MongoDB, Socket.IO, and WebRTC**
