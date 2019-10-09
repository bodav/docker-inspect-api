FROM node:10-buster

WORKDIR /app
COPY package.json /app

RUN npm install --production

COPY . /app

HEALTHCHECK --interval=15s CMD curl --fail http://localhost:8080/health || exit 1

CMD ["npm", "start"]