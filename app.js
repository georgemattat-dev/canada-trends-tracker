// CONFIGURATION: Set this to the absolute URL where your data.json is hosted.
// For WordPress: upload data.json to your media library or server and put the URL here.
// e.g. 'https://yourwebsite.com/wp-content/uploads/canada-trends-tracker/data.json'
// If left as 'data.json', it will fetch from the same directory as this webpage.
const DATA_SOURCE_URL = 'data.json';

// Global variables
let trendsData = null;

// DOM Elements
const lastUpdatedText = document.getElementById('last-updated-text');
const refreshBtn = document.getElementById('refresh-btn');
const twitterTimeSelector = document.getElementById('twitter-time-selector');
const twitterTrendsList = document.getElementById('twitter-trends-list');
const googleTrendsList = document.getElementById('google-trends-list');
const youtubeTrendsList = document.getElementById('youtube-trends-list');
const loadingOverlay = document.getElementById('loading-overlay');
const toastNotice = document.getElementById('toast-notice');

// Modal Elements
const detailModal = document.getElementById('detail-modal');
const modalCloseBtn = document.getElementById('modal-close-btn');
const modalSourceTag = document.getElementById('modal-source-tag');
const modalTrendTitle = document.getElementById('modal-trend-title');
const modalTrendSubtitle = document.getElementById('modal-trend-subtitle');
const modalNewsSection = document.getElementById('modal-news-section');
const modalNewsGrid = document.getElementById('modal-news-grid');
const modalActionX = document.getElementById('modal-action-x');
const modalActionGoogle = document.getElementById('modal-action-google');
const modalActionGoogleTrends = document.getElementById('modal-action-google-trends');
const modalActionShare = document.getElementById('modal-action-share');

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
  fetchTrends();
  setupEventListeners();
});

// Setup click handlers
function setupEventListeners() {
  // Manual refresh button
  refreshBtn.addEventListener('click', refreshTrends);

  // Time selector for Twitter trends
  twitterTimeSelector.addEventListener('change', (e) => {
    const idx = parseInt(e.target.value);
    if (trendsData && trendsData.twitter && trendsData.twitter[idx]) {
      renderTwitterList(trendsData.twitter[idx].trends);
    }
  });

  // Modal Close
  modalCloseBtn.addEventListener('click', closeModal);
  detailModal.addEventListener('click', (e) => {
    if (e.target === detailModal) closeModal();
  });

  // Escape key to close modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && detailModal.classList.contains('active')) {
      closeModal();
    }
  });
}

// Fetch trends from the static data.json (or local node API if static fails)
async function fetchTrends() {
  // Check for local file protocol security warning
  if (window.location.protocol === 'file:') {
    console.warn('Canada Trends Tracker running on file:// protocol. Local browser security blocks file fetching.');
    showFileProtocolWarning();
    return;
  }

  try {
    // Attempt 1: Fetch static data.json (highly portable, works on WordPress)
    console.log('Fetching trends data from:', DATA_SOURCE_URL);
    let response = await fetch(DATA_SOURCE_URL);
    
    if (!response.ok) {
      // Attempt 2: Fallback to local server endpoint
      console.log('Static data.json fetch failed, falling back to local server /api/trends...');
      response = await fetch('/api/trends');
    }
    
    if (!response.ok) {
      throw new Error('All data fetch attempts failed (404/Network Error)');
    }
    
    trendsData = await response.json();
    populateDashboard(trendsData);
  } catch (error) {
    console.error('Error fetching trends:', error);
    lastUpdatedText.textContent = 'Error loading trends';
    // Fallback: show error placeholders in list columns
    showColumnError(twitterTrendsList, 'Twitter data temporarily unavailable.');
    showColumnError(googleTrendsList, 'Google trends temporarily unavailable.');
    showColumnError(youtubeTrendsList, 'YouTube trends temporarily unavailable.');
  }
}

