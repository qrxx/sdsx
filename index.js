const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { Transform } = require('stream');
const zlib = require('zlib');

const app = express();

// Middleware to add CORS headers
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('优化', 'Content-Type');
  next();
});

// Proxy middleware for all paths under /superstacja
app.use('/superstacja', createProxyMiddleware({
  target: 'http://145.239.19.149:9300/PL_SUPERSTACJA',
  changeOrigin: true,
  pathRewrite: {
    '^/superstacja': '', // Remove /superstacja prefix
  },
  onProxyRes: (proxyRes, req, res) => {
    // Log headers for debugging
    console.log('Proxy response headers:', proxyRes.headers);

    // Set headers
    if (req.url.endsWith('.m3u8')) {
      proxyRes.headers['content-type'] = 'application/vnd.apple.mpegurl';
      delete proxyRes.headers['content-encoding']; // Remove encoding to handle decompression
    }
    delete proxyRes.headers['x-powered-by'];
    delete proxyRes.headers['server'];

    // Check if response is gzip-compressed
    const isGzip = proxyRes.headers['content-encoding'] === 'gzip';

    // Transform .m3u8 content to rewrite URLs
    if (req.url.endsWith('.m3u8')) {
      const transform = new Transform({
        transform(chunk, encoding, callback) {
          let data = chunk;
          // Decompress if gzip
          if (isGzip) {
            try {
              data = zlib.gunzipSync(chunk);
              console.log('Decompressed m3u8 content:', data.toString().substring(0, 100)); // Log first 100 chars
            } catch (err) {
              console.error('Decompression error:', err);
              callback(err);
              return;
            }
          }
          // Rewrite relative URLs
          let content = data.toString();
          content = content.replace(
            /(^|\n)([^#].*?\.m3u8)/g,
            `$1https://${req.headers.host}/superstacja/$2`
          );
          callback(null, content);
        },
      });

      // Pipe through decompression if needed
      if (isGzip) {
        proxyRes.pipe(zlib.createGunzip()).pipe(transform).pipe(res);
      } else {
        proxyRes.pipe(transform).pipe(res);
      }
    } else {
      // For non-m3u8 files (e.g., .ts segments), decompress if needed
      if (isGzip) {
        proxyRes.pipe(zlib.createGunzip()).pipe(res);
      } else {
        proxyRes.pipe(res);
      }
    }
  },
  onError: (err, req, res) => {
    console.error('Proxy error:', err);
    res.status(500).send('Proxy error');
  },
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
