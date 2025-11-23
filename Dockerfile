FROM node:18

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# Copy package.json from chat-backend
COPY chat-backend/package*.json ./

RUN npm install

# Bundle app source
# Copy all files from chat-backend
COPY chat-backend/ .

# Expose port
EXPOSE 3001

# Define environment variable
ENV PORT=3001

# Start the app
CMD [ "node", "server.js" ]
