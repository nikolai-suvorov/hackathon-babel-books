const http = require('http');

async function makeRequest(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve(body);
        }
      });
    });
    
    req.on('error', reject);
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testS3Integration() {
  console.log('🚀 Testing BabelBooks with S3 Asset Storage\n');
  
  const storyData = {
    prompt: 'A friendly butterfly who loves to paint rainbows',
    childName: 'Maya',
    childAge: '3-4 years',
    childInterests: 'butterflies, colors, art',
    textLanguage: 'English',
    narrationLanguage: 'English',
    tone: 'wholesome',
  };
  
  console.log('📝 Creating story that will use S3 for assets...');
  
  try {
    // Create story
    const createResponse = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/stories',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, storyData);
    
    console.log(`✅ Story created: ${createResponse.storyId}`);
    console.log(`🌐 View at: http://localhost:3000/stories/${createResponse.storyId}\n`);
    
    // Monitor progress
    console.log('⏳ Generating and uploading to S3...');
    let story = null;
    let lastStatus = '';
    
    for (let i = 0; i < 60; i++) {
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const status = await makeRequest({
        hostname: 'localhost',
        port: 3000,
        path: `/api/stories?id=${createResponse.storyId}`,
        method: 'GET',
      });
      
      if (status.status !== lastStatus) {
        console.log(`   Status: ${status.status}`);
        lastStatus = status.status;
      }
      
      if (status.status === 'completed') {
        story = status;
        break;
      } else if (status.status === 'failed') {
        console.log(`\n❌ Generation failed: ${status.error || 'Unknown error'}`);
        return;
      }
    }
    
    if (!story) {
      console.log('\n⏱️ Timeout');
      return;
    }
    
    console.log('\n✅ Story generated successfully!\n');
    
    // Analyze S3 integration
    console.log('📊 S3 Asset Storage Analysis:');
    console.log(`   Title: "${story.story.title}"`);
    console.log(`   Pages: ${story.story.pages.length}`);
    
    // Check each page for S3 URLs
    let s3ImageCount = 0;
    let s3AudioCount = 0;
    
    story.story.pages.forEach(page => {
      console.log(`\n   Page ${page.pageNumber}:`);
      
      if (page.image) {
        if (page.image.url) {
          console.log(`     📸 Image: ✅ S3 URL`);
          console.log(`        URL: ${page.image.url}`);
          console.log(`        Key: ${page.image.key}`);
          s3ImageCount++;
        } else if (page.image.imageData) {
          console.log(`     📸 Image: ⚠️  Base64 (not S3)`);
        }
      }
      
      if (page.audio) {
        if (page.audio.url) {
          console.log(`     🔊 Audio: ✅ S3 URL`);
          console.log(`        URL: ${page.audio.url}`);
          console.log(`        Key: ${page.audio.key}`);
          s3AudioCount++;
        } else if (page.audio.audioData) {
          console.log(`     🔊 Audio: ⚠️  Base64 (not S3)`);
        }
      }
    });
    
    console.log(`\n📈 S3 Storage Summary:`);
    console.log(`   Images stored in S3: ${s3ImageCount}/${story.story.pages.length}`);
    console.log(`   Audio stored in S3: ${s3AudioCount}/${story.story.pages.length}`);
    
    console.log(`\n🎉 Visit: http://localhost:3000/stories/${createResponse.storyId}`);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

testS3Integration();