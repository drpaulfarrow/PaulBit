const TurndownService = require('turndown');
const { JSDOM } = require('jsdom');
const { Readability } = require('@mozilla/readability');

const turndownService = new TurndownService({ codeBlockStyle: 'fenced' });

async function htmlToMarkdown(html, opts = {}) {
  const { url, extractMainContent = true } = opts;
  const dom = new JSDOM(html, { url });
  let contentHtml = html;
  try {
    if (extractMainContent) {
      const doc = dom.window.document;
      const reader = new Readability(doc);
      const article = reader.parse();
      if (article && article.content) contentHtml = article.content;
    }
  } catch (err) {
    // fallback to full HTML
  }

  const markdown = turndownService.turndown(contentHtml || '');
  return { markdown, length: markdown.length };
}

module.exports = { htmlToMarkdown };
