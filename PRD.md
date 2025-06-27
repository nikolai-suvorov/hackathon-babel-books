# Product Requirements Document (PRD)

## **Overview**

BabelBooks is an educational storytelling platform for children aged 0–5 that transforms simple prompts into fully illustrated, interactive, and multilingual storybooks—readable on any device or printable as a keepsake. It's designed for families seeking meaningful screen time that supports early literacy, language learning, and imaginative play. (By the way, we might have to change the name of the product so make sure it's easy to switch out later)

---
## **Target Audience**

#### **Primary:**
* Parents of children aged 0–5
* Multilingual or multicultural families
* Households seeking educational screen-time alternatives
#### **Secondary:**
* Early childhood educators
* Speech therapists or language tutors
* Gift shoppers (e.g., grandparents, friends of new parents) \

---
## **Business Case & Monetization Strategy**

**Problem**: Parents struggle to find engaging, educational, screen-based content that supports language learning and fosters creativity.

**Solution**: AI Story Spinner blends personalization, interactivity, and multilingual storytelling to provide a one-of-a-kind reading experience that grows with a child.

**Revenue Streams**:
1. **Freemium Model**
    * Free tier: 3 custom stories per month
    * Paid tier: Unlimited stories, advanced customization (photo upload, more languages, print-ready format)
2. **Printing Services**
    * Print-on-demand partnerships to turn stories into hardcover books
3. **Gift Cards / Gifting**
    * "Create a storybook for a friend" gift feature
4. **Affiliate/Content Expansion**
    * Upsell additional educational content (e.g., language flashcards, games)
    * Partner with language learning brands or toy companies


---


## **MVP Features**

### **Prompt-Based Story Creation**

Allow parents to generate personalized, age-appropriate, multilingual stories using a guided input form. Stories will be tailored in tone, complexity, and interactivity, and rendered in the selected reading and narration languages.

* Base Prompt
    * Label: "What is your story about?"
        * Placeholder: "Zoe and her panda go to space"
    * Type: Text
    * Required: yes
    * Validation:
        - Minimum: 5 characters
    * Content filter: Reject vulgar, unsafe, racist, sexist, or adult content
    * Helper Text: "Try including your child's name or favorite characters!"
* Child's Age
    * Label: "Child's Age"
    * Type: Single Select
    * Required: yes
    * Options:
        - 0-6 months
        - 6-18 months
        - 1.5-3 years
        -  3-4 years
        - 4-5 years
    * Function: Maps to reading complexity, vocabulary, interactivity type, and length
* Tone
    * Label: "Tone of the story"
    * Type: Single Select
        - Add a randomize option that visually spins a wheel and picks a random tone
    * Required: yes
    * Options:
        - Funny
        - Magical
        - Scary (kid-appropriate)
        - Wholesome
        - Adventurous
* Primary Language
    * Label: "Story Language"
    * Type: Single Select
    * Required: yes
    * Options:
        - English
        - Spanish
        - French
        - German
        - Italian
        - Hindi
        - Marati
        - Russian
* Narration Language (Optional)
    * Label: "Narration Language (optional)"
    * Type: Select
    * Default: Same as Story Language
    * Options: Same as above
    * Helper Text: "Choose a different language to support bilingual learning"
* Submission Behavior
    * Click "Generate My Story" → disables button and shows loading spinner
    * The backend will turn that into an LLM instruction like: \
      System: You are a creative children's book author. Generate a short story appropriate for a child aged 5–6, with magical tone and educational elements around friendship and counting. Use the prompt: \
      "Zoe and her panda go to space" \
      Output 4–6 pages (approx. 80–120 words per page), each with a short title, main text, and an optional interactive cue (e.g. "Can you count the stars?"). \
      Write in English. The story will be narrated in Spanish.


### **Visual Story Generation**

Visuals are core to story comprehension and engagement for young children—especially pre-literate users. Every story page must feature a compelling, age-appropriate image that supports narrative comprehension, interaction, and emotional engagement.

* AI-generated illustrations: 
    * Use prompt-based image generation via Gemini (or similar model)
    * Input: Scene description derived from story text and character metadata
    * Output: Stylized, age-appropriate full-page illustrations
