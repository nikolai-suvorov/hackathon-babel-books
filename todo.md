# BabelBooks Development Todo List

## 🎯 Initial Setup & Implementation Plan

### Phase 0: Project Setup (Current Sprint)
- [ ] Create Next.js 14 app with TypeScript (using app router)
- [ ] Setup project structure for Render.com deployment
- [ ] Create worker directory structure for background processing
- [ ] Create .env.example with all required variables
- [ ] Configure MongoDB Atlas connection
- [ ] Setup basic landing page
- [ ] Create render.yaml with web + worker services
- [ ] Initialize git and create .gitignore

### Phase 1: Minimal Story Creation Flow
- [ ] Create story prompt input form
- [ ] Add age selection dropdown
- [ ] Add tone selection with basic options
- [ ] Create mock story generation (hardcoded response)
- [ ] Display generated story text
- [ ] Add basic page navigation

### Phase 2: API Routes & Background Worker Setup
- [ ] Create /api/stories/create route (initiates job)
- [ ] Create /api/stories/[id]/status route (polling)
- [ ] Setup basic worker/index.ts file
- [ ] Create job processing loop in worker
- [ ] Add MongoDB collections (stories, jobs)
- [ ] Test job creation and status polling

### Phase 3: AI Integration (Gemini)
- [ ] Setup Gemini SDK in lib/gemini.ts
- [ ] Create story generation prompt templates
- [ ] Integrate text generation in worker
- [ ] Add basic content filtering
- [ ] Update story status during generation
- [ ] Add progress indicators in UI

### Phase 4: Basic UI Polish
- [ ] Apply color scheme from PRD
- [ ] Add typography (Fredoka, Nunito Sans)
- [ ] Create responsive layout
- [ ] Add loading states
- [ ] Basic animations

### Phase 5: Image Generation
- [ ] Setup Gemini image generation in lib/gemini.ts
- [ ] Create image prompts from story pages
- [ ] Upload generated images to S3
- [ ] Display images with story pages
- [ ] Add S3 URLs to story data

### Phase 6: User Authentication
- [ ] Setup NextAuth.js with credentials provider
- [ ] Create login/signup pages
- [ ] Add MongoDB user collection
- [ ] Protect story creation behind login
- [ ] Add user session to story creation

### Phase 7: Story Persistence
- [ ] Create MongoDB story schema
- [ ] Save stories to MongoDB Atlas
- [ ] Create story library view
- [ ] Add story retrieval by user
- [ ] Implement story pagination

### Phase 8: Audio Features
- [ ] Research TTS options
- [ ] Add basic narration
- [ ] Create audio controls
- [ ] Support play/pause

---

## 📝 Development Guidelines
1. **Keep it simple** - Every feature should be minimal viable
2. **Iterate quickly** - Get something working, then improve
3. **Test manually first** - Automated tests can come later
4. **Use existing libraries** - Don't reinvent the wheel
5. **Configuration over code** - Make things easy to change

---

## 🔍 Review Section
*To be updated as tasks are completed*

### Completed Tasks
- [x] Created Next.js 14 app with TypeScript and app router
- [x] Set up Docker configuration with MongoDB, LocalStack (S3), and Stripe mock
- [x] Created project directory structure
- [x] Configured environment variables (.env.local and .env.example)
- [x] Created basic landing page with PRD styling
- [x] Tested Docker services - all working correctly
- [x] Updated architecture to use Python for worker service
- [x] Created Python worker with FastAPI
- [x] Set up processors for story, image, and audio generation
- [x] Added content filtering for child safety
- [x] Configured Docker for Python worker
- [x] Tested Python worker - running successfully
- [x] Implemented story creation form with all PRD fields
- [x] Created story display page with page navigation
- [x] Added keyboard navigation (arrow keys)
- [x] Tested complete flow - working with mock data

### Key Decisions Made
- Using Next.js 14 with app router for full-stack development
- Deploying web service + background worker on Render.com
- Background processing for async story generation
- MongoDB as job queue (no separate queue service needed)
- Using managed services: MongoDB Atlas, Gemini API, Stripe, AWS S3
- NextAuth.js for authentication instead of separate auth service
- Frontend polls for status updates during generation

### Challenges Encountered
- (Any blockers or issues will be noted here)

### Next Steps
- Connect frontend to backend API routes
- Replace mock data with real API calls
- Implement real story generation using Gemini
- Add user authentication
- Store stories in MongoDB