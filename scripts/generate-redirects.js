const https = require('https');
const fs = require('fs');
const path = require('path');

async function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function generateRedirects() {
  console.log('Fetching WordPress posts...');

  // Fetch posts from WordPress REST API
  const posts = await fetchJson('https://earn.tapza.site/wp-json/wp/v2/posts?per_page=100&_embed');

  // Create public directory
  const publicDir = path.join(__dirname, '..', 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  console.log(`Found ${posts.length} posts. Generating HTML files...`);

  // Generate HTML for each post
  for (const post of posts) {
    const slug = post.slug;
    const title = post.title.rendered.replace(/"/g, '&quot;');
    const excerpt = post.excerpt.rendered.replace(/<[^>]*>/g, '').replace(/"/g, '&quot;').substring(0, 200);

    // Get featured image
    let image = 'https://earn.tapza.site/wp-content/uploads/default-image.jpg';
    if (post._embedded && post._embedded['wp:featuredmedia']) {
      image = post._embedded['wp:featuredmedia'][0].source_url;
    }

    const wpUrl = post.link;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <!-- Open Graph Meta Tags for Facebook -->
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${excerpt}" />
  <meta property="og:image" content="${image}" />
  <meta property="og:url" content="https://dainty-kheer-4cc17f.netlify.app/${slug}.html" />
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="Tapza" />
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${excerpt}">
  <meta name="twitter:image" content="${image}">
  
  <!-- Conditional redirect - only for human users, not bots -->
  <script>
    // Check if it's a bot/crawler
    var userAgent = navigator.userAgent.toLowerCase();
    var isCrawler = /bot|crawler|spider|facebookexternalhit|twitterbot|pinterest|whatsapp/i.test(userAgent);
    
    // Only redirect if NOT a crawler
    if (!isCrawler) {
      window.location.href = "${wpUrl}";
    }
  </script>
  
  <title>${title}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    .container {
      text-align: center;
      padding: 2rem;
    }
    a {
      color: white;
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>${title}</h1>
    <p>${excerpt}</p>
    <p><a href="${wpUrl}">Click here to read this article</a></p>
  </div>
</body>
</html>`;

    const filename = path.join(publicDir, `${slug}.html`);
    fs.writeFileSync(filename, html);
    console.log(`✓ Generated: ${slug}.html`);

    // Generate image-only version for large clickable images on Facebook
    const imageOnlyHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <!-- Minimal title (Facebook requires it but won't show prominently) -->
  <meta property="og:title" content=" " />
  
  <!-- Large image configuration -->
  <meta property="og:image" content="${image}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:type" content="image/jpeg" />
  
  <!-- URL points to this Netlify page -->
  <meta property="og:url" content="https://dainty-kheer-4cc17f.netlify.app/${slug}-img.html" />
  
  <!-- Website type for large image display -->
  <meta property="og:type" content="website" />
  
  <!-- No description for cleaner look -->
  
  <!-- Twitter Card for large image -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:image" content="${image}">
  
  <!-- Conditional redirect - only for human users, not bots -->
  <script>
    // Check if it's a bot/crawler
    var userAgent = navigator.userAgent.toLowerCase();
    var isCrawler = /bot|crawler|spider|facebookexternalhit|twitterbot|pinterest|whatsapp/i.test(userAgent);
    
    // Only redirect if NOT a crawler
    if (!isCrawler) {
      window.location.href = "${wpUrl}";
    }
  </script>
  
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: #000;
    }
    img {
      max-width: 100%;
      height: auto;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <img src="${image}" alt="${title}" onclick="window.location.href='${wpUrl}'">
</body>
</html>`;

    const imageFilename = path.join(publicDir, `${slug}-img.html`);
    fs.writeFileSync(imageFilename, imageOnlyHtml);
    console.log(`✓ Generated: ${slug}-img.html (image-only)`);
  }

  // Create index.html (homepage redirect)
  const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta property="og:title" content="Tapza - WordPress Social Preview" />
  <meta property="og:description" content="Share WordPress posts with rich previews" />
  <meta property="og:image" content="https://earn.tapza.site/wp-content/uploads/default-image.jpg" />
  <title>WordPress Social Preview</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    .container {
      max-width: 600px;
      text-align: center;
    }
    h1 { font-size: 2.5rem; margin-bottom: 1rem; }
    p { font-size: 1.2rem; opacity: 0.9; }
    .info {
      background: rgba(255,255,255,0.1);
      padding: 2rem;
      border-radius: 12px;
      margin-top: 2rem;
      text-align: left;
    }
    code {
      background: rgba(0,0,0,0.3);
      padding: 2px 8px;
      border-radius: 4px;
      font-family: monospace;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚀 WordPress Social Preview</h1>
    <p>Share your WordPress posts with beautiful previews on social media!</p>
    <div class="info">
      <h3>How to use:</h3>
      <ol>
        <li>Get your WordPress post slug (e.g., "hello-world")</li>
        <li>Share: <code>https://dainty-kheer-4cc17f.netlify.app/your-slug.html</code></li>
        <li>Facebook shows preview ✓</li>
        <li>Users get redirected to WordPress ✓</li>
      </ol>
    </div>
  </div>
</body>
</html>`;

  fs.writeFileSync(path.join(publicDir, 'index.html'), indexHtml);
  console.log(`✓ Generated: index.html`);

  console.log(`\n✅ Done! Generated ${posts.length + 1} HTML files in public/`);
}

generateRedirects().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
