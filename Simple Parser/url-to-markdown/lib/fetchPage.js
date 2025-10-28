const axios = require('axios');

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function fetchPage(url) {
  try {
    const start = Date.now();
    const resp = await axios.get(url, {
      timeout: 15000,
      maxRedirects: 5,
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'text/html,application/xhtml+xml' },
      responseType: 'text',
      // accept all to inspect status ourselves
      validateStatus: () => true
    });
    const duration = Date.now() - start;

    if (resp.status >= 200 && resp.status < 400) {
      return { html: resp.data, contentType: resp.headers['content-type'] || null, durationMs: duration };
    }

    const e = new Error(`Upstream status ${resp.status}`);
    e.isFetchError = true;
    e.httpStatus = resp.status;
    throw e;
  } catch (err) {
    if (err.isFetchError) throw err;
    const e = new Error('Fetch failed: ' + (err.message || 'unknown'));
    e.isFetchError = true;
    throw e;
  }
}

module.exports = { fetchPage };
