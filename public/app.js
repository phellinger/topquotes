const API_BASE = '/api/quotes';
const MAX_VOTES = 5;

let quotes = [];
let votesLeft = MAX_VOTES;
let votedQuotes = new Set();

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await loadVoteState();
  setupTabs();
  loadQuotes();
  setupSearch();
});

// Load vote state from server session
async function loadVoteState() {
  try {
    const response = await fetch('/api/session/votes', {
      credentials: 'include', // Important: send cookies for session
    });
    if (response.ok) {
      const state = await response.json();
      votesLeft = state.votesLeft || MAX_VOTES;
      votedQuotes = new Set(state.votedQuotes || []);
    }
  } catch (error) {
    console.error('Error loading vote state:', error);
    // Fallback to localStorage if server fails
    const saved = localStorage.getItem('voteState');
    if (saved) {
      const state = JSON.parse(saved);
      votesLeft = Math.min(state.votesLeft || MAX_VOTES, MAX_VOTES);
      votedQuotes = new Set(state.votedQuotes || []);
    }
  }
  updateVotesLeft();
}

// Save vote state to localStorage
function saveVoteState() {
  localStorage.setItem(
    'voteState',
    JSON.stringify({
      votesLeft,
      votedQuotes: Array.from(votedQuotes),
    })
  );
}

// Update votes left display
function updateVotesLeft() {
  document.getElementById('votes-left').textContent = votesLeft;
}

// Setup tab switching
function setupTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const tabName = btn.dataset.tab;

      // Update active states
      tabBtns.forEach((b) => b.classList.remove('active'));
      tabContents.forEach((c) => c.classList.remove('active'));

      btn.classList.add('active');
      document.getElementById(`${tabName}-view`).classList.add('active');

      // Load appropriate content
      if (tabName === 'ranked') {
        loadQuotes();
      } else if (tabName === 'quiz') {
        loadQuiz();
      } else if (tabName === 'search') {
        // Search is handled by input event
      }
    });
  });
}

// Load all quotes (ranked view)
async function loadQuotes() {
  try {
    const response = await fetch(API_BASE, {
      credentials: 'include',
    });
    quotes = await response.json();
    displayQuotes(quotes);
  } catch (error) {
    console.error('Error loading quotes:', error);
  }
}

// Display quotes in ranked view
function displayQuotes(quotesToShow) {
  const container = document.getElementById('quotes-list');

  if (quotesToShow.length === 0) {
    container.innerHTML = '<div class="empty-state">No quotes found</div>';
    return;
  }

  container.innerHTML = quotesToShow
    .map((quote, index) => {
      const canVote = votesLeft > 0 && !votedQuotes.has(quote.id);
      return `
            <div class="quote-item">
                <div class="quote-rank-container">
                    <img src="favicon.png" alt="Quote icon" class="quote-icon">
                    <div class="quote-rank">#${index + 1}</div>
                </div>
                <div class="quote-text">${quote.text}</div>
                <div class="quote-meta">
                    <div class="quote-votes">${quote.votes} votes</div>
                    <button class="vote-btn"
                            data-id="${quote.id}"
                            ${canVote ? '' : 'disabled'}>
                        ${canVote ? 'Vote' : 'Voted'}
                    </button>
                </div>
            </div>
        `;
    })
    .join('');

  // Add event listeners to vote buttons
  container.querySelectorAll('.vote-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const quoteId = parseInt(btn.dataset.id);
      voteForQuote(quoteId);
    });
  });
}

// Load quiz (2 random quotes that haven't been voted for)
async function loadQuiz() {
  try {
    // Get all quotes to filter out voted ones
    const allQuotesResponse = await fetch(API_BASE, {
      credentials: 'include',
    });
    const allQuotes = await allQuotesResponse.json();

    // Filter out quotes that have already been voted for
    const availableQuotes = allQuotes.filter(
      (quote) => !votedQuotes.has(quote.id)
    );

    if (availableQuotes.length < 2) {
      const container = document.getElementById('quiz-quotes');
      container.innerHTML =
        '<div class="empty-state">Not enough unvoted quotes for quiz. You have already voted on most quotes!</div>';
      return;
    }

    // Shuffle and pick 2 random quotes from available (non-voted) quotes
    const shuffled = [...availableQuotes].sort(() => 0.5 - Math.random());
    const quizQuotes = shuffled.slice(0, 2);

    displayQuiz(quizQuotes);
  } catch (error) {
    console.error('Error loading quiz:', error);
  }
}