* Image Requirements:
    * Full-Bleed Layout: Each image fills the entire story page without borders
    * Narrative Reflection: Must visually depict key elements (e.g., main character, action, emotion)
    * Text-Minimal: Avoid embedded words or UI text to support multilingual overlays and translations
    * Image Metadata:
        - alt_text: One-liner for screen readers or audio narration
        - tags: List of keywords for visual indexing (e.g., "panda", "space", "hug")
* Interactivity Support:
    * Image Zones
        - Allow up to 2 tap targets per page (e.g., "Tap the moon!", "Where's the dog?")
        - Define tappable hotspots based on scene objects
    * Layering Structure
        - Layer 1: Background (setting/environment)
        - Layer 2: Characters (foreground)
        - Layer 3: Interactive Zones (transparent overlay with hitbox + animation/sound)
* Design Considerations by Age:
    * 0–12 mo: High contrast, bold shapes, simple faces
    * 12–24 mo: Bright colors, exaggerated expressions, familiar objects
    * 3-4 yrs: Playful animations, clear action cues
    * 4-5+ yrs: More detailed scenery, facial emotion, subtle visual gags
* Performance:
    * Preload Next Image: While reading page n, preload image for n+1 to eliminate perceptible lag
    * Image Size Constraints: Optimize resolution (~2048x1536 px) to balance fidelity and load time

### **Multilingual Narration Mode**

Support immersive bilingual reading by allowing stories to be displayed in one language while narrated in another. This feature promotes early language exposure and dual-language learning.

* Text Generation
    * Language Prompting: The story must be generated in the selected story language.
    * Prompt Template: "Write this story in [story_language]. The story will be narrated in [narration_language]."
    * Translation Avoidance: Narration is not a direct translation; it's a parallel auditory experience.
* Narration (TTS Integration)
    * Voice Service: Use a multilingual Text-to-Speech (TTS) API that supports child-friendly voices.
    * Voice Selection Rules:
        - Choose narration voice based on:
            - Selected *narration_language*
            - Target age group
    * Segmentation: Each story page's text is a separate TTS request → one audio file per page.
* UI Playback Controls
    * Play/Pause button
    * Volume slider
    * Optional Autoplay: automatically advance to the next page after narration ends
    * Navigation: tap to go forward/backward between pages
* Accessibility & UX
    * Language Display: \
      If text and narration differ, show a clear label or flag icon: \
      Example: "Text: 🇬🇧 English | Narration: 🇪🇸 Spanish"
    * Narration Toggle: Mute/unmute narration
    * Tooltip: "Narration is in a different language to help kids hear both!"

### **Interactive Moments**

Each story page can include up to 2 interactive hotspots — simple tap targets that invite engagement through sound, animation, or visual change.

* Supported Triggers
    * Sound effect    "Tap the duck to hear 'quack!'"
    * Animation    "Tap the balloon and it floats up"
    * Visual change    "Tap the moon and stars appear"
    * Mini-reaction    "Tap the frog and it jumps + giggles"
* Tap Target Configuration
    * Defined by:
        - Image overlays with coordinates (e.g., bounding boxes)
        - Or tagged image zones (e.g., SVG areas, div overlays)
* Limit: Max 2 interactions per page to avoid overload and preserve performance
* Responsive Design: Targets scale with image size to support various devices
* UX Feedback & Accessibility
    * Visual feedback: Sparkle burst or soft wiggle on activation
    * Tap guidance: Optional glowing outline or pulse effect on tappable elements (especially for 12–24 mo audience)
    * Fallback: Alt-text or tooltip-style label on long-press for screen readers or clarification

### **Visual + Audio Interactivity**

To create an immersive and magical reading experience, each story blends smooth animations with layered audio — simulating the charm of a physical picture book while enhancing it with music, narration, and interactive flourishes.

* Page Flip Animations
    * Requirements
        - Smooth transition between story "pages" — evokes the feel of a real book
        - Support both tap-to-turn and swipe gestures
    - Animation Styles
        - Flipbook-style: Simulates page curl (e.g., react-pageflip, rotateY() with CSS transforms)
        - Swipe-slide style: Horizontal slide transitions (e.g., Framer Motion, Swiper.js, react-spring)
    - Enhancements
        - Sound effect: Gentle page rustle on turn
        - Visual polish: Drop shadow at fold, subtle depth effect
        - Sequencing: Narration or character animation fades/slides in after page settles
