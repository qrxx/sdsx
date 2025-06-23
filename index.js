const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

// Configure proxy middleware to forward requests
app.use('/superstacja/index.m3u8', createProxyMiddleware({
  target: 'http://145.239.19.149:9300/PL_SUPERSTACJA/index.m3u8',
  changeOrigin: true,
  pathRewrite: {
    '^/superstacja/index.m3u8': '', // Remove the path prefix
  },
  onProxyRes: (proxyRes) => {
    // Set appropriate content type for m3u8 playlist
    proxyRes.headers['content-type'] = 'application/vnd.apple.mpegurl';
    // Remove headers that might expose the original server
    delete proxyRes.headers['x-powered-by'];
    delete proxyRes.headers['server'];
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
