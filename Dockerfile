# pandoc 3.x as a single static binary (Debian's pandoc 2.17 cannot use --sandbox for DOCX output)
FROM pandoc/minimal:3.8 AS pandoc

FROM node:24-bookworm-slim
COPY --from=pandoc /usr/local/bin/pandoc /usr/local/bin/pandoc
WORKDIR /app
COPY server.js .
EXPOSE 3000
# run as the unprivileged "node" user that ships with the image
USER node
CMD ["node", "server.js"]
