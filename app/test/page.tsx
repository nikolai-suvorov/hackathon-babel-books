'use client';

import { useState } from 'react';

export default function TestPage() {
  const [imageStatus, setImageStatus] = useState('');
  const [audioStatus, setAudioStatus] = useState('');
  
  // Test image data (small colored square)
  const testImageData = "iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8/5+hnoEIwDiqkL4KAcT9GO0U4BxoAAAAAElFTkSuQmCC";
  
  // Test audio data (mock)
  const testAudioData = "ewogICJ0eXBlIjogInRlc3RfYXVkaW8iLAogICJ0ZXh0IjogIlRlc3QgYXVkaW8gcGxheWJhY2siCn0=";
  
  const playAudio = () => {
    try {
      const decoded = JSON.parse(atob(testAudioData));
      setAudioStatus(`Mock audio played: ${JSON.stringify(decoded)}`);
      alert(`🔊 Playing mock audio: ${decoded.text}`);
    } catch (err) {
      setAudioStatus(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };
  
  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-8">BabelBooks Component Test</h1>
      
      {/* Image Test */}
      <div className="mb-8 p-4 border rounded">
        <h2 className="text-xl font-semibold mb-4">Image Display Test</h2>
        <div className="bg-gray-100 p-4 rounded">
          <img 
            src={`data:image/png;base64,${testImageData}`}
            alt="Test image"
            className="w-32 h-32"
            onLoad={() => setImageStatus('✅ Image loaded successfully')}
            onError={() => setImageStatus('❌ Image failed to load')}
          />
          <p className="mt-2 text-sm">{imageStatus || 'Loading image...'}</p>
        </div>
      </div>
      
      {/* Audio Test */}
      <div className="mb-8 p-4 border rounded">
        <h2 className="text-xl font-semibold mb-4">Audio Playback Test</h2>
        <button
          onClick={playAudio}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          🔊 Play Test Audio
        </button>
        <p className="mt-2 text-sm">{audioStatus || 'Click button to test audio'}</p>
      </div>
      
      {/* Links to Stories */}
      <div className="p-4 border rounded">
        <h2 className="text-xl font-semibold mb-4">Recent Stories</h2>
        <ul className="space-y-2">
          <li>
            <a href="/stories/685ebed50af668229135f696" className="text-blue-500 hover:underline">
              Latest Story (Finnian Fox)
            </a>
          </li>
          <li>
            <a href="/stories/685ebc6b0af668229135f690" className="text-blue-500 hover:underline">
              Previous Story (Clementine)
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}