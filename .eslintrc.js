module.exports = {
  root: true,
  extends: [
    'expo', // Includes react, react-native, react-hooks
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended', // Enables eslint-plugin-prettier and displays prettier errors as ESLint errors. Make sure this is always the last configuration in the extends array.
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'prettier'],
  rules: {
    'prettier/prettier': 'error', // Rule to enforce prettier formatting via ESLint
    // Add any project-specific rule overrides here
    // Example: '@typescript-eslint/no-unused-vars': ['warn', { 'argsIgnorePattern': '^_' }],
  },
  settings: {
    react: {
      version: 'detect', // Automatically detect the React version
    },
  },
  ignorePatterns: [
    'node_modules/',
    'build/',
    'dist/',
    '.expo/',
    'drizzle/', // Ignoring generated drizzle files
    '*.config.js', // Ignoring config files at root
    '*.config.ts',
    'plugins/', // Ignoring plugins dir
    '*.native.tsx', // Ignoring specific gesture handler file
  ],
};
