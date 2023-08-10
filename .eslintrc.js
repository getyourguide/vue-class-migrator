module.exports = {
  ignorePatterns: [
    '**/dist',
    '**/node_modules',
  ],
  parserOptions: {
    project: "./tsconfig.base.json"
  },
  extends: [
    'airbnb-base',
    'airbnb-typescript'
  ],
  rules: {
    "react/jsx-filename-extension": 0,
    "no-underscore-dangle": 0
  }
};
