{
  "extends": [
    "eslint:recommended"
  ],
  "env": {
    "node": true,
    "es2022": true,
    "browser": false
  },
  "parserOptions": {
    "ecmaVersion": 2022,
    "sourceType": "module"
  },
  "rules": {
    // Security-specific rules
    "no-eval": "error",
    "no-implied-eval": "error",
    "no-new-func": "error",
    "no-script-url": "error",
    "no-alert": "error",
    "no-debugger": "error",
    "no-console": "warn",
    
    // Input validation and sanitization
    "no-undef": "error",
    "no-unused-vars": "error",
    "no-redeclare": "error",
    "no-unreachable": "error",
    
    // Prevent common security mistakes
    "no-return-assign": "error",
    "no-self-compare": "error",
    "no-sequences": "error",
    "no-throw-literal": "error",
    
    // Code quality that impacts security
    "curly": "error",
    "eqeqeq": "error",
    "no-else-return": "error",
    "no-eval": "error",
    "no-implied-eval": "error",
    "no-new-func": "error",
    "no-param-reassign": "error",
    "no-return-assign": "error",
    "no-unused-expressions": "error",
    
    // Logging and error handling
    "no-console": "warn"
  },
  "plugins": [
    "security"
  ],
  "overrides": [
    {
      "files": ["**/*.test.ts", "**/*.spec.ts"],
      "env": {
        "jest": true
      },
      "rules": {
        "no-console": "off"
      }
    }
  ]
}