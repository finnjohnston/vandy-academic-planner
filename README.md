# Vandy Academic Planner

## Starting Development

### 1. Start the Database
```bash
cd docker
docker-compose up -d
```

### 2. Start the Backend
```bash
cd backend
npm run dev
```

### 3. Start the Frontend
```bash
cd frontend
npm run dev
```

### First Time Setup
If this is your first time setting up the project, you'll also need to:

```bash
# Install backend dependencies
cd backend
npm install

# Generate Prisma client and run migrations
npm run prisma:generate
npm run prisma:migrate

# Install frontend dependencies
cd ../frontend
npm install
```

## Stopping Development

### 1. Stop the Frontend
Press `Ctrl+C` in the terminal running the frontend dev server

### 2. Stop the Backend
Press `Ctrl+C` in the terminal running the backend dev server

### 3. Stop the Database
```bash
cd docker
docker-compose down
```

To stop the database and remove all data:
```bash
cd docker
docker-compose down -v
```
