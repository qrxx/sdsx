const express = require('express');
const axios = require('axios');
const url = require('url');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Original M3U8 URL
const ORIGINAL_M3U8_URL = 'http://145.239.19.149:9300/PL_SUPERSTACJA/index.m3u8';

// Set CORS headers to allow Clappr player access
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Handle requests for the M3U8 playlist
app.get('/index.m3u8', async (req, res) => {
  try {
    // Fetch the original M3U8 playlist
    const response = await axios.get(ORIGINAL_M3U8_URL, {
      responseType: 'text',
    });

    // Get the base URL for resolving relative segment URLs
    const baseUrl = ORIGINAL_M3U8_URL.substring(0, ORIGINAL_M3U8_URL.lastIndexOf('/') + 1);
    const host = req.get('host');
    const protocol = req.protocol || 'https'; // Render.com uses HTTPS

    // Modify the M3U8 content to rewrite segment URLs
    let m3u8Content = response.data;

    // Replace relative segment URLs (e.g., segment1.ts) with proxied URLs
    m3u8Content = m3u8Content.replace(
      /((?:[a-zA-Z0-9_-]+\.)?(?:ts|m3u8))/g,
      (match) => `${protocol}://${host}/segments/${match}`
    );

    // Replace absolute segment URLs if present
    m3u8Content = m3u8Content.replace(
      /http:\/\/145\.239\.19\.149:9300\/PL_SUPERSTACJA\/((?:[a-zA-Z0-9_-]+\.)?(?:ts|m3u8))/g,
      `${protocol}://${host}/segments/$1`
    );

    // Set appropriate content type for M3U8
    res.set('Content-Type', 'application/vnd.apple.mpegurl');
    res.send(m3u8Content);
  } catch (error) {
    console.error('Error fetching M3U8:', error.message);
    res.status(500).send('Error fetching playlist');
  }
});

// Handle requests for media segments (e.g., .ts files)
app.get('/segments/:filename', async (req, res) => {
  const segmentFile = req.params.filename;
  const segmentUrl = `http://145.239.19.149:9300/PL_SUPERSTACJA/${segmentFile}`;

  try {
    // Fetch the segment file
    const response = await axios.get(segmentUrl, {
      responseType: 'stream',
    });

    // Set appropriate content type for TS segments
    res.set('Content-Type', 'video/mp2t');
    response.data.pipe(res);
  } catch (error) {
    console.error('Error fetching segment:', error.message);
    res.status(404).send('Segment not found');
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