- Background Music
    - Requirements
        - Looping ambient music that sets tone: whimsical, spooky, calm, etc.
        - Starts with story and can be toggled on/off by parent
    - Examples
        - Magical    Twinkly chimes + light harp
        - Funny    Bouncy xylophone + kazoo
        - Scary    Low strings, soft whooshes
        - Adventure    Drums + rhythmic bass
        - Calm    Soft piano or lullaby synth
    - Controls
        - Parent-accessible mute toggle (global)
        - Crossfade between tracks on page change
* Page-Level Integration Flow
    * Page loads
    * Page-turn animation plays (with soft rustle sound)
    * Background music fades in (if enabled)
    * Narration starts
    * Interactive elements become tappable (e.g., panda waves)

### **Parent Login + Story Library**

Let parents revisit and enjoy previously created stories without needing to re-generate them — supporting consistent re-reading and easier access to favorites.

* Parent Login Required
    * All save and replay features require a parent account
    * Email verification is required to complete account setup
    * No local device storage — stories are securely saved to the user's cloud library
* Social Login Options
    * Parents can sign up or log in using:
        * Google
        * Facebook
        * Apple
    * Social accounts are linked to a secure story library
* Soft Registration Gate (First Story Preview)
    * If a user is not logged in and tries to create a story:
        * They can enter prompts, age, tone, language as usual
        * The system generates the full story in the background
        * User is shown only the first page of the story
        * To unlock the rest:
            * "🔓 Create a free account to keep reading and save your story!"
    * After registration + email verification:
        * The full story is revealed
        * It is automatically saved to their story library
* Story Library
    * Logged-in users have access to a personal story dashboard
    * Each saved story includes:
        * Story title & creation prompt
        * Age group & tone
        * Full per-page content (text, images, audio)
    * Library Features:
        * "Continue Reading" prompt on login
        * View, play, or delete past stories
        * Tag favorites for quick access
* Replay Flow
    * On login, system surfaces most recent story
    * "Continue Reading" resumes where the user left off
    * Navigation and interactivity are fully preserved — no regeneration needed

---
## Design Guidelines

### **Responsive UI**

* Navigation: Touch & Swipe-Based Paging
    - ✅ Page Navigation Behavior
        - Default layout: One full-page story "slide" at a time (carousel or flipbook feel)
        - Swipe left/right (on mobile/tablet):
            - Left = Next page
            - Right = Previous page
        - Arrow buttons (fallback for desktop and accessibility):
            - Left/right chevrons
        - Keyboard navigation (optional):
            - Left/right arrow keys for desktop users
    - 🔧 Technical Options
        - Use a swipe/gesture library like:
            - React-swipeable
            - Framer Motion
            - Swiper.js (if you want snapping + pagination)
        - Add haptic feedback support on mobile (via vibrate())
