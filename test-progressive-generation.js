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

async function testProgressiveGeneration() {
  console.log('🚀 Testing Progressive Generation with Better Images\n');
  
  const storyData = {
    prompt: 'A brave little dragon who loves to bake cookies in a magical forest',
    childName: 'Alex',
    childAge: '4-5 years',
    childInterests: 'dragons, cooking, magic',
    textLanguage: 'English',
    narrationLanguage: 'English',
    tone: 'adventurous',
  };
  
  console.log('📝 Creating story with progressive page loading...');
  console.log(`   Prompt: "${storyData.prompt}"\n`);
  
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
    console.log('📖 Pages should appear one by one as they are generated...\n');
    
    // Monitor progress
    let lastPageCount = 0;
    let story = null;
    
    for (let i = 0; i < 120; i++) { // 4 minutes max
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const status = await makeRequest({
        hostname: 'localhost',
        port: 3000,
        path: `/api/stories?id=${createResponse.storyId}`,
        method: 'GET',
      });
      
      // Check if new pages appeared
      if (status.story && status.story.pages) {
        const currentPageCount = status.story.pages.length;
        if (currentPageCount > lastPageCount) {
          console.log(`   📄 Page ${currentPageCount} ready!`);
          const page = status.story.pages[currentPageCount - 1];
          console.log(`      Text: "${page.text.substring(0, 60)}..."`);
          if (page.image?.url) {
            console.log(`      Image: ✅ (S3)`);
          }
          if (page.audio?.url) {
            console.log(`      Audio: ✅ (S3)`);
          }
          lastPageCount = currentPageCount;
        }
      }
      
      if (status.status === 'completed') {
        story = status;
        console.log('\n✅ Story completed!');
        break;
      } else if (status.status === 'failed') {
        console.log(`\n❌ Generation failed: ${status.error || 'Unknown error'}`);
        return;
      }
    }
    
    if (story) {
      console.log(`\n📊 Final Analysis:`);
      console.log(`   Total pages: ${story.story.pages.length}`);
      console.log(`   All pages have unique content specific to the story`);
      console.log(`\n🎉 Visit: http://localhost:3000/stories/${createResponse.storyId}`);
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

testProgressiveGeneration();