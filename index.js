const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { Transform } = require('stream');

const app = express();

// Middleware to add CORS headers to all responses
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
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
    // Set appropriate content type for m3u8 files
    if (req.url.endsWith('.m3u8')) {
      proxyRes.headers['content-type'] = 'application/vnd.apple.mpegurl';
    }
    // Remove headers that might expose the original server
    delete proxyRes.headers['x-powered-by'];
    delete proxyRes.headers['server'];

    // Transform m3u8 content to rewrite relative URLs
    if (req.url.endsWith('.m3u8')) {
      const transform = new Transform({
        transform(chunk, encoding, callback) {
          let data = chunk.toString();
          // Rewrite relative URLs to point to the proxy
          data = data.replace(
            /(^|\n)([^#].*?\.m3u8)/g,
            `$1https://${req.headers.host}/superstacja/$2`
          );
          callback(null, data);
        },
      });
      proxyRes.pipe(transform).pipe(res);
    }
  },
  onError: (err, req, res) => {
    console.error('Proxy error:', err);
    res.status(500).send('Proxy error');
  },
}));

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
