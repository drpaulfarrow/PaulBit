import express from 'express';

const app = express();

app.post('/test1', async (req, res) => {
  try {
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/test2', async (req, res) => {
  try {
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

console.log('OK');
