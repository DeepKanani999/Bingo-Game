const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/lib/bollywood-data.ts');

async function searchWikipediaImage(title) {
  const url = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(title + ' film')}&gsrlimit=1&prop=pageimages&piprop=original&pilicense=any&format=json&origin=*`;
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
  };

  try {
    const response = await fetch(url, { headers });
    if (response.status === 429) {
      console.log(`429 Too Many Requests. Waiting 15 seconds...`);
      await new Promise(resolve => setTimeout(resolve, 15000));
      return { status: 429 };
    }
    if (!response.ok) {
      console.error(`HTTP error for ${title}: ${response.status}`);
      return null;
    }
    const data = await response.json();
    if (data.query && data.query.pages) {
      const pages = data.query.pages;
      for (const key in pages) {
        if (pages[key].original && pages[key].original.source) {
          return { url: pages[key].original.source };
        }
      }
    }
  } catch (err) {
    console.error(`Error fetching image for ${title}:`, err);
  }
  return null;
}

async function run() {
  console.log('Starting movie poster fetch script...');
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  let updatedCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('{ id: "bw') && line.includes('imageUrl: "https://images.unsplash.com')) {
      const titleMatch = line.match(/title: "([^"]+)"/);
      if (titleMatch) {
        const title = titleMatch[1];
        console.log(`\nFetching image for: ${title}...`);
        
        let imgResult = null;
        let retries = 3;
        
        while (retries > 0 && !imgResult) {
          const res = await searchWikipediaImage(title);
          if (res && res.status === 429) {
            console.log(`Retrying after 429...`);
            continue; // Retry without decrementing count, as it waited inside searchWikipediaImage
          }
          if (res && res.url) {
            imgResult = res.url;
          } else {
            retries--;
            if (retries > 0) {
              console.log(`Failed. Waiting 5 seconds before retry... (${retries} left)`);
              await new Promise(resolve => setTimeout(resolve, 5000));
            }
          }
        }

        if (imgResult) {
          console.log(`Found: ${imgResult}`);
          lines[i] = line.replace(/imageUrl: "[^"]*"/, `imageUrl: "${imgResult}"`);
          updatedCount++;
          
          // Write incrementally every success
          fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
          console.log(`Updated "${title}" in bollywood-data.ts`);
        } else {
          console.log(`No image found for: ${title}`);
        }
        
        // Delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
  
  console.log(`\nFinished fetch-images script! Updated ${updatedCount} items.`);
}

run();
