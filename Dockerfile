FROM node:10
COPY . portfolio
WORKDIR portfolio
RUN yarn install --production --frozen-lockfile && \
    yarn build
CMD ["yarn", "start"]
