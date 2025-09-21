FROM oven/bun:alpine

# Split up for caching purposes
WORKDIR /app
COPY package.json .
COPY bun.lock .
RUN bun install

# Add source files
COPY . .
CMD ["bun", "run", "start"]