- Layout Responsiveness
    - Mobile & Tablet (Touch-first):
        - Full-screen or near full-screen pages
        - Swipe gestures + large tap zones
        - Persistent "home" and "audio" buttons
    - Desktop (Click-first):
        - Click-to-advance navigation
        - Optional keyboard support
        - Layout shifts to fit storybook frame on wider screens
    - Shared UI Elements:
        - Progress indicator (dots or page #)
        - Narration play/pause button
        - Sound toggle (mute/unmute)
        - "Back to Library" floating button


### **Visual Identity Guide**

* 🎨 Color Palette \
  Inspired by bedtime stories, childhood wonder, and inclusivity.
    * 🌈 Primary Colors
        * Dream Blue - Hex: #3A7DFF | RGB: (58, 125, 255) - Primary UI buttons, accents
        * Storybook Violet - Hex: #A070FF | RGB: (160, 112, 255) - Secondary CTAs, highlights
        * Soft White - Hex: #FDFDFF | RGB: (253, 253, 255) - Background base
    * 🖍️ Secondary Colors
        * Sunshine Yellow - Hex: #FFE066 | RGB: (255, 224, 102) - Interactive highlights, joy
        * Mint Green - Hex: #90F1B0 | RGB: (144, 241, 176) - Success, positivity
        * Coral Pink - Hex: #FF8B94 | RGB: (255, 139, 148) - Emotion, warmth
    * 🔔 Semantic Colors
        * Success - Hex: #4CAF50 | RGB: (76, 175, 80) - Success messages
        * Warning - Hex: #FFB300 | RGB: (255, 179, 0) - Alerts, caution
        * Error - Hex: #F44336 | RGB: (244, 67, 54) - Errors, invalid inputs
* 🔤 Typography
    * 🎨 Display Font (for titles)
        * Font: Fredoka \
            * Rounded, playful \
            - Great for headers and brand name \
        - Weights: 400 / 600 / 700 \
        - Sizes (px): 48 (H1), 36 (H2), 28 (H3)
    * 📚 Body Font
        * Font: Nunito Sans \
            - Friendly, easy on the eyes \
            - Great for reading across languages \
        - Weights: 300 / 400 / 600 \
        - Sizes (px): Body Text: 16–18, Labels: 14, UI Elements: 12–16
* 🖼️ Imagery & Illustration Style
    * ✅ Do's
        * Whimsical, storybook-inspired illustrations
        * Soft rounded shapes, minimal sharp angles
        * Diverse characters and settings (fantasy, space, animals, etc.)
        * Warm color tones with subtle gradients
        * Friendly facial expressions and soft shadows
    * ❌ Don'ts
        * Overly detailed or realistic images
        * Harsh or neon colors
        * Sharp, geometric, or clinical vector art
        * Generic stock photos
* 🎨 Preferred Style:
    * Flat illustrations with hand-drawn or pastel textures
    * Think "mix of Pixar + Goodnight Moon"
    * Illustrated toys, environments, animals, robots, etc.
* 🧩 UI Components
    * 🔘 Buttons
        * Primary: Background - #3A7DFF, Text - White, Radius - 16px, Hover - Darker Blue
        * Secondary: Background - #A070FF, Text - White, Radius - 16px, Hover - Light Gradient
        * Tertiary: Transparent w/ border, Text - Blue, Radius - 16px, Hover - Light Fill
    * ⏺️ Button Sizes
        * Large: 48px height
        * Medium: 40px height
        * Small: 32px height
        * Padding: 16px horizontal
    * 🌟 Interactivity
        * Micro-animations: slight bounce on click
        * Hover shadows
        * Optional sound cues
    * 🧩 Other UI Elements
        * Cards: Rounded 24px, soft shadows, pastel background
        * Inputs: Rounded 12px, large touch targets, icon hints
        * Modals: Soft drop shadows, story-themed borders (e.g., stars or clouds)


### **Homepage Animation**

Goal: Add a cute animated animal character that follows the user's mouse or finger around the screen in a playful, character-specific way.

Here's a rough wireframe of the homepage: https://drive.google.com/file/d/1qItTL0yh7PLTL6QejLAhF7-LwnUZFXz4/view?usp=sharing


#### **🎯 Core Behaviors**

```
| Action                | Expected Behavior                                                              |
|-----------------------|---------------------------------------------------------------------------------|
| Move Mouse            | Animal follows cursor with animal-specific motion                              |
| Stop Moving (5s idle) | Animal enters idle animation loop                                              |
| Click Anywhere        | Animal reacts playfully (e.g., bounce, tail wag, roar)                         |
| Hover Key Elements    | Animal shifts attention or gestures toward the element (e.g., story button)    |
| Stay in Bounds        | Animal never fully exits viewport; reacts playfully when approaching edges     |


---
```



#### **🐰 🐶 🦕 Animal Movement Styles**

```
| Animal   | Motion Style                                      | Idle Animation                                | Click Reaction                      |
|----------|---------------------------------------------------|-----------------------------------------------|-------------------------------------|
| Bunny    | Soft hops (y-axis bounce per x pixels), short pauses | Wiggles ears, twitches nose, sits up        | Quick spin or double hop            |
| Puppy    | Playful prancing (2-beat bounding motion), tail wag | Tail wag, barks softly, tilts head          | Excited leap with bark animation    |
| Dinosaur | Stompy waddles (slower, weighty bounce), mini roars | Tiny tail swing, eye blink, sm
```



#### **🧰 Technical Implementation**
* Framework: React + Framer Motion (or GSAP)
* Assets Needed:
    * Each animal in:
        * Walking/prancing sprite loop (3–6 frames)
        * Idle poses (2–3 frames)
        * Reaction pose(s)
* Mouse Tracking:
    * Use mousemove or pointermove with throttling
    * Smooth path interpolation using requestAnimationFrame + easing
* Animation Scripting:
    * Movement delay per animal (bunny = fastest, dino = slowest)
    * Apply bouncing or weighted easing curves depending on the animal
    * Use transform: translate() with spring-based easing
    * Maintain orientation facing cursor direction
* Idle State Trigger:
    * setTimeout on pointer movement inactivity
    * Loop idle animation until movement resumes
* Click & Hover Effects:
    * On click, trigger small celebration or reaction unique to animal
    * On hover of key CTAs (like "Spin your first story"), animal turns and moves closer


#### **📱 Mobile Considerations**

* On touch: animal can follow finger or default to idle wander state
* If performance is a concern, allow toggle or disable on mobile


#### **🔧 Dev Settings**

```
| Setting                  | Default |
|--------------------------|---------|
| Active Animal Type       | Bunny   |
| Max Speed (px/sec)       | 200     |
| Edge Avoidance Padding   | 30px    |
| Idle Timeout             | 5000ms  |
```



---


## **Child Age Prompts**

###  **👶 0–6 Months: Sensory Discovery**
* **Story Style:** 1 short sentence per page with strong object-focus (e.g., "Look!  ball!")
* **Language:** Common nouns (dog, light, mama); soft sounds; repeated patterns
* **Narration:** Slow, soothing cadence; exaggerated vowels; animal and ambient sounds
* **Visuals:** High-contrast shapes, bright colors, one object or face per page
* **Interaction Prompts:**
    * "Can you find the bear?"
    * "Say 'moo' with the cow!"
* **Story Length:** **4–6 pages** (designed for short attention spans and sensory focus)

### **🚼 6–18 Months: Imitation & Action**
* **Story Style:** Simple actions and reactions ("Baby laughs. Ball rolls.")
* **Language:** 2–3 word phrases, familiar verbs (clap, go, hug)
* **Narration:** Natural tone, playful repetition, occasional sound effects
* **Visuals:** Everyday moments, toys, pets, simple facial expressions
* **Interaction Prompts:**
    * "Clap your hands like baby!"
    * "Wave hi to the dog!"
* **Story Length:** **6–8 pages** (simple cause-effect structure holds attention longer)

### **🚸 18–36 Months: Tiny Tales**

* **Story Style:** 2–4 sentence scenes with mini plot arcs (e.g., "Panda lost his shoe!")
* **Language:** Simple full sentences, intro to adjectives and question words
* **Narration:** Lively and expressive, playful character voices
* **Visuals:** Characters solving small problems, exploring familiar settings
* **Interaction Prompts:**
    * "Where's the hat?"
    * "Jump like the frog!"
* **Story Length:** **8–10 pages** (short narratives to build sequencing and memory)

### **🧒 3–4 Years: Rhythm & Repetition**
* **Story Style:** Short, rhyming or repeating sentence patterns ("The cat naps. The bat flaps.")
* **Language:** Action + rhyme, consistent structure with growing vocab
* **Narration:** Sing-song, engaging tone with rhythm and rhyme emphasis
* **Visuals:** Patterned scenes, visual gags, color and motion emphasis
* **Interaction Prompts:**
    * "Touch the green tree!"
    * "Clap when the bunny hops!"
* **Story Length:** **10–12 pages** (engaging rhythm supports retention and fun)

### **🧑 4–5 Years: Story Builders**
* **Story Style:** Full scenes with beginning-middle-end, light conflict and resolution
* **Language:** Emotional and descriptive words, dialogue, simple past tense
* **Narration:** Clear pacing with expressive voices and shifts in tone
* **Visuals:** More complex scenes with character interactions and emotional arcs
* **Interaction Prompts:**
    * "Why do you think the robot is sad?
    * "Can you count the stars with me?"
* **Story Length:** **12–16 pages** (supports early literacy and structured storytelling)