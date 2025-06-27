// Test the complete story creation flow
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

async function testFlow() {
  console.log('🚀 Testing complete story creation flow...\n');
  
  // 1. Create a story
  console.log('1️⃣ Creating a new story...');
  const createOptions = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/stories',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  const storyData = {
    prompt: 'A friendly dragon who loves to paint rainbows',
    childName: 'Sofia',
    childAge: '3-4 years',
    childInterests: 'dragons, art, colors',
    textLanguage: 'English',
    narrationLanguage: 'English',
    tone: 'magical',
  };
  
  try {
    const createResponse = await makeRequest(createOptions, storyData);
    console.log('✅ Story created:', createResponse);
    
    if (!createResponse.storyId) {
      console.error('❌ No story ID returned');
      return;
    }
    
    // 2. Poll for story completion
    console.log('\n2️⃣ Checking story status...');
    const storyId = createResponse.storyId;
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds timeout
    
    const checkStory = async () => {
      const getOptions = {
        hostname: 'localhost',
        port: 3000,
        path: `/api/stories?id=${storyId}`,
        method: 'GET',
      };
      
      const story = await makeRequest(getOptions);
      console.log(`   Status: ${story.status}`);
      
      if (story.status === 'completed') {
        console.log('\n✅ Story generation completed!');
        console.log('📖 Story details:');
        console.log(`   Title: ${story.story?.title || 'N/A'}`);
        console.log(`   Pages: ${story.story?.pages?.length || 0}`);
        if (story.story?.pages?.[0]) {
          console.log(`   First page: ${story.story.pages[0].text.substring(0, 100)}...`);
        }
        console.log(`\n🌐 View your story at: http://localhost:3000/stories/${storyId}`);
      } else if (story.status === 'failed') {
        console.log('\n❌ Story generation failed');
        console.log(`   Error: ${story.error || 'Unknown error'}`);
      } else if (attempts < maxAttempts) {
        attempts++;
        setTimeout(checkStory, 1000); // Check again in 1 second
      } else {
        console.log('\n⏱️ Timeout: Story generation took too long');
      }
    };
    
    await checkStory();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the test
testFlow();