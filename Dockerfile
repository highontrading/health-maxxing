# Health Maxxing: one container, with the SQLite database on a volume.
#
#   docker build -t health-maxxing .
#   docker run -d -p 3000:3000 -v hm-data:/app/data --env-file .env.local health-maxxing
#
# The site is built when the container starts, not when the image is built, so
# its pages are generated from the live database (including everything edited
# in the admin panel). Expect the first minute after a start to be the build.
FROM node:22-slim

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
VOLUME ["/app/data"]

# prebuild and prestart load content/ into the database before each step.
CMD ["sh", "-c", "npm run build && npm run start"]
