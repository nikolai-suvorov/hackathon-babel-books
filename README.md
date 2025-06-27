# BabelBooks

AI-powered storytelling platform for bilingual kids aged 0-5.

## Quick Start

### Prerequisites
- Node.js 20+
- Docker
- npm or yarn

### Local Development Setup

1. **Clone the repository**
```bash
git clone <repo-url>
cd hackathon-babel-books
```

2. **Install dependencies**
```bash
npm install
```

3. **Start Docker services**
```bash
docker compose up -d
```

This starts:
- MongoDB on `localhost:27017`
- LocalStack (S3 mock) on `localhost:4566`
- Stripe Mock on `localhost:12111`

4. **Copy environment variables**
```bash
cp .env.example .env.local
```

5. **Start the development server**
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

6. **Start the background worker** (in a separate terminal)
```bash
npm run worker:dev
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
├── public/                # Static assets
└── docker-compose.yml     # Local services
```

## Available Scripts

- `npm run dev` - Start Next.js development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run worker` - Start background worker
- `npm run worker:dev` - Start worker with hot reload

## Environment Variables

See `.env.example` for all required variables. Key ones:
- `MONGODB_URI` - MongoDB connection string
- `GEMINI_API_KEY` - Google Gemini API key
- `STRIPE_SECRET_KEY` - Stripe secret key
- `AWS_*` - S3 configuration

## Architecture

- **Frontend**: Next.js 14 with TypeScript
- **Backend**: Next.js API routes
- **Database**: MongoDB
- **File Storage**: AWS S3
- **AI**: Google Gemini API
- **Payments**: Stripe
- **Background Jobs**: Custom worker using MongoDB as queue

## Deployment

Configured for deployment on Render.com. See `render.yaml` for configuration.