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

async function testFinalStory() {
  console.log('🎨 Creating a new story with updated image and audio...\n');
  
  const storyData = {
    prompt: 'A brave little fox who discovers a magical forest',
    childName: 'Emma',
    childAge: '4-5 years',
    childInterests: 'animals, nature, magic',
    textLanguage: 'English',
    narrationLanguage: 'Spanish',
    tone: 'magical',
  };
  
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
    console.log(`\n🌐 Open in browser: http://localhost:3000/stories/${createResponse.storyId}`);
    console.log('\n⏳ Generating story (this takes about 30-60 seconds)...');
    
    // Wait for completion
    let attempts = 0;
    while (attempts < 60) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const status = await makeRequest({
        hostname: 'localhost',
        port: 3000,
        path: `/api/stories?id=${createResponse.storyId}`,
        method: 'GET',
      });
      
      process.stdout.write(`\r   Status: ${status.status || 'pending'}`);
      
      if (status.status === 'completed') {
        console.log('\n\n✅ Story generated successfully!');
        console.log(`\n📖 Title: ${status.story.title}`);
        
        // Check first page
        const firstPage = status.story.pages[0];
        console.log('\n📄 First Page:');
        console.log(`   Text: "${firstPage.text.substring(0, 80)}..."`);
        console.log(`   Image: ${firstPage.image?.imageData ? 'Generated (' + firstPage.image.imageData.length + ' chars)' : 'Missing'}`);
        console.log(`   Audio: ${firstPage.audio?.audioData ? 'Generated (' + firstPage.audio.duration + 's)' : 'Missing'}`);
        
        console.log(`\n🎉 View your story at: http://localhost:3000/stories/${createResponse.storyId}`);
        console.log('\n📱 Test the following:');
        console.log('   1. Images should display (colored placeholders with text)');
        console.log('   2. Click audio play button (shows alert with narration info)');
        console.log('   3. Navigate between pages with arrow keys or buttons');
        console.log('   4. Check language indicators (English text, Spanish narration)');
        
        break;
      } else if (status.status === 'failed') {
        console.log(`\n❌ Failed: ${status.error}`);
        break;
      }
      
      attempts++;
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

testFinalStory();