FROM node:10
COPY . portfolio
WORKDIR portfolio
RUN yarn install --production && \
    yarn build
CMD ["yarn", "start"]
