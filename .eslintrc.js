module.exports = {
  env: {
    browser: true,
    commonjs: true,
    es2021: true
  },
  extends: ['airbnb-base'],
  overrides: [
  ],
  parserOptions: {
    ecmaVersion: 'latest'
  },
  rules: {
    'no-console': 0, // 可以使用 console
    'linebreak-style': 0, // 忽略不同系统的换行规则
    'comma-dangle': [2, 'never'], // 禁止拖尾逗号
    'arrow-parens': [2, 'as-needed'],
    'import/no-dynamic-require': 0,
    'global-require': 0
  }
};
