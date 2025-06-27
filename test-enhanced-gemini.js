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

async function testEnhancedGemini() {
  console.log('🚀 Testing Enhanced Gemini Integration\n');
  
  const storyData = {
    prompt: 'A happy starfish who lives in a coral reef and makes friends with colorful fish',
    childName: 'Luna',
    childAge: '3-4 years',
    childInterests: 'ocean animals, colors, friendship',
    textLanguage: 'English',
    narrationLanguage: 'English',
    tone: 'wholesome',
  };
  
  console.log('📝 Creating story with safe, wholesome content...');
  
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
    console.log('⏳ Generating with enhanced Gemini integration...');
    let story = null;
    let lastStatus = '';
    
    for (let i = 0; i < 60; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
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
    
    // Analyze results
    console.log('📊 Analysis:');
    console.log(`   Title: "${story.story.title}"`);
    console.log(`   Pages: ${story.story.pages.length}`);
    
    // Check each page
    let imageCount = 0;
    let audioCount = 0;
    
    story.story.pages.forEach(page => {
      if (page.image?.imageData) {
        imageCount++;
        // Check if it's a real image
        const header = Buffer.from(page.image.imageData.substring(0, 30), 'base64').toString('hex');
        if (header.startsWith('89504e47')) {
          console.log(`   Page ${page.pageNumber}: ✅ PNG image (enhanced)`);
        } else {
          console.log(`   Page ${page.pageNumber}: 📝 Generated placeholder`);
        }
      }
      
      if (page.audio?.audioData) {
        audioCount++;
      }
    });
    
    console.log(`\n📸 Images: ${imageCount}/${story.story.pages.length}`);
    console.log(`🔊 Audio: ${audioCount}/${story.story.pages.length}`);
    
    console.log(`\n🎉 Visit: http://localhost:3000/stories/${createResponse.storyId}`);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

testEnhancedGemini();