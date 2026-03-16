/**
 * Popup script – koordinuje extrakci a uložení článku.
 */

let extractedData = null;

const saveBtn = document.getElementById('saveBtn');
const statusMsg = document.getElementById('statusMsg');
const previewInner = document.getElementById('previewInner');
const sourceBadgeHeader = document.getElementById('sourceBadgeHeader');

document.getElementById('settingsBtn').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

function setStatus(type, message) {
  statusMsg.className = `status ${type}`;
  statusMsg.innerHTML = type === 'loading'
    ? `<span class="loading-spinner"></span>${message}`
    : message;
}

function renderPreview(data) {
  const sourceLabels = {
    linkedin: 'LinkedIn',
    article: 'Článek',
    other: 'Jiné',
  };
  const sourceType = data.source_type || 'other';
  const label = sourceLabels[sourceType] || sourceType;

  sourceBadgeHeader.textContent = label;

  previewInner.innerHTML = `
    <span class="source-badge ${sourceType}">${label}</span>
    <div class="preview-title">${escapeHtml(data.title || '(bez názvu)')}</div>
    <div class="preview-url">${escapeHtml(data.url)}</div>
    ${data.author ? `<div class="preview-url" style="margin-top:3px;">Autor: ${escapeHtml(data.author)}</div>` : ''}
    ${data.excerpt ? `<div class="preview-excerpt">${escapeHtml(data.excerpt)}</div>` : ''}
  `;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    previewInner.innerHTML = '<div class="empty-state">Nepodařilo se načíst stránku.</div>';
    return;
  }

  setStatus('loading', 'Extrahuji obsah…');

  // Ujistíme se, že content script je injektován (pro speciální stránky jako chrome:// to selže)
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js'],
    });
  } catch (_) {
    // Pravděpodobně už je injektován, nebo stránka to neumožňuje
  }

  chrome.tabs.sendMessage(tab.id, { action: 'extractContent' }, (response) => {
    if (chrome.runtime.lastError || !response?.success) {
      const msg = chrome.runtime.lastError?.message || response?.error || 'Nepodařilo se extrahovat obsah.';
      setStatus('error', msg);
      previewInner.innerHTML = `<div class="empty-state" style="color:#f87171;">${escapeHtml(msg)}</div>`;
      return;
    }

    extractedData = response.data;
    renderPreview(extractedData);
    saveBtn.disabled = false;
    setStatus('', '');
  });
}

saveBtn.addEventListener('click', () => {
  if (!extractedData) return;

  saveBtn.disabled = true;
  setStatus('loading', 'Ukládám do Supabase…');

  chrome.runtime.sendMessage({ action: 'saveArticle', data: extractedData }, (response) => {
    if (chrome.runtime.lastError) {
      setStatus('error', chrome.runtime.lastError.message);
      saveBtn.disabled = false;
      return;
    }

    if (response?.success) {
      setStatus('success', '✓ Úspěšně uloženo!');
      saveBtn.textContent = 'Uloženo';
      saveBtn.style.background = '#166534';
    } else {
      setStatus('error', response?.error || 'Neznámá chyba.');
      saveBtn.disabled = false;
    }
  });
});

init();
