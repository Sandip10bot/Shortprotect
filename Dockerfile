FROM node:20

# Install FFmpeg + wget
RUN apt-get update && apt-get install -y ffmpeg wget

# Install yt-dlp binary
RUN wget https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -O /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp

# Set working directory
WORKDIR /app

# Copy package.json
COPY package*.json ./

# Install Node dependencies
RUN npm install

# Copy project files
COPY . .

# Build step (optional)
RUN npm run build || echo "no build step"

EXPOSE 3000

CMD ["npm", "start"]
