const API_BASE = '/api/quotes';
const MAX_VOTES = 25;

let quotes = [];
let votesLeft = MAX_VOTES;
let votedQuotes = new Set();

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadVoteState();
    setupTabs();
    loadQuotes();
    setupSearch();
});

// Load vote state from localStorage
function loadVoteState() {
    const saved = localStorage.getItem('voteState');
    if (saved) {
        const state = JSON.parse(saved);
        votesLeft = state.votesLeft || MAX_VOTES;
        votedQuotes = new Set(state.votedQuotes || []);
    }
    updateVotesLeft();
}

// Save vote state to localStorage
function saveVoteState() {
    localStorage.setItem('voteState', JSON.stringify({
        votesLeft,
        votedQuotes: Array.from(votedQuotes)
    }));
}

// Update votes left display
function updateVotesLeft() {
    document.getElementById('votes-left').textContent = votesLeft;
}

// Setup tab switching
function setupTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            
            // Update active states
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
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
        const response = await fetch(API_BASE);
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

    container.innerHTML = quotesToShow.map((quote, index) => {
        const canVote = votesLeft > 0 && !votedQuotes.has(quote.id);
        return `
            <div class="quote-item">
                <div class="quote-rank">#${index + 1}</div>
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
    }).join('');

    // Add event listeners to vote buttons
    container.querySelectorAll('.vote-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const quoteId = parseInt(btn.dataset.id);
            voteForQuote(quoteId);
        });
    });
}

// Load quiz (2 random quotes)
async function loadQuiz() {
    try {
        const response = await fetch(`${API_BASE}/quiz`);
        const quizQuotes = await response.json();
        displayQuiz(quizQuotes);
    } catch (error) {
        console.error('Error loading quiz:', error);
    }
}

// Display quiz quotes
function displayQuiz(quizQuotes) {
    const container = document.getElementById('quiz-quotes');
    
    if (quizQuotes.length < 2) {
        container.innerHTML = '<div class="empty-state">Not enough quotes for quiz</div>';
        return;
    }

    container.innerHTML = quizQuotes.map(quote => {
        const canVote = votesLeft > 0 && !votedQuotes.has(quote.id);
        return `
            <div class="quiz-quote" 
                 data-id="${quote.id}"
                 ${canVote ? 'style="cursor: pointer;"' : 'style="opacity: 0.6; cursor: not-allowed;"'}>
                <div class="quiz-quote-text">${quote.text}</div>
                ${!canVote ? '<div style="margin-top: 10px; color: #999;">Already voted</div>' : ''}
            </div>
        `;
    }).join('');

    // Add event listeners
    container.querySelectorAll('.quiz-quote').forEach(quoteEl => {
        const quoteId = parseInt(quoteEl.dataset.id);
        const canVote = votesLeft > 0 && !votedQuotes.has(quoteId);
        
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
        const response = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`);
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

    container.innerHTML = results.map(quote => {
        const canVote = votesLeft > 0 && !votedQuotes.has(quote.id);
        return `
            <div class="search-quote">
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
    }).join('');

    // Add event listeners
    container.querySelectorAll('.vote-btn').forEach(btn => {
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
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to vote');
        }

        const result = await response.json();
        
        // Update local state
        votesLeft--;
        votedQuotes.add(quoteId);
        saveVoteState();
        updateVotesLeft();

        // Update the quote in our local array
        const quote = quotes.find(q => q.id === quoteId);
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
        alert('Failed to vote. Please try again.');
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

