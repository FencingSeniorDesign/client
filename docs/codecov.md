# Codecov Setup and Usage

This project uses [Codecov](https://codecov.io/) for test coverage reporting. This document explains how to use Codecov both locally and in CI.

## Local Usage

To generate and view test coverage reports locally:

1. Run the tests with coverage:

```sh
npm run test:coverage
# or directly use the jest.config.js
jest --config=jest.config.js
```

2. This will generate coverage reports in the `coverage/` directory.

3. You can view the HTML report by opening `coverage/lcov-report/index.html` in your browser.

## CI Integration

Codecov is integrated into our CI workflow through GitHub Actions. Every time code is pushed or a pull request is created, the workflow:

1. Runs the test suite with coverage enabled
2. Uploads the coverage reports to Codecov

The coverage status and reports can be viewed:
- In the GitHub Pull Request UI (as a comment)
- On the [Codecov dashboard](https://codecov.io/gh/FencingSeniorDesign/client)
- Via the badge in our README

## Configuration

Codecov is configured through the `.codecov.yml` file in the project root. This configuration:

- Sets coverage thresholds for PRs
- Configures how coverage reports are displayed in PR comments
- Sets other Codecov behaviors

## Adding New Tests

To improve code coverage:

1. Focus on writing tests for untested code and critical paths
2. Use the coverage reports to identify areas needing more tests
3. Ensure new code is properly tested before merging

## Troubleshooting

If you encounter issues with Codecov:

- Check that the `CODECOV_TOKEN` secret is properly set in the GitHub repository settings
- Verify that tests are running correctly and generating coverage reports
- Look at GitHub Actions logs for any upload errors

## Resources

- [Codecov Documentation](https://docs.codecov.io/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Jest Coverage Documentation](https://jestjs.io/docs/configuration#collectcoveragefrom-array)