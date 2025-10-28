const { JSDOM } = require('jsdom');

function extractMetadata(html, opts = {}) {
  const { url } = opts;
  try {
    const dom = new JSDOM(html, { url });
    const doc = dom.window.document;
    const getMeta = (name) => {
      return doc.querySelector(`meta[name="${name}"]`)?.getAttribute('content')
        || doc.querySelector(`meta[property="${name}"]`)?.getAttribute('content');
    };

    const title = doc.querySelector('title')?.textContent || getMeta('og:title') || getMeta('twitter:title') || null;
    const author = getMeta('author') || getMeta('article:author') || null;
    const published = getMeta('article:published_time') || getMeta('og:updated_time') || null;
    const canonical = doc.querySelector('link[rel="canonical"]')?.href || getMeta('og:url') || url || null;

    return { title, author, published, canonical };
  } catch (err) {
    return null;
  }
}

module.exports = { extractMetadata };
