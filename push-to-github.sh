#!/bin/bash

echo "🚀 Pushing to GitHub..."
echo "You'll need to authenticate with GitHub."
echo ""
echo "Options:"
echo "1. Use a Personal Access Token (recommended)"
echo "   - Go to GitHub Settings > Developer settings > Personal access tokens"
echo "   - Generate a token with 'repo' scope"
echo "   - Use the token as your password when prompted"
echo ""
echo "2. Use SSH (if configured)"
echo "   - Change remote to SSH: git remote set-url origin git@github.com:nikolai-suvorov/hackathon-babel-books.git"
echo ""

# Push to GitHub
git push origin main

echo ""
echo "✅ Once pushed, go to Render.com to deploy:"
echo "1. Create a new Web Service from the GitHub repo"
echo "2. Create a new Background Worker from the same repo"
echo "3. Configure environment variables as listed in DEPLOYMENT_CHECKLIST.md"