/**
 * Options page script – ukládá a načítá Supabase konfiguraci.
 */

const fields = {
  supabaseUrl: document.getElementById('supabaseUrl'),
  supabaseKey: document.getElementById('supabaseKey'),
  tableName: document.getElementById('tableName'),
};

const saveBtn = document.getElementById('saveBtn');
const testBtn = document.getElementById('testBtn');
const statusEl = document.getElementById('statusMsg');

// Načti uložené hodnoty
chrome.storage.sync.get(['supabaseUrl', 'supabaseKey', 'tableName'], (result) => {
  if (result.supabaseUrl) fields.supabaseUrl.value = result.supabaseUrl;
  if (result.supabaseKey) fields.supabaseKey.value = result.supabaseKey;
  fields.tableName.value = result.tableName || 'saved_articles';
});

// Toggle viditelnosti klíče
document.getElementById('toggleKey').addEventListener('click', () => {
  const input = fields.supabaseKey;
  input.type = input.type === 'password' ? 'text' : 'password';
});

function showStatus(type, message) {
  statusEl.className = `status ${type}`;
  statusEl.textContent = message;
  statusEl.style.display = 'block';
  if (type === 'success') {
    setTimeout(() => { statusEl.style.display = 'none'; }, 3000);
  }
}

saveBtn.addEventListener('click', () => {
  const url = fields.supabaseUrl.value.trim().replace(/\/$/, '');
  const key = fields.supabaseKey.value.trim();
  const table = fields.tableName.value.trim() || 'saved_articles';

  if (!url || !key) {
    showStatus('error', 'Vyplň Project URL a API Key.');
    return;
  }
  if (!url.startsWith('https://')) {
    showStatus('error', 'URL musí začínat https://');
    return;
  }

  chrome.storage.sync.set({ supabaseUrl: url, supabaseKey: key, tableName: table }, () => {
    showStatus('success', '✓ Nastavení uloženo');
  });
});

testBtn.addEventListener('click', async () => {
  const url = fields.supabaseUrl.value.trim().replace(/\/$/, '');
  const key = fields.supabaseKey.value.trim();
  const table = fields.tableName.value.trim() || 'saved_articles';

  if (!url || !key) {
    showStatus('error', 'Nejprve vyplň a ulož konfiguraci.');
    return;
  }

  testBtn.disabled = true;
  testBtn.textContent = 'Testuji…';
  statusEl.style.display = 'none';

  try {
    const response = await fetch(`${url}/rest/v1/${table}?limit=1`, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
      },
    });

    if (response.ok || response.status === 206) {
      showStatus('success', `✓ Připojení OK (${response.status})`);
    } else {
      const body = await response.text();
      showStatus('error', `Chyba ${response.status}: ${body.slice(0, 120)}`);
    }
  } catch (err) {
    showStatus('error', `Síťová chyba: ${err.message}`);
  } finally {
    testBtn.disabled = false;
    testBtn.textContent = 'Otestovat připojení';
  }
});
