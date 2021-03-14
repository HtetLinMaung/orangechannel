FROM node:lts-alpine3.10

WORKDIR /usr/app

COPY package.json .

RUN npm i

COPY . .

CMD ["npm", "start"]