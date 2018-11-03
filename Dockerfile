FROM node:8
COPY . portfolio
WORKDIR portfolio
RUN npm install --production && \
    npm run build
CMD ["npm", "start"]
