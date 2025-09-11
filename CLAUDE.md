# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Frontend Commands
- **Development server**: `npm run dev` - Starts Vite dev server with hot reload
- **Build**: `npm run build` - Compiles TypeScript and builds production assets
- **Lint**: `npm run lint` - Runs ESLint on the codebase
- **Preview**: `npm run preview` - Preview production build locally

### Backend Commands (from /backend directory)
- **Development server**: `npm run dev` - Starts Node.js backend with hot reload
- **Production server**: `npm start` - Starts production backend server
- **Build**: `npm run build` - Compiles TypeScript backend
- **Database migrations**: `npm run migrate` - Run database migrations
- **Database rollback**: `npm run rollback` - Rollback last migration

### Docker Development Environment (PREFERRED)
- **Start full stack**: `docker-compose up -d` - Start all services (frontend, backend, database, redis)
- **View logs**: `docker-compose logs -f [service]` - View logs for specific service
- **Check status**: `docker-compose ps` - View all running services
- **Stop services**: `docker-compose down` - Stop all services
- **Restart service**: `docker-compose restart [service]` - Restart specific service

## Project Architecture

### Tech Stack
- **Frontend**: React 19 with TypeScript
- **Backend**: Node.js with TypeScript and Express.js
- **Database**: PostgreSQL with Redis for caching
- **Authentication**: JWT tokens with bcrypt password hashing
- **API Integration**: BoardGameGeek API for game ratings
- **Routing**: React Router DOM v7
- **Styling**: Tailwind CSS with custom game-themed design system
- **Build Tool**: Vite with React plugin
- **Containerization**: Docker with docker-compose
- **Package Manager**: npm

### Application Structure
PlayShelf is a board game collection tracking and review application with the following architecture:

```
Frontend (src/)
├── components/
│   ├── layout/     # Navbar, Footer, Layout wrapper
│   ├── common/     # Reusable components (DiceIcon, etc.)
│   ├── games/      # Game-specific components (GameCard, ReviewForm, etc.)
│   ├── auth/       # Authentication components
│   └── admin/      # Admin interface components
├── pages/
│   ├── auth/       # Login, Signup pages
│   ├── dashboard/  # User dashboard
│   ├── games/      # Game listing and detail pages
│   ├── admin/      # Admin pages
│   └── HomePage.tsx
├── hooks/          # Custom React hooks
├── services/       # API and data services
├── types/          # TypeScript type definitions
└── utils/          # Utility functions

Backend (backend/)
├── src/
│   ├── auth/       # Authentication services (JWT, password management)
│   ├── services/   # Business logic (games, collections, reviews, BGG integration)
│   ├── routes/     # API endpoints (auth, games, collections, reviews, activities)
│   ├── middleware/ # Authentication, validation, rate limiting
│   ├── config/     # Database and environment configuration
│   └── migrations/ # Database schema migrations
├── docker-compose.yml  # Development environment (PostgreSQL, Redis)
└── Dockerfile      # Production container configuration
```

### Design System
The app uses a playful, game-themed design with:
- **Color palette**: Custom primary/accent colors, game-themed colors (red, blue, green, etc.)
- **Typography**: Fredoka font family for headings and playful elements
- **Animations**: Custom keyframes for wiggle, roll, float, bounce effects
- **Components**: Heavily styled with Tailwind utilities and custom game-themed shadows/gradients

### Routing Structure
- `/` - Home page with stats and featured games
- `/games` - Game collection listing
- `/games/:id` - Individual game details
- `/dashboard/*` - User dashboard and profile
- `/admin/*` - Admin interface
- `/auth/login` - Login page (outside main layout)
- `/auth/signup` - Signup page (outside main layout)

### Key Components
- **Layout**: Main app wrapper with gradient background and game pattern overlay
- **GameCard**: Displays game information with ratings, player count, play time
- **DiceIcon**: Custom animated dice component for visual flair
- **Navbar**: Main navigation with game-themed styling

