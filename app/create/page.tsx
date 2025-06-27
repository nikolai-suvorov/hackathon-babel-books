'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const AGE_GROUPS = [
  { value: '0-6 months', label: '0-6 months 👶' },
  { value: '6-18 months', label: '6-18 months 🍼' },
  { value: '18-36 months', label: '18-36 months 🚸' },
  { value: '3-4 years', label: '3-4 years 🧒' },
  { value: '4-5 years', label: '4-5 years 🧑' },
];

const TONES = [
  { value: 'funny', label: 'Funny 😄', color: 'bg-sunshine-yellow' },
  { value: 'magical', label: 'Magical ✨', color: 'bg-storybook-violet' },
  { value: 'scary', label: 'Scary (kid-appropriate) 👻', color: 'bg-coral-pink' },
  { value: 'wholesome', label: 'Wholesome 🤗', color: 'bg-mint-green' },
  { value: 'adventurous', label: 'Adventurous 🚀', color: 'bg-dream-blue' },
];

const LANGUAGES = [
  { value: 'English', label: 'English' },
  { value: 'Spanish', label: 'Español' },
  { value: 'French', label: 'Français' },
  { value: 'German', label: 'Deutsch' },
  { value: 'Italian', label: 'Italiano' },
  { value: 'Hindi', label: 'हिन्दी' },
  { value: 'Russian', label: 'Русский' },
];

export default function CreateStoryPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    prompt: '',
    ageGroup: '',
    tone: '',
    language: 'English',
    narrationLanguage: 'English',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // For now, create a mock story
      const mockStoryId = 'mock-' + Date.now();
      
      // Store form data in sessionStorage for the story page
      sessionStorage.setItem('storyData', JSON.stringify({
        id: mockStoryId,
        ...formData,
        status: 'completed',
        story: {
          title: "The Adventures of " + formData.prompt,
          metadata: {
            ageGroup: formData.ageGroup,
            tone: formData.tone,
            language: formData.language,
          },
          pages: [
            {
              pageNumber: 1,
              text: `Once upon a time, ${formData.prompt}. This is a ${formData.tone} story for ${formData.ageGroup} in ${formData.language}.`,
              imagePrompt: "A colorful illustration of the beginning of the story",
              interactiveElement: "Tap the character to say hello!",
            },
            {
              pageNumber: 2,
              text: "And they lived happily ever after. The end!",
              imagePrompt: "A happy ending scene",
              interactiveElement: "Tap anywhere to celebrate!",
            },
          ],
        },
      }));

      // Navigate to story page
      router.push(`/stories/${mockStoryId}`);
    } catch (error) {
      console.error('Error creating story:', error);
      setIsLoading(false);
    }
  };

  const isFormValid = formData.prompt.length >= 5 && formData.ageGroup && formData.tone;

  return (
    <main className="min-h-screen bg-gradient-to-b from-soft-white to-blue-50 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <h1 className="font-display text-4xl font-bold text-dream-blue text-center mb-8">
          Create Your Story ✨
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-3xl shadow-lg p-8">
          {/* Story Prompt */}
          <div>
            <label htmlFor="prompt" className="block text-lg font-semibold mb-2">
              What is your story about?
            </label>
            <input
              id="prompt"
              type="text"
              value={formData.prompt}
              onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
              placeholder="Zoe and her panda go to space"
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-dream-blue focus:outline-none"
              minLength={5}
              required
            />
            <p className="text-sm text-gray-600 mt-1">
              Try including your child's name or favorite characters!
            </p>
          </div>

          {/* Age Group */}
          <div>
            <label htmlFor="ageGroup" className="block text-lg font-semibold mb-2">
              Child's Age
            </label>
            <select
              id="ageGroup"
              value={formData.ageGroup}
              onChange={(e) => setFormData({ ...formData, ageGroup: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-dream-blue focus:outline-none"
              required
            >
              <option value="">Select age group</option>
              {AGE_GROUPS.map((age) => (
                <option key={age.value} value={age.value}>
                  {age.label}
                </option>
              ))}
            </select>
          </div>

          {/* Tone */}
          <div>
            <label className="block text-lg font-semibold mb-2">
              Tone of the story
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {TONES.map((tone) => (
                <button
                  key={tone.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, tone: tone.value })}
                  className={`px-4 py-3 rounded-xl font-medium transition-all ${
                    formData.tone === tone.value
                      ? `${tone.color} text-white scale-105`
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  {tone.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  const randomTone = TONES[Math.floor(Math.random() * TONES.length)];
                  setFormData({ ...formData, tone: randomTone.value });
                }}
                className="px-4 py-3 rounded-xl font-medium bg-gradient-to-r from-dream-blue to-storybook-violet text-white"
              >
                Random 🎲
              </button>
            </div>
          </div>

          {/* Languages */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="language" className="block text-lg font-semibold mb-2">
                Story Language
              </label>
              <select
                id="language"
                value={formData.language}
                onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-dream-blue focus:outline-none"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="narrationLanguage" className="block text-lg font-semibold mb-2">
                Narration Language (optional)
              </label>
              <select
                id="narrationLanguage"
                value={formData.narrationLanguage}
                onChange={(e) => setFormData({ ...formData, narrationLanguage: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-dream-blue focus:outline-none"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </select>
              <p className="text-sm text-gray-600 mt-1">
                Choose a different language to support bilingual learning
              </p>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!isFormValid || isLoading}
            className={`w-full py-4 rounded-full text-lg font-semibold transition-all ${
              isFormValid && !isLoading
                ? 'bg-storybook-violet text-white hover:bg-opacity-90 transform hover:scale-105'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Creating your story...
              </span>
            ) : (
              'Generate My Story ✨'
            )}
          </button>
        </form>
      </div>
    </main>
  );
}