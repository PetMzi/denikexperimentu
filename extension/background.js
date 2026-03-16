/**
 * Service Worker – zpracovává ukládání do Supabase.
 * Komunikuje s popup.js přes chrome.runtime.onMessage.
 */

async function getConfig() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['supabaseUrl', 'supabaseKey', 'tableName'], (result) => {
      resolve({
        supabaseUrl: result.supabaseUrl || '',
        supabaseKey: result.supabaseKey || '',
        tableName: result.tableName || 'saved_articles',
      });
    });
  });
}

async function saveToSupabase(articleData) {
  const { supabaseUrl, supabaseKey, tableName } = await getConfig();

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase není nakonfigurován. Otevři Nastavení rozšíření.');
  }

  const url = `${supabaseUrl}/rest/v1/${tableName}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Prefer': 'return=representation',
    },
    body: JSON.stringify({
      url: articleData.url,
      title: articleData.title || null,
      author: articleData.author || null,
      content: articleData.content || null,
      excerpt: articleData.excerpt || null,
      source_type: articleData.source_type || 'article',
      saved_at: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Supabase chyba ${response.status}: ${errorBody}`);
  }

  return await response.json();
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === 'saveArticle') {
    saveToSupabase(message.data)
      .then((result) => sendResponse({ success: true, result }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // async response
  }
});
