const http = require('http');

function makeRequest(options, data) {
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

async function testStoryWithImages() {
  console.log('🎨 Testing story creation with image generation...\n');
  
  const storyData = {
    prompt: 'A little bunny who loves to paint rainbows',
    childName: 'Emma',
    childAge: '3-4 years',
    childInterests: 'art, colors, animals',
    textLanguage: 'English',
    narrationLanguage: 'English',
    tone: 'magical',
  };
  
  console.log('📝 Story request:', storyData);
  
  try {
    // Create story
    const createResponse = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/stories',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, storyData);
    
    console.log('\n✅ Story created:', createResponse.storyId);
    
    // Poll for completion
    let story = null;
    let attempts = 0;
    const maxAttempts = 60;
    
    console.log('\n⏳ Generating story...');
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const getResponse = await makeRequest({
        hostname: 'localhost',
        port: 3000,
        path: `/api/stories?id=${createResponse.storyId}`,
        method: 'GET',
      });
      
      if (getResponse.status === 'completed') {
        story = getResponse;
        break;
      } else if (getResponse.status === 'failed') {
        console.log('\n❌ Story generation failed:', getResponse.error);
        return;
      }
      
      process.stdout.write(`\r⏳ Status: ${getResponse.status} (${attempts * 2}s)`);
      attempts++;
    }
    
    if (!story) {
      console.log('\n⏱️ Timeout after 2 minutes');
      return;
    }
    
    console.log('\n\n✅ Story generated successfully!');
    console.log(`\n📖 Title: ${story.story.title}`);
    console.log(`📄 Pages: ${story.story.pages.length}`);
    
    // Check images
    console.log('\n🖼️ Image Generation Status:');
    story.story.pages.forEach((page, index) => {
      if (page.image?.imageData) {
        console.log(`   Page ${index + 1}: ✅ Image generated (${page.image.imageData.length} chars)`);
        console.log(`   Prompt: ${page.imagePrompt.substring(0, 60)}...`);
      } else {
        console.log(`   Page ${index + 1}: ❌ No image`);
      }
    });
    
    console.log(`\n🌐 View story at: http://localhost:3000/stories/${createResponse.storyId}`);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

testStoryWithImages();