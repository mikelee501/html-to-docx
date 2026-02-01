FROM node:18
RUN apt-get update && apt-get install -y pandoc
WORKDIR /app
COPY server.js .
EXPOSE 3000
CMD ["node", "server.js"]
