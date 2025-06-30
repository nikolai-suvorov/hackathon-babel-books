# BabelBooks - Bilingual Children's Story Generator

BabelBooks is an AI-powered platform that creates personalized, bilingual children's stories with custom illustrations and narration. The application uses Google's Gemini API for story generation and Imagen for creating story-specific illustrations.

## Features

- **Personalized Story Generation**: Creates unique stories based on prompts, child's age, name, and interests
- **Bilingual Support**: Generates stories in multiple languages with separate text and narration languages
- **Custom Illustrations**: AI-generated images that match the story content and maintain visual consistency
- **Audio Narration**: Text-to-speech narration for each page
- **Progressive Loading**: Stories are generated page-by-page for better user experience
- **Age-Appropriate Content**: Tailored content and illustration styles for different age groups (0-6 months to 4-5 years)

## Architecture

The application consists of three main components:

1. **Next.js Frontend**: React-based web application with TypeScript
2. **Python Worker Service**: Handles AI generation tasks asynchronously
3. **MongoDB**: Stores stories and manages job queues

## Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local development)
- Python 3.11+ (for local development)
- Google Gemini API key

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/babel-books.git
cd babel-books
```

### 2. Set up environment variables

Copy the example environment files:

```bash
cp .env.example .env
cp worker/.env.example worker/.env
```

Edit the `.env` files and add your credentials:

- `GEMINI_API_KEY`: Your Google Gemini API key
- MongoDB credentials (or use defaults for local development)

### 3. Run with Docker Compose

For development:

```bash
docker-compose up -d
```

For production:

```bash
docker-compose -f docker-compose.prod.yml up -d
```

The application will be available at:
- Frontend: http://localhost:3000
- Worker API: http://localhost:8000

## Development

### Frontend Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

### Worker Development

```bash
cd worker

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt -r requirements-test.txt

# Run tests
pytest

# Run with hot reload
uvicorn main_progressive:app --reload --host 0.0.0.0 --port 8000
```

### Running Tests

Run the complete test suite with Docker:

```bash
docker-compose -f docker-compose.test.yml up --abort-on-container-exit
```

## Configuration

### Environment Variables

#### Frontend (.env)
- `MONGODB_URI`: MongoDB connection string
- `NEXT_PUBLIC_API_URL`: Public API URL

#### Worker (worker/.env)
- `MONGODB_URI`: MongoDB connection string
- `GEMINI_API_KEY`: Google Gemini API key
- `USE_MOCK_STORIES`: Use mock data for testing (true/false)
- `USE_MOCK_IMAGES`: Use placeholder images (true/false)
- `USE_MOCK_AUDIO`: Use mock audio generation (true/false)

### Age Groups

The application supports the following age groups with tailored content:

- **0-6 months**: 4 pages, simple shapes and colors
- **6-18 months**: 6 pages, bright illustrations
- **18-36 months**: 8 pages, cartoon style
- **3-4 years**: 10 pages, detailed illustrations
- **4-5 years**: 12 pages, whimsical storybook style

## API Documentation

### Create Story

```http
POST /api/stories
Content-Type: application/json

{
  "prompt": "A brave little mouse",
  "childAge": "3-4 years",
  "childName": "Emma",
  "childInterests": "dinosaurs, space",
  "textLanguage": "en",
  "narrationLanguage": "es",
  "tone": "playful"
}
```

### Get Story

```http
GET /api/stories?id={storyId}
```

### Worker Health Check

```http
GET http://localhost:8000/health
```

## Project Structure

```
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── create/            # Story creation flow
│   └── stories/           # Story library & reader
├── components/            # React components
├── lib/                   # Utilities (DB, S3, etc.)
├── worker/                # Background processing
│   ├── processors/        # AI processing modules
│   ├── tests/            # Test suite
│   └── utils/            # Helper utilities
├── public/                # Static assets
├── docker-compose.yml     # Development services
└── docker-compose.prod.yml # Production services
```

## Production Deployment

### Using Docker

1. Build production images:

```bash
docker-compose -f docker-compose.prod.yml build
```

2. Set production environment variables in `.env.prod`

3. Deploy:

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Security Considerations

- Always use strong passwords for MongoDB in production
- Keep your Gemini API key secure
- Use HTTPS in production
- Enable rate limiting for API endpoints
- Regular security updates for dependencies

## Monitoring

The worker service provides basic metrics:

```http
GET http://localhost:8000/metrics
```

Returns job statistics:
- Pending jobs
- Processing jobs
- Completed jobs
- Failed jobs

## Troubleshooting

### Common Issues

1. **Image generation fails**: Check Gemini API key and quota
2. **MongoDB connection errors**: Verify connection string and credentials
3. **Stories not loading**: Check worker logs with `docker logs babel-books-worker`

### Logs

View logs for debugging:

```bash
# Frontend logs
docker logs babel-books-nextjs

# Worker logs
docker logs babel-books-worker

# MongoDB logs
docker logs babel-books-mongodb
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Google Gemini API for story and image generation
- Next.js team for the excellent framework
- FastAPI for the Python backend framework