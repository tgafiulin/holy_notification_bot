# Playwright image version must match the `playwright` package in package.json.
FROM mcr.microsoft.com/playwright:v1.60.0-jammy

WORKDIR /app

ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src

CMD ["npm", "run", "bot"]
