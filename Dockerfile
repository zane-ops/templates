FROM oven/bun:1.2.21  as base
WORKDIR /app


# install dependencies
COPY ./package.json ./bun.lock ./


FROM base AS build-deps
RUN FORCE_COLOR=true bun install --frozen-lockfile

FROM base AS prod-deps
RUN FORCE_COLOR=true bun install --frozen-lockfile --prod

# build the app
FROM build-deps AS build
COPY . .
ARG ZANE_DOMAINS
ARG TYPESENSE_KEY
ARG TYPESENSE_HOST
ENV ZANE_DOMAINS=${ZANE_DOMAINS}
ENV TYPESENSE_KEY=${TYPESENSE_KEY}
ENV TYPESENSE_HOST=${TYPESENSE_HOST}
RUN --mount=type=cache,target=/app/.astro FORCE_COLOR=true bun run build


RUN bun install --frozen-lockfile

# runtime
FROM base AS runtime

RUN apt-get update && apt-get install -y supervisor && rm -rf /var/lib/apt/lists/*
COPY --from=caddy:latest /usr/bin/caddy /usr/bin/caddy

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

COPY Caddyfile /etc/caddy/Caddyfile
COPY supervisord.conf /etc/supervisord.conf

ARG PORT=80
ENV PORT=${PORT}

EXPOSE ${PORT}

CMD ["supervisord", "-c", "/etc/supervisord.conf"]