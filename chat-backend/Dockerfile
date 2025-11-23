FROM node:18

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm install

# Bundle app source
COPY . .

# Expose port (Hugging Face uses 7860 by default, but we can configure it)
EXPOSE 3001

# Define environment variable for port (optional, but good practice)
ENV PORT=3001

# Start the app
CMD [ "node", "server.js" ]
