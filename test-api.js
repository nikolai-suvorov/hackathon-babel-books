// Test the story creation API
const testStoryCreation = async () => {
  try {
    console.log('🔄 Testing story creation API...');
    
    const response = await fetch('http://localhost:3001/api/stories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: 'A brave little fox who wants to learn to fly',
        childName: 'Emma',
        childAge: '3-4 years',
        childInterests: 'animals, flying, adventure',
        textLanguage: 'English',
        narrationLanguage: 'Spanish',
        tone: 'magical',
      }),
    });

    const data = await response.json();
    console.log('✅ Response:', data);
    
    if (data.storyId) {
      console.log(`\n📖 Story created! Visit: http://localhost:3001/stories/${data.storyId}`);
      
      // Test fetching the story
      console.log('\n🔄 Fetching story details...');
      const storyResponse = await fetch(`http://localhost:3001/api/stories?id=${data.storyId}`);
      const storyData = await storyResponse.json();
      console.log('📖 Story status:', storyData.status);
      console.log('📝 Story details:', {
        prompt: storyData.prompt,
        childName: storyData.childName,
        childAge: storyData.childAge,
        tone: storyData.tone,
      });
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
};

testStoryCreation();