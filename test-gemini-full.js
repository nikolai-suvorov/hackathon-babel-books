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

async function testGeminiFullIntegration() {
  console.log('🚀 Testing BabelBooks with Latest Gemini Models\n');
  console.log('📋 Configuration:');
  console.log('   - Text Generation: Gemini 2.5 Flash');
  console.log('   - Image Generation: Gemini 2.0 Flash Image Generation (Experimental)');
  console.log('   - Audio/TTS: Gemini 2.5 Flash TTS\n');
  
  const storyData = {
    prompt: 'A little starfish who dreams of touching the moon',
    childName: 'Stella',
    childAge: '4-5 years',
    childInterests: 'ocean, stars, adventure',
    textLanguage: 'English',
    narrationLanguage: 'Spanish',
    tone: 'magical',
  };
  
  console.log('📝 Story Request:');
  console.log(`   Prompt: "${storyData.prompt}"`);
  console.log(`   For: ${storyData.childName}, ${storyData.childAge}`);
  console.log(`   Languages: ${storyData.textLanguage} text, ${storyData.narrationLanguage} narration\n`);
  
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
    
    // Poll for completion
    console.log('⏳ Generating with Gemini models...');
    let story = null;
    let attempts = 0;
    const maxAttempts = 90; // 3 minutes max
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const status = await makeRequest({
        hostname: 'localhost',
        port: 3000,
        path: `/api/stories?id=${createResponse.storyId}`,
        method: 'GET',
      });
      
      process.stdout.write(`\r   ${status.status || 'pending'} (${attempts * 2}s)`);
      
      if (status.status === 'completed') {
        story = status;
        break;
      } else if (status.status === 'failed') {
        console.log(`\n\n❌ Generation failed: ${status.error || 'Unknown error'}`);
        return;
      }
      
      attempts++;
    }
    
    if (!story) {
      console.log('\n\n⏱️ Timeout after 3 minutes');
      return;
    }
    
    console.log('\n\n✅ Story generated successfully!\n');
    
    // Analyze results
    console.log('📊 Generation Results:');
    console.log(`   Title: "${story.story.title}"`);
    console.log(`   Pages: ${story.story.pages.length}`);
    
    // Check first page details
    const firstPage = story.story.pages[0];
    console.log('\n📄 First Page Analysis:');
    console.log(`   Text: "${firstPage.text.substring(0, 100)}..."`);
    
    // Image check
    if (firstPage.image?.imageData) {
      const imageSize = firstPage.image.imageData.length;
      console.log(`   Image: ✅ Generated (${imageSize} chars)`);
      
      // Check if it's a real image or placeholder
      try {
        // Decode first few bytes to check if it's a valid image
        const imageHeader = Buffer.from(firstPage.image.imageData.substring(0, 30), 'base64').toString('hex');
        if (imageHeader.startsWith('89504e47')) {
          console.log('          Type: PNG image');
        } else if (imageHeader.startsWith('ffd8ff')) {
          console.log('          Type: JPEG image');
        } else {
          console.log('          Type: Unknown format');
        }
      } catch (e) {
        console.log('          Type: Invalid image data');
      }
    } else {
      console.log('   Image: ❌ Missing');
    }
    
    // Audio check
    if (firstPage.audio?.audioData) {
      console.log(`   Audio: ✅ Generated (${firstPage.audio.duration}s)`);
      
      // Check if it's real audio or mock
      try {
        const audioDecoded = JSON.parse(Buffer.from(firstPage.audio.audioData, 'base64').toString());
        if (audioDecoded.type === 'mock_audio') {
          console.log('          Type: Mock audio (not real TTS)');
        }
      } catch {
        console.log('          Type: Real audio data');
      }
    } else {
      console.log('   Audio: ❌ Missing');
    }
    
    console.log(`\n🎉 Test complete! Visit: http://localhost:3000/stories/${createResponse.storyId}`);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

testGeminiFullIntegration();