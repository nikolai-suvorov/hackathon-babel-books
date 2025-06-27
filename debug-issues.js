const fetch = require('node-fetch');

async function debugIssues() {
  console.log('=== Debugging Babel Books Issues ===\n');
  
  try {
    // 1. Check if API is running
    console.log('1. Checking API health...');
    const healthResponse = await fetch('http://localhost:3000/api/health');
    if (!healthResponse.ok) {
      console.log('❌ API health check failed:', healthResponse.status);
    } else {
      console.log('✅ API is running');
    }
    
    // 2. Get latest stories
    console.log('\n2. Fetching latest stories...');
    const storiesResponse = await fetch('http://localhost:3000/api/stories');
    if (!storiesResponse.ok) {
      console.log('❌ Failed to fetch stories:', storiesResponse.status);
      return;
    }
    
    const stories = await storiesResponse.json();
    console.log(`✅ Found ${stories.length} stories`);
    
    if (stories.length === 0) {
      console.log('No stories found. Please create a story first.');
      return;
    }
    
    // 3. Check the latest story
    const latestStory = stories[0];
    console.log(`\n3. Checking latest story: ${latestStory._id}`);
    console.log(`   Status: ${latestStory.status}`);
    console.log(`   Title: ${latestStory.story?.title || 'Not generated yet'}`);
    
    // 4. Check if story has pages with S3 URLs
    if (latestStory.story?.pages) {
      console.log(`\n4. Checking pages (${latestStory.story.pages.length} pages):`);
      
      latestStory.story.pages.slice(0, 3).forEach((page, index) => {
        console.log(`\n   Page ${page.pageNumber}:`);
        
        // Check image
        if (page.image) {
          if (page.image.url) {
            console.log(`   ✅ Image URL: ${page.image.url}`);
          } else if (page.image.imageData) {
            console.log(`   ⚠️  Image has base64 data (${page.image.imageData.length} chars)`);
          } else {
            console.log(`   ❌ No image data`);
          }
        } else {
          console.log(`   ❌ No image object`);
        }
        
        // Check audio
        if (page.audio) {
          if (page.audio.url) {
            console.log(`   ✅ Audio URL: ${page.audio.url}`);
          } else if (page.audio.audioData) {
            console.log(`   ⚠️  Audio has base64 data (${page.audio.audioData.length} chars)`);
          } else {
            console.log(`   ❌ No audio data`);
          }
        } else {
          console.log(`   ❌ No audio object`);
        }
      });
      
      // 5. Test S3 URL accessibility
      console.log('\n5. Testing S3 URL accessibility...');
      const firstPageWithImage = latestStory.story.pages.find(p => p.image?.url);
      if (firstPageWithImage) {
        try {
          const imageResponse = await fetch(firstPageWithImage.image.url);
          if (imageResponse.ok) {
            console.log(`✅ S3 image URL is accessible: ${imageResponse.status}`);
          } else {
            console.log(`❌ S3 image URL not accessible: ${imageResponse.status}`);
          }
        } catch (error) {
          console.log(`❌ Failed to fetch S3 image: ${error.message}`);
        }
      }
    }
    
    // 6. Check LocalStack S3
    console.log('\n6. Checking LocalStack S3...');
    try {
      const s3Response = await fetch('http://localhost:4566/babel-books-assets/');
      console.log(`LocalStack S3 response: ${s3Response.status}`);
    } catch (error) {
      console.log(`LocalStack S3 error: ${error.message}`);
    }
    
  } catch (error) {
    console.error('Error during debugging:', error);
  }
}

debugIssues();