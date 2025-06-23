const express = require('express');
const axios = require('axios');
const cors = require('cors');
const url = require('url');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS to allow Clappr player to access the proxied stream
app.use(cors({
  origin: '*', // Adjust to your site's domain in production for security
  methods: ['GET', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Range'],
  exposedHeaders: ['Content-Length', 'Content-Type', 'Content-Range']
}));

// Original M3U8 URL (store in environment variable in production)
const ORIGINAL_M3U8_URL = 'http://145.239.19.149:9300/PL_SUPERSTACJA/index.m3u8';

// Helper function to rewrite URLs in M3U8 content
const rewriteM3u8Urls = (m3u8Content, originalBaseUrl, proxyBaseUrl) => {
  const lines = m3u8Content.split('\n');
  const rewrittenLines = lines.map(line => {
    // Skip comments and empty lines
    if (line.startsWith('#') || line.trim() === '') {
      return line;
    }
    // Check if the line is a relative or absolute URL
    try {
      const parsedUrl = new URL(line, originalBaseUrl);
      // Rewrite to proxy URL
      const relativePath = parsedUrl.pathname.split('/').pop();
      return `${proxyBaseUrl}/${relativePath}`;
    } catch (e) {
      // If not a valid URL, return unchanged
      return line;
    }
  });
  return rewrittenLines.join('\n');
};

// Proxy endpoint for M3U8 playlist
app.get('/superstacija/index.m3u8', async (req, res) => {
  try {
    const response = await axios.get(ORIGINAL_M3U8_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      responseType: 'text'
    });

    const originalBaseUrl = url.parse(ORIGINAL_M3U8_URL).href.replace(/\/[^\/]+$/, '');
    const proxyBaseUrl = `${req.protocol}://${req.get('host')}/superstacija/segments`;

    const rewrittenM3u8 = rewriteM3u8Urls(response.data, originalBaseUrl, proxyBaseUrl);

    res.set({
      'Content-Type': 'application/vnd.apple.mpegurl',
      'Cache-Control': 'no-cache'
    });
    res.send(rewrittenM3u8);
  } catch (error) {
    console.error('Error fetching M3U8:', error.message);
    res.status(500).send('Error proxying M3U8 playlist');
  }
});

// Proxy endpoint for .ts segments
app.get('/superstacija/segments/:segment', async (req, res) => {
  const segment = req.params.segment;
  const segmentUrl = `http://145.239.19.149:9300/PL_SUPERSTACJA/${segment}`;

  try {
    const response = await axios.get(segmentUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      responseType: 'stream'
    });

    res.set({
      'Content-Type': 'video/mp2t',
      'Cache-Control': 'no-cache'
    });
    response.data.pipe(res);
  } catch (error) {
    console.error('Error fetching segment:', error.message);
    res.status(500).send('Error proxying segment');
  }
});

app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});
