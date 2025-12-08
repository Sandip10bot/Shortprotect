# Use official Node.js 20 image
FROM node:20

# Install yt-dlp (best method)
RUN apt-get update && \
    apt-get install -y python3 python3-pip ffmpeg && \
    pip3 install yt-dlp

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install node dependencies
RUN npm install

# Copy all project files
COPY . .

# Build your project (ignore if no build script)
RUN npm run build || echo "no build step"

# Expose Express port
EXPOSE 3000

# Start server
CMD ["npm", "start"]