// Display quiz quotes
function displayQuiz(quizQuotes) {
  const container = document.getElementById('quiz-quotes');

  if (quizQuotes.length < 2) {
    container.innerHTML =
      '<div class="empty-state">Not enough quotes for quiz</div>';
    return;
  }

  // All quotes in quizQuotes are already filtered to be non-voted, so all can be voted on
  container.innerHTML = quizQuotes
    .map((quote) => {
      const canVote = votesLeft > 0; // All quotes shown are non-voted, so can vote if votes left
      return `
            <div class="quiz-quote"
                 data-id="${quote.id}"
                 ${
                   canVote
                     ? 'style="cursor: pointer;"'
                     : 'style="opacity: 0.6; cursor: not-allowed;"'
                 }>
                <div class="quiz-quote-text">${quote.text}</div>
            </div>
        `;
    })
    .join('');

  // Add event listeners
  container.querySelectorAll('.quiz-quote').forEach((quoteEl) => {
    const quoteId = parseInt(quoteEl.dataset.id);
    const canVote = votesLeft > 0; // All quotes are non-voted

    if (canVote) {
      quoteEl.addEventListener('click', () => {
        voteForQuote(quoteId);
      });
    }
  });
}

// Setup search functionality
function setupSearch() {
  const searchInput = document.getElementById('search-input');
  let searchTimeout;

  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const query = e.target.value.trim();

    searchTimeout = setTimeout(() => {
      if (query.length > 0) {
        searchQuotes(query);
      } else {
        document.getElementById('search-results').innerHTML = '';
      }
    }, 300);
  });
}

// Search quotes
async function searchQuotes(query) {
  try {
    const response = await fetch(
      `${API_BASE}/search?q=${encodeURIComponent(query)}`,
      {
        credentials: 'include',
      }
    );
    const results = await response.json();
    displaySearchResults(results);
  } catch (error) {
    console.error('Error searching quotes:', error);
  }
}

// Display search results
function displaySearchResults(results) {
  const container = document.getElementById('search-results');

  if (results.length === 0) {
    container.innerHTML = '<div class="empty-state">No quotes found</div>';
    return;
  }

  container.innerHTML = results
    .map((quote) => {
      const canVote = votesLeft > 0 && !votedQuotes.has(quote.id);
      return `
            <div class="search-quote">
                <div class="quote-rank-container">
                    <img src="favicon.png" alt="Quote icon" class="quote-icon">
                </div>
                <div class="search-quote-text">${quote.text}</div>
                <div class="quote-meta">
                    <div class="search-quote-votes">${quote.votes} votes</div>
                    <button class="vote-btn"
                            data-id="${quote.id}"
                            ${canVote ? '' : 'disabled'}>
                        ${canVote ? 'Vote' : 'Voted'}
                    </button>
                </div>
            </div>
        `;
    })
    .join('');

  // Add event listeners
  container.querySelectorAll('.vote-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const quoteId = parseInt(btn.dataset.id);
      voteForQuote(quoteId);
    });
  });
}

// Vote for a quote
async function voteForQuote(quoteId) {
  if (votesLeft <= 0) {
    alert('You have no votes left!');
    return;
  }

  if (votedQuotes.has(quoteId)) {
    alert('You have already voted for this quote!');
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/${quoteId}/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Important: send cookies for session
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to vote');
    }

    const result = await response.json();

    // Update local state from server response (server is source of truth)
    votesLeft = result.votesLeft || 0;
    votedQuotes.add(quoteId);
    saveVoteState(); // Still save to localStorage as backup/UI state
    updateVotesLeft();

    // Update the quote in our local array
    const quote = quotes.find((q) => q.id === quoteId);
    if (quote) {
      quote.votes = result.votes;
    }

    // Reload current view
    const activeTab = document.querySelector('.tab-btn.active').dataset.tab;
    if (activeTab === 'ranked') {
      loadQuotes();
    } else if (activeTab === 'quiz') {
      loadQuiz();
    } else if (activeTab === 'search') {
      const searchQuery = document.getElementById('search-input').value.trim();
      if (searchQuery) {
        searchQuotes(searchQuery);
      }
    }

    // Show success feedback
    showVoteSuccess();
  } catch (error) {
    console.error('Error voting:', error);
    // Reload vote state from server to get accurate count
    await loadVoteState();
    alert(error.message || 'Failed to vote. Please try again.');
  }
}

// Show vote success feedback
function showVoteSuccess() {
  // Simple visual feedback - could be enhanced with animations
  const voteInfo = document.querySelector('.vote-info');
  voteInfo.style.transform = 'scale(1.1)';
  voteInfo.style.transition = 'transform 0.2s';
  setTimeout(() => {
    voteInfo.style.transform = 'scale(1)';
  }, 200);
}
