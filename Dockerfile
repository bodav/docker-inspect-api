FROM node:10-buster

WORKDIR /app
COPY package.json /app

RUN npm install

COPY . /app
CMD ["npm", "start"]