// Render a friendly security warning for file:// launches
function showFileProtocolWarning() {
  lastUpdatedText.textContent = 'Local File Mode';
  
  // Custom styled CSS warning box
  const warningMsg = `
    <div class="loading-placeholder text-yellow" style="padding: 1rem; text-align: center;">
      <svg viewBox="0 0 24 24" width="36" height="36" fill="#eab308" style="margin-bottom: 0.75rem;">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
      </svg>
      <h4 style="color: #eab308; margin-bottom: 0.5rem; font-family: 'Outfit';">Security Restriction</h4>
      <p style="font-size: 0.8rem; line-height: 1.4; color: var(--text-secondary); max-width: 260px; margin: 0 auto;">
        Browsers block loading local data files directly. Please publish these files to a free web server (like GitHub Pages) to view the active trends.
      </p>
    </div>
  `;
  
  twitterTrendsList.innerHTML = warningMsg;
  googleTrendsList.innerHTML = warningMsg;
  youtubeTrendsList.innerHTML = warningMsg;
}

// Trigger manual refresh by calling /api/refresh
async function refreshTrends() {
  showGlobalLoading(true);
  try {
    const response = await fetch('/api/refresh', {
      method: 'POST'
    });
    if (!response.ok) {
      throw new Error('Refresh failed');
    }
    trendsData = await response.json();
    populateDashboard(trendsData);
    showToast('Dashboard refreshed successfully!');
  } catch (error) {
    console.error('Error refreshing trends:', error);
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isLocalhost) {
      const timeStr = (trendsData && trendsData.last_updated) ? trendsData.last_updated : 'Recently';
      showToast(`Up to date (Updated: ${timeStr})`);
    } else {
      showToast('Failed to refresh: ' + error.message, true);
    }
  } finally {
    showGlobalLoading(false);
  }
}

// Display loading state during refreshes
function showGlobalLoading(show) {
  if (show) {
    loadingOverlay.classList.add('active');
    loadingOverlay.setAttribute('aria-hidden', 'false');
  } else {
    loadingOverlay.classList.remove('active');
    loadingOverlay.setAttribute('aria-hidden', 'true');
  }
}

// Show error messages in columns
function showColumnError(container, message) {
  container.innerHTML = `
    <div class="loading-placeholder text-red">
      <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor" style="opacity:0.6;">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
      </svg>
      <p>${message}</p>
    </div>
  `;
}

// Render dynamic content in dashboard columns
function populateDashboard(data) {
  // Update timestamp
  if (data.last_updated) {
    lastUpdatedText.textContent = `Updated: ${data.last_updated}`;
  }

  // Populate Twitter Selector & List
  if (data.twitter && data.twitter.length > 0) {
    twitterTimeSelector.innerHTML = '';
    data.twitter.forEach((snapshot, idx) => {
      const option = document.createElement('option');
      option.value = idx;
      // Convert GMT timestamp to simple text
      let friendlyTime = snapshot.time;
      if (friendlyTime.includes('GMT')) {
        // Strip GMT text
        friendlyTime = friendlyTime.split(' GMT')[0];
      }
      option.textContent = friendlyTime;
      twitterTimeSelector.appendChild(option);
    });
    
    // Select the first (latest) snapshot
    twitterTimeSelector.value = 0;
    renderTwitterList(data.twitter[0].trends);
  } else {
    showColumnError(twitterTrendsList, 'No Twitter trends available.');
  }

  // Populate Google Search Trends
  if (data.google && data.google.length > 0) {
    renderGoogleList(data.google);
  } else {
    showColumnError(googleTrendsList, 'No Google Trends available.');
  }

  // Populate YouTube Trending Feed
  if (data.youtube && data.youtube.length > 0) {
    renderYoutubeList(data.youtube);
  } else {
    showColumnError(youtubeTrendsList, 'No YouTube trends available.');
  }
}

// Render Twitter trends in Column 1
function renderTwitterList(trends) {
  twitterTrendsList.innerHTML = '';
  
  trends.forEach((trend, idx) => {
    // Insert mock native ad after 5 trends
    if (idx === 5) {
      insertInlineAd(twitterTrendsList, 'Sponsored: Quick & Balanced News', 'Get news in quick summaries for easy reading. Daily Dive merges multiple sources for a neutral perspective.', 'https://dailydive.ca/download/');
    }

    const card = document.createElement('div');
    card.className = 'trend-item-card';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.id = `tw-trend-${idx}`;
    
    const countBadge = trend.tweet_count ? `<span class="trend-count-badge twitter-badge">${trend.tweet_count} tweets</span>` : '';
    
    card.innerHTML = `
      <div class="trend-left">
        <span class="trend-rank">${idx + 1}</span>
        <div class="trend-info">
          <span class="trend-name">${trend.name}</span>
          <span class="trend-meta">X Trending Topic</span>
        </div>
      </div>
      <div class="trend-right">
        ${countBadge}
      </div>
    `;

    card.addEventListener('click', () => openTrendModal(trend, 'twitter'));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openTrendModal(trend, 'twitter');
      }
    });

    twitterTrendsList.appendChild(card);
  });
}

