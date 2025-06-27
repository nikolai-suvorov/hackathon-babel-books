// Test story creation with Gemini API
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

async function testGeminiFlow() {
  console.log('🤖 Testing story creation with Gemini API...\n');
  
  // Create multiple test stories with different parameters
  const testStories = [
    {
      prompt: 'A curious cat who discovers a magical garden',
      childName: 'Luna',
      childAge: '3-4 years',
      childInterests: 'cats, nature, magic',
      textLanguage: 'English',
      narrationLanguage: 'English',
      tone: 'magical',
    },
    {
      prompt: 'A baby elephant learning to trumpet',
      childName: 'Baby',
      childAge: '0-6 months',
      childInterests: 'animals, sounds',
      textLanguage: 'English',
      narrationLanguage: 'English',
      tone: 'playful',
    },
    {
      prompt: 'Two best friends build a spaceship from cardboard',
      childName: 'Max',
      childAge: '4-5 years',
      childInterests: 'space, building, friendship',
      textLanguage: 'English',
      narrationLanguage: 'Spanish',
      tone: 'adventurous',
    }
  ];
  
  for (let i = 0; i < testStories.length; i++) {
    const storyData = testStories[i];
    console.log(`\n📖 Test ${i + 1}: ${storyData.prompt}`);
    console.log(`   For: ${storyData.childName} (${storyData.childAge})`);
    console.log(`   Tone: ${storyData.tone}`);
    
    try {
      // Create story
      const createOptions = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/stories',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      };
      
      const createResponse = await makeRequest(createOptions, storyData);
      
      if (!createResponse.storyId) {
        console.error('   ❌ Failed to create story');
        continue;
      }
      
      console.log(`   ✅ Story created: ${createResponse.storyId}`);
      
      // Poll for completion
      let attempts = 0;
      const maxAttempts = 60; // 60 seconds timeout
      let completed = false;
      
      while (attempts < maxAttempts && !completed) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const getOptions = {
          hostname: 'localhost',
          port: 3000,
          path: `/api/stories?id=${createResponse.storyId}`,
          method: 'GET',
        };
        
        const story = await makeRequest(getOptions);
        
        if (story.status === 'completed') {
          completed = true;
          console.log('   ✅ Story generated successfully!');
          console.log(`   📚 Title: ${story.story?.title}`);
          console.log(`   📄 Pages: ${story.story?.pages?.length}`);
          console.log(`   🔗 View at: http://localhost:3000/stories/${createResponse.storyId}`);
          
          // Show first page preview
          if (story.story?.pages?.[0]) {
            console.log(`   📝 Preview: "${story.story.pages[0].text.substring(0, 100)}..."`);
          }
        } else if (story.status === 'failed') {
          completed = true;
          console.log('   ❌ Story generation failed');
          console.log(`   Error: ${story.error || 'Unknown error'}`);
        } else if (attempts % 5 === 0) {
          console.log(`   ⏳ Status: ${story.status} (${attempts}s elapsed)`);
        }
        
        attempts++;
      }
      
      if (!completed) {
        console.log('   ⏱️ Timeout after 60 seconds');
      }
      
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
    }
  }
  
  console.log('\n\n✨ Test complete!');
}

// Run the test
testGeminiFlow();