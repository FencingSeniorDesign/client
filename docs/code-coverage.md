# Code Coverage Setup

This project uses Jest for testing and the [Code Coverage Summary](https://github.com/marketplace/actions/code-coverage-summary) GitHub Action to track and report code coverage.

## Coverage Configuration

The code coverage is configured in `jest.config.js` with the following settings:

- Coverage collection is enabled by default
- Coverage reports are generated in text, lcov, and Cobertura XML formats
- Coverage thresholds are set to 70% for branches, functions, lines, and statements
- Coverage reports are saved to the `./coverage` directory

## GitHub Workflow

A GitHub workflow is set up to:

1. Run tests with coverage on push to main/master and on pull requests
2. Generate a code coverage summary using the Code Coverage Summary action
3. Post the summary as a comment on pull requests

## Running Tests with Coverage Locally

To run tests with coverage locally:

```bash
npm test -- --coverage
```

This will generate coverage reports in the `./coverage` directory. You can open `./coverage/lcov-report/index.html` in a browser to view a detailed HTML coverage report.

## Coverage Thresholds

The current coverage thresholds are:

- **Good Coverage**: ≥ 80%
- **Acceptable Coverage**: ≥ 60%
- **Poor Coverage**: < 60%

These thresholds are configured in both `jest.config.js` and the GitHub workflow.