// Render Google search trends in Column 2
function renderGoogleList(trends) {
  googleTrendsList.innerHTML = '';

  trends.forEach((trend, idx) => {
    // Insert mock native ad after 5 trends
    if (idx === 5) {
      insertInlineAd(googleTrendsList, 'Sponsored: Neutral News Summaries', 'Skip the bias. Daily Dive combines news from various viewpoints for quick reading and a balanced outlook.', 'https://dailydive.ca/download/');
    }

    const card = document.createElement('div');
    card.className = 'trend-item-card';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.id = `go-trend-${idx}`;

    card.innerHTML = `
      <div class="trend-left">
        <span class="trend-rank">${idx + 1}</span>
        <div class="trend-info">
          <span class="trend-name">${trend.keyword}</span>
          <span class="trend-meta">Daily Google Search</span>
        </div>
      </div>
      <div class="trend-right">
        <span class="trend-count-badge google-badge">${trend.traffic} searches</span>
      </div>
    `;

    card.addEventListener('click', () => openTrendModal(trend, 'google'));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openTrendModal(trend, 'google');
      }
    });

    googleTrendsList.appendChild(card);
  });
}

// Render YouTube video trends in Column 3
function renderYoutubeList(trends) {
  youtubeTrendsList.innerHTML = '';

  trends.forEach((trend, idx) => {
    // Insert mock native ad after 5 trends
    if (idx === 5) {
      insertInlineAd(youtubeTrendsList, 'Sponsored: Unbiased News in a Flash', 'Read concise summaries from multiple perspectives. Download Daily Dive for clean, neutral reporting.', 'https://dailydive.ca/download/');
    }

    const card = document.createElement('div');
    card.className = 'trend-item-card yt-card';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.id = `yt-trend-${idx}`;

    // Get thumbnail URL from YouTube
    const thumbUrl = trend.video_id 
      ? `https://img.youtube.com/vi/${trend.video_id}/mqdefault.jpg` 
      : 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=150&h=85&q=80';

    // Format status class and symbol
    let statusClass = 'status-badge ';
    let statusSymbol = trend.status;
    
    if (trend.status === 'NEW') {
      statusClass += 'status-new';
    } else if (trend.status.startsWith('+')) {
      statusClass += 'status-up';
      statusSymbol = '▲ ' + trend.status.substring(1);
    } else if (trend.status.startsWith('-')) {
      statusClass += 'status-down';
      statusSymbol = '▼ ' + trend.status.substring(1);
    } else {
      statusClass += 'status-equal';
    }

    card.innerHTML = `
      <div class="yt-thumb-wrapper">
        <img class="yt-thumb-img" src="${thumbUrl}" alt="Video Thumbnail">
        <div class="yt-play-overlay">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="#fff">
            <path d="M8 5v14l11-7z"/>
          </svg>
        </div>
      </div>
      <div class="yt-details">
        <span class="yt-title">${trend.title}</span>
        <div class="yt-meta-row">
          <span class="trend-rank">#${trend.rank}</span>
          <span class="${statusClass}">${statusSymbol}</span>
        </div>
      </div>
    `;

    card.addEventListener('click', () => openTrendModal(trend, 'youtube'));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openTrendModal(trend, 'youtube');
      }
    });

    youtubeTrendsList.appendChild(card);
  });
}

// Helper to insert a mock sponsored card in column feeds
function insertInlineAd(container, title, text, ctaUrl) {
  const adCard = document.createElement('div');
  adCard.className = 'inline-ad-card';
  adCard.innerHTML = `
    <div class="ad-label">Sponsored</div>
    <h5>${title}</h5>
    <p>${text}</p>
    <a href="${ctaUrl}" target="_blank" class="inline-ad-link">Download App &raquo;</a>
  `;
  container.appendChild(adCard);
}

