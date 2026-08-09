# Builds the React frontend, then runs the Express server which serves
# both the API and the built frontend from a single process/port — this is
# the deployment shape the app is designed for (see server/index.js).

FROM node:22-slim AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

FROM node:22-slim AS server
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev
COPY server/ ./
COPY --from=client-build /app/client/dist /app/client/dist

EXPOSE 5000
CMD ["node", "index.js"]
