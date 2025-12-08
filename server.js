const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const MAX_VOTES_PER_SESSION = 5;
const QUOTES_FILE =
  process.env.QUOTES_FILE || path.join(__dirname, 'quotes.json');
const QUOTES_EXAMPLE = path.join(__dirname, 'quotes.json.example');

// Configure CORS to allow credentials (cookies)
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json());
app.use(express.static('public'));

// Session configuration
app.use(
  session({
    secret:
      process.env.SESSION_SECRET || 'topquotes-secret-key-change-in-production',
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: false, // Set to true if using HTTPS
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Rate limiting for voting - allows 20 votes per minute (generous for normal use)
const voteLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 votes per minute - allows normal clicking but prevents spam
  message: { error: 'Too many votes, please slow down' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Initialize quotes.json from example if it doesn't exist
async function initializeQuotesFile() {
  try {
    await fs.access(QUOTES_FILE);
    // File exists, nothing to do
  } catch (error) {
    // File doesn't exist, copy from example
    try {
      // Ensure directory exists
      const quotesDir = path.dirname(QUOTES_FILE);
      await fs.mkdir(quotesDir, { recursive: true });

      const exampleData = await fs.readFile(QUOTES_EXAMPLE, 'utf8');
      await fs.writeFile(QUOTES_FILE, exampleData);
      console.log(`Initialized ${QUOTES_FILE} from quotes.json.example`);
    } catch (initError) {
      console.error('Error initializing quotes.json:', initError);
    }
  }
}

// Helper function to read quotes
async function readQuotes() {
  try {
    const data = await fs.readFile(QUOTES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading quotes:', error);
    return [];
  }
}

// Helper function to write quotes
async function writeQuotes(quotes) {
  try {
    await fs.writeFile(QUOTES_FILE, JSON.stringify(quotes, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing quotes:', error);
    return false;
  }
}

// Get all quotes, sorted by votes (descending)
app.get('/api/quotes', async (req, res) => {
  try {
    const quotes = await readQuotes();
    const sorted = quotes.sort((a, b) => b.votes - a.votes);
    res.json(sorted);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch quotes' });
  }
});

// Get a random quote
app.get('/api/quotes/random', async (req, res) => {
  try {
    const quotes = await readQuotes();
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    res.json(randomQuote);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch random quote' });
  }
});

// Get two random quotes for quiz
app.get('/api/quotes/quiz', async (req, res) => {
  try {
    const quotes = await readQuotes();
    const shuffled = [...quotes].sort(() => 0.5 - Math.random());
    const twoQuotes = shuffled.slice(0, 2);
    res.json(twoQuotes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch quiz quotes' });
  }
});

// Search quotes
app.get('/api/quotes/search', async (req, res) => {
  try {
    const queryParam = req.query.q;
    const query = (
      typeof queryParam === 'string' ? queryParam : ''
    ).toLowerCase();
    const quotes = await readQuotes();
    const filtered = quotes.filter((quote) =>
      quote.text.toLowerCase().includes(query)
    );
    res.json(filtered);
  } catch (error) {
    res.status(500).json({ error: 'Failed to search quotes' });
  }
});

// Get current session vote status
app.get('/api/session/votes', (req, res) => {
  const sessionVotes = req.session.votedQuotes || [];
  const votesLeft = Math.max(0, MAX_VOTES_PER_SESSION - sessionVotes.length);

  res.json({
    votesLeft: votesLeft,
    totalVotes: sessionVotes.length,
    votedQuotes: sessionVotes,
  });
});

// Vote for a quote (with rate limiting and server-side session tracking)
app.post('/api/quotes/:id/vote', voteLimiter, async (req, res) => {
  try {
    const quoteId = parseInt(req.params.id);

    // Initialize session vote tracking if not exists
    if (!req.session.votedQuotes) {
      req.session.votedQuotes = [];
    }

    // Server-side check: Has user already voted for this quote?
    if (req.session.votedQuotes.includes(quoteId)) {
      return res.status(400).json({
        error: 'You have already voted for this quote',
        votesLeft: Math.max(
          0,
          MAX_VOTES_PER_SESSION - req.session.votedQuotes.length
        ),
      });
    }

    // Server-side check: Has user exceeded vote limit?
    if (req.session.votedQuotes.length >= MAX_VOTES_PER_SESSION) {
      return res.status(400).json({
        error: 'You have reached the maximum number of votes',
        votesLeft: 0,
      });
    }

    const quotes = await readQuotes();
    const quote = quotes.find((q) => q.id === quoteId);

    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    // Record the vote in the session
    req.session.votedQuotes.push(quoteId);

    // Update quote votes
    quote.votes += 1;
    await writeQuotes(quotes);

    const votesLeft = Math.max(
      0,
      MAX_VOTES_PER_SESSION - req.session.votedQuotes.length
    );

    res.json({
      success: true,
      votes: quote.votes,
      votesLeft: votesLeft,
      totalVotes: req.session.votedQuotes.length,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to vote' });
  }
});

// Initialize quotes file on startup
initializeQuotesFile().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
