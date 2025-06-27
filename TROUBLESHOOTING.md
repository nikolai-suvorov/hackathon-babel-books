# BabelBooks Troubleshooting Guide

## Issue: Images and Audio Not Working

### 1. Verify Image Display

Images are currently generated as colored placeholders with visual elements. To verify:

1. **Check Browser Console**:
   - Open Developer Tools (F12)
   - Look for any errors in Console tab
   - Check Network tab for failed image loads

2. **Test Direct Image URL**:
   - Visit http://localhost:3000/test
   - You should see a small test image
   - If this works, the image display code is functioning

3. **Check Story Data**:
   ```bash
   # Get story data and check if images exist
   curl -s "http://localhost:3000/api/stories?id=YOUR_STORY_ID" | jq '.story.pages[0].image'
   ```

### 2. Verify Audio Playback

Audio is currently using mock data that shows an alert when clicked.

1. **Test Audio Button**:
   - Click the play button on any story page
   - You should see an alert with audio information
   - Alert should show: "Playing narration for page X (Ys)"

2. **Check Audio Data**:
   ```bash
   # Verify audio data exists
   curl -s "http://localhost:3000/api/stories?id=YOUR_STORY_ID" | jq '.story.pages[0].audio'
   ```

### 3. Common Issues and Solutions

#### Images appear as broken icons:
- **Cause**: Base64 encoding issue
- **Solution**: Already fixed in latest update. Restart worker:
  ```bash
  docker compose restart worker
  ```

#### Audio button doesn't respond:
- **Cause**: JavaScript error or missing data
- **Check**: Browser console for errors
- **Solution**: The playAudio function should show an alert for mock audio

#### Story stuck in "generating" state:
- **Check worker logs**:
  ```bash
  docker logs babel-books-worker --tail 50
  ```
- **Solution**: Restart worker if needed

### 4. Create a Fresh Test Story

```bash
# Create new story
curl -X POST http://localhost:3000/api/stories \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Test story about a happy dog",
    "childName": "Test",
    "childAge": "3-4 years",
    "childInterests": "dogs",
    "textLanguage": "English",
    "narrationLanguage": "English",
    "tone": "funny"
  }'
```

### 5. Verify Services Are Running

```bash
# Check all services
docker ps

# Should show:
# - babel-books-worker
# - babel-books-mongo
# - babel-books-localstack
# - babel-books-stripe

# Check Next.js
ps aux | grep "npm run dev"
```

### 6. Latest Working Story URLs

- http://localhost:3000/stories/685ebed50af668229135f696 (Finnian Fox)
- http://localhost:3000/stories/685ebc6b0af668229135f690 (Clementine)
- http://localhost:3000/test (Component test page)

## Expected Behavior

### Images:
- Should display as colored rectangles (age-appropriate colors)
- Contains shapes and text overlay
- Size: 1024x768 pixels

### Audio:
- Click play button → shows alert with mock audio info
- Displays duration in seconds
- Shows language (e.g., Spanish for narration)

### Navigation:
- Arrow keys or buttons to move between pages
- Page indicators at bottom
- "The End!" message on last page

## Need More Help?

1. Check worker logs: `docker logs babel-books-worker -f`
2. Check Next.js logs: `tail -f /tmp/nextjs.log`
3. Visit test page: http://localhost:3000/test
4. Create fresh story and test immediately