### Backend API Structure
The backend provides a complete REST API with the following endpoints:

**Authentication** (`/api/v1/auth`):
- User registration, login, logout, password reset
- JWT token management with refresh tokens
- Session management across devices

**Games** (`/api/v1/games`):
- Full CRUD operations for games (admin only)
- Search and filtering with pagination
- BoardGameGeek integration for rating import
- Game metadata management (categories, mechanisms, publishers, designers)

**Collections** (`/api/v1/collections`):
- Personal collection management (owned, wishlist, played, trading)
- Collection statistics and analytics
- Public/private collection settings

**Reviews** (`/api/v1/reviews`):
- Game reviews and ratings system
- Review moderation capabilities
- Helpful vote tracking

**Activities** (`/api/v1/activities`):
- User activity feeds and social features
- Activity statistics and analytics

### Development Notes
- **Frontend**: ESLint with TypeScript, React Hooks, and React Refresh plugins
- **Backend**: Complete TypeScript implementation with strict typing
- **Database**: PostgreSQL with comprehensive schema and migrations
- **Security**: JWT authentication, bcrypt password hashing, rate limiting
- **API Integration**: Minimal BGG integration (ratings only) with external links
- **Containerization**: Docker development environment with PostgreSQL and Redis
- **Testing**: Backend ready for comprehensive testing with proper error handling

### Development Environment Status
**✅ FULLY OPERATIONAL & PRODUCTION READY**: Complete full-stack development environment with authentication:
- **Frontend**: React 19 app at http://localhost:5173 with complete authentication integration
- **Backend**: Node.js API at http://localhost:3001 with fast authentication (optimized for development)
- **Database**: PostgreSQL with Redis caching, all migrations applied and tested
- **Docker**: Full containerized environment with docker-compose
- **Authentication**: Complete JWT authentication system with frontend integration
- **Performance**: Optimized for development (4 bcrypt rounds, relaxed rate limits)

**✅ AUTHENTICATION SYSTEM COMPLETE**: 
- **Frontend Integration**: Complete React authentication with login/signup/logout flows
- **JWT Token Management**: Automatic refresh, secure storage, cross-tab synchronization
- **Protected Routes**: Dashboard and admin routes with proper authentication guards
- **User Interface**: Fixed navigation (no bouncing), immediate logout, professional UX
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Rate Limiting**: Development-optimized (20+ attempts) for effective testing
- **Performance**: Lightning-fast authentication (< 1 second) with 4 bcrypt rounds
- **Security**: Production-ready patterns with development optimizations

**✅ BACKEND IMPLEMENTATION COMPLETE**: 
- Authentication system with JWT tokens and user management
- Game and collection management APIs with full CRUD operations  
- Review system with ratings, moderation, and activity feeds
- BoardGameGeek API integration for game rating imports
- Complete REST API with proper error handling and validation
- Production-ready architecture with development optimizations

**🚀 DEVELOPMENT WORKFLOW**:
- Use `docker-compose up -d` to start all services
- **Frontend**: Edit code in `src/` - changes auto-reload with authentication working
- **Backend**: Edit code in `backend/src/` - optimized for fast development
- **Database**: `cd backend && npm run migrate` for schema changes
- **Testing**: Register/login works instantly, no rate limiting during development
- **Access**: Frontend at :5173, API at :3001, Health check at :3001/health

**🎮 AUTHENTICATION FEATURES**:
- **Registration**: Instant account creation with validation
- **Login**: Immediate authentication with dashboard redirect  
- **Logout**: Single-click immediate logout (no confirmation required)
- **Navigation**: Fixed bouncing menu, fully clickable links
- **Token Management**: Automatic JWT refresh, secure cross-tab sync
- **Protected Routes**: `/dashboard/*` and `/admin/*` properly secured
- **Error Handling**: User-friendly messages for all error scenarios

**❌ DEVCONTAINERS NOT WORKING**: Stick with docker-compose due to permission issues