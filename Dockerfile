FROM node:10-buster

WORKDIR /app
COPY package.json /app

RUN npm install --production

COPY . /app
CMD ["npm", "start"]