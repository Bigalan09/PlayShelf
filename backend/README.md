# PlayShelf Backend

A robust, TypeScript-based backend API for the PlayShelf board game collection tracking application.

## Features

- **TypeScript**: Full TypeScript support with strict type checking
- **Express.js**: Fast, unopinionated web framework with middleware stack
- **PostgreSQL**: Robust relational database with proper schema migrations
- **Redis**: Caching and session management (ready for implementation)
- **Docker**: Containerized development environment
- **Authentication**: JWT-based authentication system (ready for implementation)
- **Validation**: Request validation using Zod schemas
- **Error Handling**: Comprehensive error handling and logging
- **Rate Limiting**: Configurable rate limiting for API protection
- **Health Checks**: Multiple health check endpoints for monitoring
- **Testing**: Vitest testing framework with supertest integration

## Quick Start

### Prerequisites

- Node.js 18+ and npm 8+
- Docker and Docker Compose
- Git

### Development Setup

1. **Clone and navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development environment**:
   ```bash
   # Start PostgreSQL and Redis containers
   npm run docker:up
   
   # Wait for containers to be ready, then run migrations
   npm run migrate
   
   # Start the development server with hot reload
   npm run dev
   ```

4. **Verify the setup**:
   - API: http://localhost:3001
   - Health Check: http://localhost:3001/health
   - Detailed Health: http://localhost:3001/health/detailed

### Available Scripts

#### Development
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server

#### Database
- `npm run migrate` - Run database migrations
- `npm run migrate:rollback` - Rollback last migration
- `npm run seed` - Seed database with sample data (TODO)

#### Testing
- `npm test` - Run test suite
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report

#### Code Quality
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues automatically
- `npm run format` - Format code with Prettier

#### Docker
- `npm run docker:up` - Start PostgreSQL and Redis containers
- `npm run docker:down` - Stop and remove containers
- `npm run docker:logs` - View container logs

## Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration and database setup
│   ├── controllers/     # Route controllers (TODO)
│   ├── middleware/      # Express middleware (auth, validation, etc.)
│   ├── migrations/      # Database migration files
│   ├── models/          # Data models and repository patterns (TODO)
│   ├── routes/          # API route definitions
│   ├── scripts/         # Utility scripts (migration runner, etc.)
│   ├── services/        # Business logic services (TODO)
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Utility functions and helpers
│   ├── app.ts           # Express application setup
│   └── server.ts        # Server entry point
├── tests/               # Test files
├── scripts/             # Build and deployment scripts
├── docker-compose.yml   # Development environment containers
├── Dockerfile.dev       # Development Docker image
└── package.json         # Dependencies and scripts
```

## API Endpoints

### Health & Status
- `GET /ping` - Quick liveness check
- `GET /health` - Basic health status
- `GET /health/detailed` - Detailed system information
- `GET /health/ready` - Readiness probe (for Kubernetes)
- `GET /health/live` - Liveness probe (for Kubernetes)

### API Info
- `GET /` - API information and available endpoints
- `GET /api/v1` - Version 1 API information

### Coming Soon
- `POST /api/v1/auth/login` - User authentication
- `POST /api/v1/auth/register` - User registration
- `GET /api/v1/games` - List games
- `POST /api/v1/games` - Create game
- `GET /api/v1/collections` - User collections
- `POST /api/v1/reviews` - Create review

## Database Schema

The database uses PostgreSQL with a comprehensive schema for board game collection tracking:

### Core Tables
- **users** - User accounts and profiles
- **games** - Board game information
- **collection_entries** - User game collections
- **reviews** - Game reviews and ratings
- **game_sessions** - Play session tracking

### Metadata Tables
- **categories** - Game categories
- **mechanisms** - Game mechanisms
- **publishers** - Game publishers
- **designers** - Game designers

### Relationship Tables
- **game_categories** - Many-to-many: games ↔ categories
- **game_mechanisms** - Many-to-many: games ↔ mechanisms
- **game_publishers** - Many-to-many: games ↔ publishers
- **game_designers** - Many-to-many: games ↔ designers

### Social Features
- **friendships** - User connections
- **activities** - Activity feed tracking

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Server
NODE_ENV=development
PORT=3001

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/playshelf_dev

# Security
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# CORS
CORS_ORIGIN=http://localhost:5173
```

## Development Guidelines

### Code Style
- Use TypeScript strictly with full type safety
- Follow ESLint and Prettier configurations
- Use meaningful variable and function names
- Add JSDoc comments for public APIs

### Error Handling
- Use custom error classes for different error types
- Always use async/await with proper try-catch blocks
- Log errors with appropriate detail levels
- Return consistent error response formats

### Database
- Use parameterized queries to prevent SQL injection
- Follow the migration system for schema changes
- Use transactions for multi-step operations
- Index frequently queried columns

### Testing
- Write unit tests for business logic
- Use integration tests for API endpoints
- Mock external dependencies
- Aim for high test coverage

## Docker Development

The project includes a complete Docker development environment:

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f backend

# Access database
docker-compose exec postgres psql -U playshelf_user -d playshelf_dev

# Access Redis
docker-compose exec redis redis-cli
```

## Production Deployment

### Build for Production
```bash
npm run build
npm start
```

### Environment Setup
- Set `NODE_ENV=production`
- Use secure JWT secrets
- Configure proper CORS origins
- Set up SSL/TLS termination
- Configure proper logging levels

### Health Monitoring
The application provides multiple health check endpoints suitable for:
- Load balancer health checks
- Kubernetes liveness/readiness probes  
- Application monitoring systems
- Uptime monitoring services

## Contributing

1. Follow the existing code style and patterns
2. Add tests for new functionality
3. Update documentation for API changes
4. Use conventional commit messages
5. Ensure all tests pass before submitting

## License

MIT License - see LICENSE file for details.