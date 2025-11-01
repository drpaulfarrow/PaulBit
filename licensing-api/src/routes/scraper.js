const express = require('express');

const router = express.Router();

/**
 * GET /api/scraper/health
 * Scraper health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    service: 'scraper',
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /api/scraper/scrape
 * Scrape a URL and return the content
 */
router.post('/scrape', async (req, res) => {
  try {
    const { url, format = 'markdown' } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'url is required' });
    }

    // This is a placeholder - implement actual scraping logic
    res.json({
      success: true,
      url: url,
      format: format,
      message: 'Scraper endpoint - implement actual scraping logic'
    });
  } catch (error) {
    console.error('Error scraping URL:', error);
    res.status(500).json({ error: 'Failed to scrape URL' });
  }
});

module.exports = router;
