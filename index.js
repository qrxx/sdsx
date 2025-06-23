const express = require('express');
const axios = require('axios');
const url = require('url');

const app = express();
const PORT = process.env.PORT || 3000;

// Original M3U8 URL
const ORIGINAL_BASE_URL = 'http://145.239.19.149:9300/PL_SUPERSTACJA/';
const ORIGINAL_M3U8_URL = `${ORIGINAL_BASE_URL}index.m3u8`;

// Set CORS headers for Clappr compatibility
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Helper function to rewrite URLs in M3U8 content
function rewriteM3u8Urls(content, baseUrl, host, protocol) {
  // Handle relative and absolute URLs in URI attributes and stream URLs
  return content.replace(
    /(URI="|(?<=#EXT-X-STREAM-INF:.*))((?:[a-zA-Z0-9_-]+\/)?[a-zA-Z0-9_-]+\.(?:m3u8|ts))|((?:http:\/\/145\.239\.19\.149:9300\/PL_SUPERSTACJA\/)?(?:[a-zA-Z0-9_-]+\/)?[a-zA-Z0-9_-]+\.(?:m3u8|ts))/g,
    (match, uriPrefix, relativePath, absolutePath) => {
      const path = relativePath || absolutePath;
      // Determine if it's an M3U8 or TS file
      const isM3u8 = path.endsWith('.m3u8');
      const proxyPath = isM3u8 ? `playlists/${path}` : `segments/${path}`;
      return uriPrefix ? `URI="${protocol}://${host}/${proxyPath}"` : `${protocol}://${host}/${proxyPath}`;
    }
  );
}

// Handle requests for the main M3U8 playlist
app.get('/index.m3u8', async (req, res) => {
  try {
    const response = await axios.get(ORIGINAL_M3U8_URL, {
      responseType: 'text',
    });

    const host = req.get('host');
    const protocol = req.protocol || 'https';

    // Rewrite URLs in the M3U8 content
    const modifiedContent = rewriteM3u8Urls(response.data, ORIGINAL_BASE_URL, host, protocol);

    res.set('Content-Type', 'application/vnd.apple.mpegurl');
    res.send(modifiedContent);
  } catch (error) {
    console.error('Error fetching M3U8:', error.message);
    res.status(500).send('Error fetching playlist');
  }
});

// Handle requests for variant playlists (e.g., mono.m3u8)
app.get('/playlists/:filename', async (req, res) => {
  const filename = req.params.filename;
  const playlistUrl = `${ORIGINAL_BASE_URL}${filename}`;

  try {
    const response = await axios.get(playlistUrl, {
      responseType: 'text',
    });

    const host = req.get('host');
    const protocol = req.protocol || 'https';

    // Rewrite URLs in the variant playlist
    const modifiedContent = rewriteM3u8Urls(response.data, ORIGINAL_BASE_URL, host, protocol);

    res.set('Content-Type', 'application/vnd.apple.mpegurl');
    res.send(modifiedContent);
  } catch (error) {
    console.error(`Error fetching playlist ${filename}:`, error.message);
    res.status(500).send('Error fetching variant playlist');
  }
});

// Handle requests for media segments (e.g., .ts files)
app.get('/segments/:filename', async (req, res) => {
  const filename = req.params.filename;
  const segmentUrl = `${ORIGINAL_BASE_URL}${filename}`;

  try {
    const response = await axios.get(segmentUrl, {
      responseType: 'stream',
    });

    res.set('Content-Type', 'video/mp2t');
    response.data.pipe(res);
  } catch (error) {
    console.error(`Error fetching segment ${filename}:`, error.message);
    res.status(404).send('Segment not found');
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
