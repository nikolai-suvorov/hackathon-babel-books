import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-soft-white to-blue-50">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="font-display text-6xl font-bold text-dream-blue mb-4">
            {process.env.NEXT_PUBLIC_PRODUCT_NAME}
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Transform simple prompts into magical, illustrated stories for your little ones. 
            Perfect for bilingual families and bedtime adventures!
          </p>
          
          <Link
            href="/create"
            className="inline-block bg-storybook-violet text-white px-8 py-4 rounded-full text-lg font-semibold hover:bg-opacity-90 transition-all transform hover:scale-105"
          >
            Create Your First Story ✨
          </Link>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="bg-white p-8 rounded-3xl shadow-lg text-center">
            <div className="text-4xl mb-4">🎨</div>
            <h3 className="font-display text-xl font-semibold mb-2 text-dream-blue">
              AI-Generated Illustrations
            </h3>
            <p className="text-gray-600">
              Beautiful, unique images for every page of your story
            </p>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-lg text-center">
            <div className="text-4xl mb-4">🌍</div>
            <h3 className="font-display text-xl font-semibold mb-2 text-dream-blue">
              Multilingual Support
            </h3>
            <p className="text-gray-600">
              Stories in 8+ languages with bilingual narration options
            </p>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-lg text-center">
            <div className="text-4xl mb-4">🎵</div>
            <h3 className="font-display text-xl font-semibold mb-2 text-dream-blue">
              Interactive & Musical
            </h3>
            <p className="text-gray-600">
              Tap animations, sound effects, and soothing background music
            </p>
          </div>
        </div>

        {/* Age Groups */}
        <div className="mt-16 text-center">
          <h2 className="font-display text-3xl font-semibold mb-8 text-dream-blue">
            Perfect for Every Age
          </h2>
          <div className="flex flex-wrap justify-center gap-4">
            <div className="bg-sunshine-yellow bg-opacity-20 px-6 py-3 rounded-full">
              <span className="font-semibold">0-6 months</span> 👶
            </div>
            <div className="bg-mint-green bg-opacity-20 px-6 py-3 rounded-full">
              <span className="font-semibold">6-18 months</span> 🍼
            </div>
            <div className="bg-coral-pink bg-opacity-20 px-6 py-3 rounded-full">
              <span className="font-semibold">18-36 months</span> 🚸
            </div>
            <div className="bg-dream-blue bg-opacity-20 px-6 py-3 rounded-full">
              <span className="font-semibold">3-4 years</span> 🧒
            </div>
            <div className="bg-storybook-violet bg-opacity-20 px-6 py-3 rounded-full">
              <span className="font-semibold">4-5 years</span> 🧑
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}