# Use official Node.js image
FROM node:20

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json first
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all project files
COPY . .

# Build your project (if needed)
RUN npm run build || echo "no build step"

# Expose port (if using Express/HTTP)
EXPOSE 3000

# Start command
CMD ["npm", "start"]
