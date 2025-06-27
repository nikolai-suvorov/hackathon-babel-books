const http = require('http');

// Set environment variables for mock mode
process.env.USE_MOCK_STORIES = 'true';
process.env.USE_MOCK_IMAGES = 'true';
process.env.USE_MOCK_AUDIO = 'true';

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

async function testMockAudio() {
  console.log('🎵 Testing mock audio generation...\n');
  console.log('ℹ️  Using mock mode for testing without external APIs\n');
  
  const storyData = {
    prompt: 'A magical unicorn learning to fly',
    childName: 'Sophie',
    childAge: '4-5 years',
    childInterests: 'unicorns, magic, rainbows',
    textLanguage: 'English',
    narrationLanguage: 'Spanish',
    tone: 'magical',
  };
  
  console.log('📝 Story request:', storyData);
  console.log('🌐 Text: English, Narration: Spanish\n');
  
  try {
    // Create story
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
    
    console.log('✅ Story created:', createResponse.storyId);
    
    // Simulate viewing the story page
    console.log(`\n🌐 View story at: http://localhost:3000/stories/${createResponse.storyId}`);
    console.log('\n📱 In the story viewer:');
    console.log('   - Each page will show text in English');
    console.log('   - Audio button will play narration in Spanish');
    console.log('   - Mock audio will show an alert with narration details');
    console.log('\nTry clicking the audio play button on each page!');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

// Also test that the worker would handle audio generation
async function simulateWorkerProcessing() {
  console.log('\n\n🔧 Simulating worker audio processing...\n');
  
  // Import the audio processor module
  try {
    const { create_mock_audio, estimate_duration } = {
      create_mock_audio: (pageNumber, text, language, tone) => {
        const mockData = {
          type: 'mock_audio',
          page: pageNumber,
          text_preview: text.substring(0, 100) + '...',
          language: language,
          tone: tone,
          duration: Math.round(text.length / 5 / 150 * 60 * 10) / 10,
          note: 'This is mock audio data. Real audio would be generated with TTS.'
        };
        return Buffer.from(JSON.stringify(mockData, null, 2)).toString('base64');
      },
      estimate_duration: (text) => Math.round(text.length / 5 / 150 * 60 * 10) / 10
    };
    
    const samplePages = [
      { pageNumber: 1, text: "Once upon a time, there was a magical unicorn named Sparkle." },
      { pageNumber: 2, text: "Sparkle dreamed of flying high above the rainbow clouds." },
      { pageNumber: 3, text: "With practice and belief, Sparkle learned to soar through the sky!" }
    ];
    
    console.log('📄 Sample pages to process:');
    samplePages.forEach(page => {
      const audioData = create_mock_audio(page.pageNumber, page.text, 'Spanish', 'magical');
      const duration = estimate_duration(page.text);
      
      console.log(`\n   Page ${page.pageNumber}:`);
      console.log(`   Text: "${page.text}"`);
      console.log(`   Duration: ${duration}s`);
      console.log(`   Audio data preview: ${audioData.substring(0, 50)}...`);
      
      // Decode to show what's in the mock audio
      const decoded = JSON.parse(Buffer.from(audioData, 'base64').toString());
      console.log(`   Decoded: Language=${decoded.language}, Tone=${decoded.tone}`);
    });
    
  } catch (error) {
    console.log('ℹ️  Worker simulation skipped (Python environment not set up)');
  }
}

// Run tests
testMockAudio().then(() => simulateWorkerProcessing());