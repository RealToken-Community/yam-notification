FROM node:18.18.0 as build 

WORKDIR /app

COPY . .

RUN npm i

CMD ["npm", "run", "discord"]
