/**
 * Content script – extrahuje obsah článku nebo LinkedIn příspěvku.
 * Spouští se na každé stránce; popup ho volá přes chrome.tabs.sendMessage.
 */

const LINKEDIN_SELECTORS = [
  // Feed post
  '.feed-shared-update-v2__description .break-words',
  '.feed-shared-text .break-words',
  '.update-components-text .break-words',
  // Article / pulse
  '.reader-article-content',
  '.article-body',
  // Fallback
  '[data-test-id="main-feed-activity-card__commentary"]',
];

const ARTICLE_SELECTORS = [
  'article',
  '[role="main"]',
  'main',
  '.post-content',
  '.article-content',
  '.entry-content',
  '.content-body',
  '#content',
  '.content',
];

function getMeta(name) {
  const el =
    document.querySelector(`meta[property="${name}"]`) ||
    document.querySelector(`meta[name="${name}"]`);
  return el ? el.getAttribute('content') || '' : '';
}

function cleanText(text) {
  return text.replace(/\s+/g, ' ').trim();
}

function extractLinkedIn() {
  // Titulek – jméno autora nebo headline
  const authorEl =
    document.querySelector('.feed-shared-actor__name') ||
    document.querySelector('.update-components-actor__name') ||
    document.querySelector('.article-author-name');
  const author = authorEl ? cleanText(authorEl.textContent) : '';

  // Obsah příspěvku / článku
  let content = '';
  for (const sel of LINKEDIN_SELECTORS) {
    const el = document.querySelector(sel);
    if (el && el.textContent.trim().length > 30) {
      content = cleanText(el.textContent);
      break;
    }
  }

  // Pokud nenajdeme přes selektory, zkusíme og:description
  if (!content) {
    content = getMeta('og:description');
  }

  const title =
    getMeta('og:title') ||
    document.title ||
    (author ? `LinkedIn post – ${author}` : 'LinkedIn příspěvek');

  return {
    source_type: 'linkedin',
    url: window.location.href,
    title,
    author,
    content,
    excerpt: content.slice(0, 300),
  };
}

function extractArticle() {
  const title = getMeta('og:title') || document.title || '';
  const author =
    getMeta('author') ||
    getMeta('article:author') ||
    document.querySelector('[rel="author"]')?.textContent?.trim() ||
    '';

  let contentEl = null;
  for (const sel of ARTICLE_SELECTORS) {
    const el = document.querySelector(sel);
    if (el && el.textContent.trim().length > 100) {
      contentEl = el;
      break;
    }
  }

  let content = '';
  if (contentEl) {
    // Odebereme skripty, styly, navigace
    const clone = contentEl.cloneNode(true);
    clone
      .querySelectorAll('script, style, nav, header, footer, aside, .ad, .advertisement')
      .forEach((el) => el.remove());
    content = cleanText(clone.innerText || clone.textContent);
  }

  if (!content) {
    content = getMeta('og:description');
  }

  const excerpt = getMeta('og:description') || content.slice(0, 300);

  return {
    source_type: 'article',
    url: window.location.href,
    title,
    author,
    content,
    excerpt,
  };
}

function extractContent() {
  const hostname = window.location.hostname;
  if (hostname.includes('linkedin.com')) {
    return extractLinkedIn();
  }
  return extractArticle();
}

// Posloucháme zprávy z popup.js
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === 'extractContent') {
    try {
      const data = extractContent();
      sendResponse({ success: true, data });
    } catch (err) {
      sendResponse({ success: false, error: err.message });
    }
  }
  return true; // udržet kanál otevřený pro async sendResponse
});
