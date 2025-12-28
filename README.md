# Top Quotes

A voting website similar to Naval 25, where users can vote for their favorite quotes. Quotes are stored in a JSON database and votes start at zero.

## Features

- **Ranked View**: See all quotes ranked by vote count
- **Quiz Mode**: Pick your favorite between 2 random quotes
- **Search Mode**: Search through quotes and vote
- **Vote Tracking**: 5 votes per session (stored in localStorage)
- **Real-time Updates**: Vote counts update immediately

## Setup

### Using Make Commands (Easiest)

```bash
# Start the application
make start

# Stop the application
make stop

# View logs
make logs

# See all available commands
make help
```

### Using Docker Compose (Alternative)

1. Build and run with Docker Compose:

```bash
docker-compose up --build
```

Or using Docker directly:

```bash
docker build -t topquotes .
docker run -p 3671:3671 -v $(pwd)/quotes.json:/app/quotes.json topquotes
```

2. Open your browser and navigate to:

```
http://localhost:3671
```

### Local Setup (Alternative)

1. Install dependencies:

```bash
npm install
```

2. Start the server:

```bash
npm start
```

3. Open your browser and navigate to:

```
http://localhost:3671
```

## Project Structure

```
topquotes/
├── Makefile             # Make commands for easy management
├── Dockerfile           # Docker configuration
├── docker-compose.yml   # Docker Compose configuration
├── quotes.json.example  # Template with initial quotes (committed to git)
├── quotes.json          # JSON database with quotes and votes (gitignored)
├── server.js            # Express backend server
├── package.json         # Node.js dependencies
└── public/              # Frontend files
    ├── index.html       # Main HTML file
    ├── styles.css       # Styling
    └── app.js           # Frontend JavaScript
```

## API Endpoints

- `GET /api/quotes` - Get all quotes sorted by votes
- `GET /api/quotes/quiz` - Get 2 random quotes for quiz
- `GET /api/quotes/search?q=query` - Search quotes
- `POST /api/quotes/:id/vote` - Vote for a quote

## Database Setup

The application uses `quotes.json` as a JSON database. This file is **gitignored** because it changes with votes and shouldn't be version controlled.

- **`quotes.json.example`**: Template file with initial quotes (committed to git)
- **`quotes.json`**: Actual database file (gitignored, auto-created from example on first run)

The server automatically initializes `quotes.json` from `quotes.json.example` if it doesn't exist.

### Docker Volume Persistence

When using Docker Compose, votes are persisted in a named volume (`quotes-data`). This means:

- Votes persist across container restarts
- The database is stored in Docker's volume system
- To access the file directly, you can use: `docker exec <container> cat /app/data/quotes.json`

For local development with direct file access, modify `docker-compose.yml` to use a bind mount:

```yaml
volumes:
  - ./quotes.json:/app/quotes.json
```

## Adding Quotes

Edit `quotes.json.example` to add new quotes (for new installations), or edit `quotes.json` directly (for existing installations). Each quote should have:

- `id`: Unique identifier
- `text`: The quote text
- `votes`: Vote count (starts at 0)

## Technologies

- Node.js & Express (backend)
- Vanilla JavaScript (frontend)
- JSON file storage (database)
- Docker (containerization)
