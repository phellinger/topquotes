const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const QUOTES_FILE =
  process.env.QUOTES_FILE || path.join(__dirname, 'quotes.json');
const QUOTES_EXAMPLE = path.join(__dirname, 'quotes.json.example');

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

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

// Vote for a quote
app.post('/api/quotes/:id/vote', async (req, res) => {
  try {
    const quoteId = parseInt(req.params.id);
    const quotes = await readQuotes();
    const quote = quotes.find((q) => q.id === quoteId);

    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    quote.votes += 1;
    await writeQuotes(quotes);

    res.json({ success: true, votes: quote.votes });
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
