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

async function testFrontendFlow() {
  console.log('🚀 Testing complete BabelBooks flow with Docker deployment\n');
  
  const storyData = {
    prompt: 'A curious cat who discovers a magic paintbrush',
    childName: 'Luna',
    childAge: '3-4 years',
    childInterests: 'cats, art, magic',
    textLanguage: 'English',
    narrationLanguage: 'Spanish',
    tone: 'magical',
  };
  
  console.log('📝 Creating story with the following details:');
  console.log(`   Prompt: ${storyData.prompt}`);
  console.log(`   Child: ${storyData.childName}, ${storyData.childAge}`);
  console.log(`   Languages: Text in ${storyData.textLanguage}, Narration in ${storyData.narrationLanguage}`);
  console.log(`   Tone: ${storyData.tone}\n`);
  
  try {
    // Create story via API
    console.log('1️⃣ Sending story creation request...');
    const createResponse = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/stories',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, storyData);
    
    if (!createResponse.storyId) {
      console.log('❌ Failed to create story:', createResponse);
      return;
    }
    
    console.log(`✅ Story created with ID: ${createResponse.storyId}\n`);
    
    // Poll for completion
    console.log('2️⃣ Waiting for story generation...');
    let story = null;
    let attempts = 0;
    const maxAttempts = 60;
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const getResponse = await makeRequest({
        hostname: 'localhost',
        port: 3000,
        path: `/api/stories?id=${createResponse.storyId}`,
        method: 'GET',
      });
      
      process.stdout.write(`\r   Status: ${getResponse.status || 'pending'} (${attempts * 2}s)`);
      
      if (getResponse.status === 'completed') {
        story = getResponse;
        break;
      } else if (getResponse.status === 'failed') {
        console.log(`\n❌ Story generation failed: ${getResponse.error}`);
        return;
      }
      
      attempts++;
    }
    
    if (!story) {
      console.log('\n⏱️ Timeout after 2 minutes');
      return;
    }
    
    console.log('\n✅ Story generated successfully!\n');
    
    // Display results
    console.log('3️⃣ Story Details:');
    console.log(`   📖 Title: ${story.story.title}`);
    console.log(`   📄 Pages: ${story.story.pages.length}`);
    console.log(`   🎭 Tone: ${story.tone}`);
    console.log(`   🌐 Languages: ${story.textLanguage} (text), ${story.narrationLanguage} (narration)\n`);
    
    // Check features
    console.log('4️⃣ Feature Status:');
    
    // Text generation
    const hasText = story.story.pages.every(page => page.text && page.text.length > 0);
    console.log(`   ✅ Text Generation: ${hasText ? 'Working' : 'Failed'}`);
    
    // Image generation
    const hasImages = story.story.pages.every(page => page.image?.imageData);
    console.log(`   ✅ Image Generation: ${hasImages ? 'Working' : 'Failed'}`);
    
    // Audio narration
    const hasAudio = story.story.pages.every(page => page.audio?.audioData);
    console.log(`   ✅ Audio Narration: ${hasAudio ? 'Working (Mock)' : 'Failed'}`);
    
    // Interactive elements
    const hasInteractive = story.story.pages.some(page => page.interactiveElement);
    console.log(`   ✅ Interactive Elements: ${hasInteractive ? 'Working' : 'Not found'}`);
    
    // Sample page content
    console.log('\n5️⃣ Sample Page Content:');
    const samplePage = story.story.pages[0];
    console.log(`   Page 1 Text: "${samplePage.text.substring(0, 100)}..."`);
    
    if (samplePage.audio?.audioData) {
      try {
        const audioData = JSON.parse(Buffer.from(samplePage.audio.audioData, 'base64').toString());
        console.log(`   Audio: ${audioData.type} (${audioData.duration}s, ${audioData.language})`);
      } catch {
        console.log(`   Audio: Real audio data`);
      }
    }
    
    console.log(`\n🎉 Success! View your story at: http://localhost:3000/stories/${createResponse.storyId}`);
    console.log('\n📱 Frontend Features:');
    console.log('   - Story pages with navigation');
    console.log('   - Generated images for each page');
    console.log('   - Audio play button for narration');
    console.log('   - Bilingual support (text/narration in different languages)');
    console.log('   - Age-appropriate content and styling');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

testFrontendFlow();