FROM node:16.15.0-alpine as build 

WORKDIR /app

COPY . .

RUN npm i

CMD ["npm", "run", "discord"]