// Open detailed popover/modal
function openTrendModal(data, source) {
  // Reset modal classes
  modalSourceTag.className = 'modal-source-tag';
  modalNewsSection.style.display = 'none';
  
  let keyword = '';
  
  if (source === 'twitter') {
    keyword = data.name;
    modalSourceTag.textContent = 'Twitter / X Trend';
    modalSourceTag.classList.add('source-twitter');
    modalTrendTitle.textContent = data.name;
    modalTrendSubtitle.textContent = data.tweet_count 
      ? `Currently trending in Canada with ${data.tweet_count} active tweets.` 
      : 'Currently trending in Canada.';
  } 
  
  else if (source === 'google') {
    keyword = data.keyword;
    modalSourceTag.textContent = 'Google Search Trend';
    modalSourceTag.classList.add('source-google');
    modalTrendTitle.textContent = data.keyword;
    modalTrendSubtitle.textContent = `Trending on Google with over ${data.traffic} daily searches in Canada.`;
    
    // Display news articles if present
    if (data.news && data.news.length > 0) {
      modalNewsSection.style.display = 'block';
      modalNewsGrid.innerHTML = '';
      
      data.news.forEach(article => {
        const artCard = document.createElement('a');
        artCard.className = 'news-card';
        artCard.href = article.url;
        artCard.target = '_blank';
        
        const imgTag = article.picture 
          ? `<img class="news-pic" src="${article.picture}" alt="Article thumbnail">` 
          : '';
          
        artCard.innerHTML = `
          ${imgTag}
          <div class="news-content">
            <h5 class="news-card-title">${article.title}</h5>
            <span class="news-card-source">${article.source}</span>
          </div>
        `;
        modalNewsGrid.appendChild(artCard);
      });
    }
  } 
  
  else if (source === 'youtube') {
    keyword = data.title;
    modalSourceTag.textContent = 'YouTube Trending Video';
    modalSourceTag.classList.add('source-youtube');
    modalTrendTitle.textContent = data.title;
    modalTrendSubtitle.textContent = `YouTube Canada Rank #${data.rank} | Trend Change: ${data.status}`;
  }

  // Set action button links
  const encKeyword = encodeURIComponent(keyword);
  
  // Set X (Twitter) search URL
  // If twitter data has pre-scraped search link, use it; otherwise generate standard query
  if (source === 'twitter' && data.url) {
    modalActionX.href = data.url;
  } else {
    modalActionX.href = `https://twitter.com/search?q=${encKeyword}`;
  }
  
  // Google search link
  modalActionGoogle.href = `https://www.google.com/search?q=${encKeyword}`;
  
  // Google Trends link
  // If YouTube link is clicked, link to video directly as main action
  if (source === 'youtube') {
    modalActionGoogleTrends.innerHTML = `
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
      </svg>
      Watch on YouTube
    `;
    modalActionGoogleTrends.href = data.url;
    modalActionGoogleTrends.classList.add('youtube-btn-modal');
  } else {
    modalActionGoogleTrends.innerHTML = `
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
        <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/>
      </svg>
      Analyze on Google Trends
    `;
    modalActionGoogleTrends.href = `https://trends.google.com/trends/explore?geo=CA&q=${encKeyword}`;
    modalActionGoogleTrends.classList.remove('youtube-btn-modal');
  }

  // Copy share info handler
  modalActionShare.onclick = (e) => {
    e.preventDefault();
    const shareText = `Explore "${keyword}" trending in Canada:
X (Twitter) search: ${modalActionX.href}
Google Search: ${modalActionGoogle.href}`;

    navigator.clipboard.writeText(shareText).then(() => {
      showToast('Copied trend share details!');
    }).catch(err => {
      console.error('Clipboard copy failed:', err);
      showToast('Failed to copy to clipboard', true);
    });
  };

  // Open the Modal
  detailModal.classList.add('active');
  detailModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden'; // Disable page scrolling
}

// Close detailed popover/modal
function closeModal() {
  detailModal.classList.remove('active');
  detailModal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = ''; // Enable page scrolling
}

// Display copy/action toast notice
function showToast(message, isError = false) {
  toastNotice.textContent = message;
  if (isError) {
    toastNotice.style.background = 'rgba(239, 68, 68, 0.95)';
  } else {
    toastNotice.style.background = 'rgba(16, 185, 129, 0.95)';
  }
  
  toastNotice.classList.add('show');
  setTimeout(() => {
    toastNotice.classList.remove('show');
  }, 2500);
}
