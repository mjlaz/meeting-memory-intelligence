# Meeting Memory Intelligence Engine - Testing Guide

## Table of Contents
- [Overview](#overview)
- [Testing Philosophy](#testing-philosophy)
- [Test Environment Setup](#test-environment-setup)
- [Running Tests](#running-tests)
- [Test Structure](#test-structure)
- [Writing Tests](#writing-tests)
- [Test Coverage](#test-coverage)
- [Integration Testing](#integration-testing)
- [End-to-End Testing](#end-to-end-testing)
- [Performance Testing](#performance-testing)
- [Testing Best Practices](#testing-best-practices)
- [Continuous Integration](#continuous-integration)
- [Troubleshooting Tests](#troubleshooting-tests)

## Overview

The Meeting Memory Intelligence Engine uses **Jest** as the primary testing framework with **ts-jest** for TypeScript support. This guide covers all aspects of testing, from unit tests to integration tests.

### Test Types

1. **Unit Tests** - Test individual functions and modules
2. **Integration Tests** - Test component interactions
3. **End-to-End Tests** - Test complete user workflows
4. **Performance Tests** - Test system performance and scalability

### Current Test Coverage

```
api/test/
├── middleware/
│   ├── errorHandler.test.ts
│   ├── rateLimiter.test.ts
│   ├── security.test.ts
│   └── validator.test.ts
├── services/
│   ├── analytics.test.ts
│   └── docgen.test.ts
└── validators.test.ts
```

## Testing Philosophy

### Principles

1. **Test Behavior, Not Implementation** - Focus on what the code does, not how
2. **Write Tests First** - TDD approach when possible
3. **Keep Tests Simple** - Each test should verify one thing
4. **Make Tests Fast** - Fast tests encourage frequent running
5. **Isolate Tests** - Tests should not depend on each other
6. **Use Meaningful Names** - Test names should describe what they test

### Test Pyramid

```
       /\
      /  \     E2E Tests (Few)
     /____\
    /      \   Integration Tests (Some)
   /________\
  /          \ Unit Tests (Many)
 /____________\
```

## Test Environment Setup

### Prerequisites

```bash
# Ensure you're in the api directory
cd api

# Install dependencies (includes test dependencies)
npm install
```

### Test Dependencies

The following are already included in `package.json`:

```json
{
  "devDependencies": {
    "@types/jest": "^29.5.12",
    "jest": "^29.7.0",
    "ts-jest": "^29.2.5"
  }
}
```

### Jest Configuration

The project uses `jest.config.js`:

```javascript
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  }
};
```

### Environment Variables for Testing

Create `.env.test`:

```bash
# Test environment variables
NODE_ENV=test
PORT=8081
LOG_LEVEL=error

# Mock IBM services (use test credentials or mocks)
COS_ENDPOINT=http://localhost:9000
COS_API_KEY_ID=test-key
COS_INSTANCE_CRN=test-crn
COS_BUCKET=test-bucket

WATSONX_AI_APIKEY=test-key
WATSONX_AI_SERVICE_URL=http://localhost:9001
WATSONX_AI_PROJECT_ID=test-project
WATSONX_MODEL_ID=test-model
WATSONX_API_VERSION=2025-02-11
```

## Running Tests

### Run All Tests

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run in watch mode (auto-rerun on changes)
npm test -- --watch
```

### Run Specific Tests

```bash
# Run tests in a specific file
npm test -- errorHandler.test.ts

# Run tests matching a pattern
npm test -- --testNamePattern="should handle errors"

# Run tests in a directory
npm test -- test/middleware/
```

### Run Tests with Options

```bash
# Verbose output
npm test -- --verbose

# Run in band (sequential, not parallel)
npm test -- --runInBand

# Update snapshots
npm test -- --updateSnapshot

# Bail after first failure
npm test -- --bail
```

### Expected Output

```
PASS  test/middleware/errorHandler.test.ts
PASS  test/middleware/rateLimiter.test.ts
PASS  test/middleware/security.test.ts
PASS  test/middleware/validator.test.ts
PASS  test/services/analytics.test.ts
PASS  test/services/docgen.test.ts
PASS  test/validators.test.ts

Test Suites: 7 passed, 7 total
Tests:       45 passed, 45 total
Snapshots:   0 total
Time:        5.234 s
```

## Test Structure

### Standard Test File Structure

```typescript
// test/services/example.test.ts

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { functionToTest } from '../../src/services/example';

describe('Example Service', () => {
  // Setup before each test
  beforeEach(() => {
    // Initialize test data
  });

  // Cleanup after each test
  afterEach(() => {
    // Clean up resources
  });

  describe('functionToTest', () => {
    it('should return expected result for valid input', () => {
      // Arrange
      const input = 'test';
      
      // Act
      const result = functionToTest(input);
      
      // Assert
      expect(result).toBe('expected');
    });

    it('should throw error for invalid input', () => {
      // Arrange
      const input = null;
      
      // Act & Assert
      expect(() => functionToTest(input)).toThrow('Invalid input');
    });
  });
});
```

### Arrange-Act-Assert Pattern

```typescript
it('should calculate total correctly', () => {
  // Arrange - Set up test data
  const items = [10, 20, 30];
  
  // Act - Execute the function
  const total = calculateTotal(items);
  
  // Assert - Verify the result
  expect(total).toBe(60);
});
```

## Writing Tests

### Unit Test Examples

#### Testing Pure Functions

```typescript
// test/utils/helpers.test.ts

import { sanitizeFilename } from '../../src/utils/helpers';

describe('sanitizeFilename', () => {
  it('should remove special characters', () => {
    const input = 'file@name#test.txt';
    const result = sanitizeFilename(input);
    expect(result).toBe('file_name_test.txt');
  });

  it('should handle empty string', () => {
    const result = sanitizeFilename('');
    expect(result).toBe('');
  });

  it('should preserve valid characters', () => {
    const input = 'valid-file_name.123.txt';
    const result = sanitizeFilename(input);
    expect(result).toBe('valid-file_name.123.txt');
  });
});
```

#### Testing Async Functions

```typescript
// test/services/cos.test.ts

import { uploadObject } from '../../src/services/cos';

describe('COS Service', () => {
  describe('uploadObject', () => {
    it('should upload file successfully', async () => {
      const key = 'test/file.txt';
      const buffer = Buffer.from('test content');
      
      const result = await uploadObject(key, buffer, 'text/plain');
      
      expect(result).toHaveProperty('bucket');
      expect(result).toHaveProperty('key');
      expect(result.key).toBe(key);
    });

    it('should handle upload errors', async () => {
      const key = 'invalid/path';
      const buffer = Buffer.from('test');
      
      await expect(uploadObject(key, buffer)).rejects.toThrow();
    });
  });
});
```

#### Testing with Mocks

```typescript
// test/services/wx.test.ts

import { wxExtractText } from '../../src/services/wx';
import { WatsonXAI } from '@ibm-cloud/watsonx-ai';

// Mock the WatsonXAI module
jest.mock('@ibm-cloud/watsonx-ai');

describe('watsonx.ai Service', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should extract text successfully', async () => {
    // Mock the textGeneration method
    const mockTextGeneration = jest.fn().mockResolvedValue({
      result: { generated_text: 'extracted text' }
    });
    
    (WatsonXAI.newInstance as jest.Mock).mockReturnValue({
      textGeneration: mockTextGeneration
    });

    const result = await wxExtractText('input text', 'prompt');
    
    expect(mockTextGeneration).toHaveBeenCalledTimes(1);
    expect(result).toHaveProperty('generated_text');
  });

  it('should retry on failure', async () => {
    const mockTextGeneration = jest.fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({ result: { generated_text: 'success' } });
    
    (WatsonXAI.newInstance as jest.Mock).mockReturnValue({
      textGeneration: mockTextGeneration
    });

    const result = await wxExtractText('input', 'prompt', { retries: 2 });
    
    expect(mockTextGeneration).toHaveBeenCalledTimes(2);
    expect(result).toHaveProperty('generated_text', 'success');
  });
});
```

#### Testing Middleware

```typescript
// test/middleware/auth.test.ts

import { Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../../src/middleware/auth';

describe('Auth Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {}
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    nextFunction = jest.fn();
  });

  it('should call next() for valid token', () => {
    mockRequest.headers = { authorization: 'Bearer valid-token' };
    
    authMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );
    
    expect(nextFunction).toHaveBeenCalled();
    expect(mockResponse.status).not.toHaveBeenCalled();
  });

  it('should return 401 for missing token', () => {
    authMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );
    
    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Unauthorized'
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });
});
```

### Integration Test Examples

#### Testing API Endpoints

```typescript
// test/integration/api.test.ts

import request from 'supertest';
import app from '../../src/index';

describe('API Integration Tests', () => {
  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      expect(response.body).toHaveProperty('ok', true);
      expect(response.body).toHaveProperty('version');
    });
  });

  describe('POST /process', () => {
    it('should process transcript successfully', async () => {
      const response = await request(app)
        .post('/process')
        .send({
          transcriptText: 'John will complete the task by Friday.',
          meetingType: 'standup'
        })
        .expect(200);
      
      expect(response.body).toHaveProperty('ok', true);
      expect(response.body).toHaveProperty('facts');
      expect(response.body.facts).toHaveProperty('actions');
    });

    it('should return 400 for missing transcript', async () => {
      const response = await request(app)
        .post('/process')
        .send({})
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.code).toBe('MISSING_TRANSCRIPT');
    });
  });
});
```

#### Testing Database Operations

```typescript
// test/integration/database.test.ts

import { init, createMeeting, getMeeting } from '../../src/db/repo';

describe('Database Integration Tests', () => {
  beforeAll(() => {
    // Initialize test database
    init();
  });

  afterEach(() => {
    // Clean up test data
    // db.exec('DELETE FROM meetings');
  });

  it('should create and retrieve meeting', () => {
    const meeting = {
      title: 'Test Meeting',
      meeting_type: 'standup' as const,
      meeting_date: '2026-02-03T14:00:00.000Z',
      status: 'scheduled' as const
    };
    
    const id = createMeeting(meeting);
    const retrieved = getMeeting(id);
    
    expect(retrieved).toBeDefined();
    expect(retrieved?.title).toBe('Test Meeting');
    expect(retrieved?.meeting_type).toBe('standup');
  });
});
```

## Test Coverage

### Generate Coverage Report

```bash
# Run tests with coverage
npm test -- --coverage

# Generate HTML report
npm test -- --coverage --coverageReporters=html

# Open coverage report
open coverage/index.html
```

### Coverage Output

```
--------------------|---------|----------|---------|---------|-------------------
File                | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
--------------------|---------|----------|---------|---------|-------------------
All files           |   85.23 |    78.45 |   82.67 |   86.12 |
 middleware/        |   92.15 |    88.23 |   90.00 |   93.45 |
  errorHandler.ts   |   95.00 |    90.00 |   92.00 |   96.00 | 45-47
  rateLimiter.ts    |   88.50 |    85.00 |   87.00 |   89.00 | 78-82
  security.ts       |   93.20 |    90.50 |   91.00 |   94.00 | 102-105
 services/          |   78.45 |    70.23 |   75.00 |   79.67 |
  analytics.ts      |   82.00 |    75.00 |   78.00 |   83.00 | 156-162,189-195
  wx.ts             |   75.00 |    65.00 |   72.00 |   76.00 | 67-73,98-105
--------------------|---------|----------|---------|---------|-------------------
```

### Coverage Goals

- **Statements**: > 80%
- **Branches**: > 75%
- **Functions**: > 80%
- **Lines**: > 80%

### Improving Coverage

```typescript
// Add tests for uncovered lines
describe('Error handling', () => {
  it('should handle edge case', () => {
    // Test previously uncovered line 45-47
    const result = functionWithEdgeCase(null);
    expect(result).toBeNull();
  });
});
```

## Integration Testing

### Testing with Real Services (Optional)

For integration tests with real IBM services, use separate test credentials:

```bash
# .env.integration
COS_ENDPOINT=https://s3.us-south.cloud-object-storage.appdomain.cloud
COS_API_KEY_ID=<test-api-key>
COS_INSTANCE_CRN=<test-instance-crn>
COS_BUCKET=meeting-intel-test

WATSONX_AI_APIKEY=<test-api-key>
WATSONX_AI_PROJECT_ID=<test-project-id>
```

```bash
# Run integration tests
npm test -- --testPathPattern=integration
```

### Mocking External Services

```typescript
// test/mocks/watsonx.mock.ts

export const mockWatsonXResponse = {
  result: {
    generated_text: JSON.stringify({
      actions: [
        {
          owner: 'John',
          description: 'Complete task',
          due_date: '2026-02-07',
          confidence: 0.9
        }
      ],
      decisions: [],
      risks: []
    })
  }
};

export const mockWatsonXError = new Error('Service unavailable');
```

## End-to-End Testing

### E2E Test Example

```typescript
// test/e2e/workflow.test.ts

import request from 'supertest';
import app from '../../src/index';
import fs from 'fs';

describe('Complete Workflow E2E Test', () => {
  let uploadedKey: string;
  let meetingId: number;

  it('should complete full meeting processing workflow', async () => {
    // Step 1: Upload file
    const uploadResponse = await request(app)
      .post('/ingest')
      .attach('files', Buffer.from('test content'), 'test.txt')
      .expect(200);
    
    uploadedKey = uploadResponse.body.files[0].key;
    expect(uploadedKey).toBeDefined();

    // Step 2: Create meeting
    const meetingResponse = await request(app)
      .post('/meetings')
      .send({
        title: 'E2E Test Meeting',
        meeting_type: 'standup',
        meeting_date: '2026-02-03T14:00:00.000Z',
        status: 'scheduled'
      })
      .expect(201);
    
    meetingId = meetingResponse.body.meeting.id;
    expect(meetingId).toBeDefined();

    // Step 3: Process transcript
    const processResponse = await request(app)
      .post('/process')
      .send({
        transcriptText: 'John will complete the documentation by Friday.',
        meetingId: meetingId
      })
      .expect(200);
    
    expect(processResponse.body.facts.actions).toHaveLength(1);

    // Step 4: Get insights
    const insightsResponse = await request(app)
      .get('/insights/summary')
      .expect(200);
    
    expect(insightsResponse.body.summary.totalActions).toBeGreaterThan(0);

    // Step 5: Export data
    const exportResponse = await request(app)
      .get('/export/json/facts')
      .expect(200);
    
    expect(exportResponse.body.actions).toBeDefined();
  });
});
```

## Performance Testing

### Load Testing with Artillery

Install Artillery:

```bash
npm install -g artillery
```

Create `artillery.yml`:

```yaml
config:
  target: 'http://localhost:8080'
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 120
      arrivalRate: 50
      name: "Sustained load"
  
scenarios:
  - name: "Process transcript"
    flow:
      - post:
          url: "/process"
          json:
            transcriptText: "Test transcript for load testing"
            meetingType: "standup"
```

Run load test:

```bash
artillery run artillery.yml
```

### Benchmark Tests

```typescript
// test/performance/benchmark.test.ts

import { performance } from 'perf_hooks';
import { wxExtractText } from '../../src/services/wx';

describe('Performance Benchmarks', () => {
  it('should process transcript within 2 seconds', async () => {
    const start = performance.now();
    
    await wxExtractText('test transcript', 'prompt');
    
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(2000); // 2 seconds
  });

  it('should handle 100 concurrent requests', async () => {
    const requests = Array(100).fill(null).map(() =>
      wxExtractText('test', 'prompt')
    );
    
    const start = performance.now();
    await Promise.all(requests);
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(10000); // 10 seconds for 100 requests
  });
});
```

## Testing Best Practices

### 1. Test Naming Conventions

```typescript
// Good: Descriptive test names
it('should return 400 when transcript is missing', () => {});
it('should extract actions from valid transcript', () => {});
it('should retry 3 times on network error', () => {});

// Bad: Vague test names
it('works', () => {});
it('test1', () => {});
it('should work correctly', () => {});
```

### 2. Test Independence

```typescript
// Good: Each test is independent
describe('User Service', () => {
  beforeEach(() => {
    // Fresh setup for each test
    db.exec('DELETE FROM users');
  });

  it('should create user', () => {
    const user = createUser({ name: 'John' });
    expect(user.id).toBeDefined();
  });

  it('should find user by id', () => {
    const created = createUser({ name: 'Jane' });
    const found = findUser(created.id);
    expect(found.name).toBe('Jane');
  });
});

// Bad: Tests depend on each other
let userId: number;

it('should create user', () => {
  const user = createUser({ name: 'John' });
  userId = user.id; // Shared state!
});

it('should find user', () => {
  const found = findUser(userId); // Depends on previous test
  expect(found).toBeDefined();
});
```

### 3. Use Test Fixtures

```typescript
// test/fixtures/meetings.ts
export const validMeeting = {
  title: 'Test Meeting',
  meeting_type: 'standup' as const,
  meeting_date: '2026-02-03T14:00:00.000Z',
  status: 'scheduled' as const
};

export const invalidMeeting = {
  title: '',
  meeting_type: 'invalid' as any,
  meeting_date: 'not-a-date',
  status: 'unknown' as any
};

// Use in tests
import { validMeeting } from '../fixtures/meetings';

it('should create meeting', () => {
  const id = createMeeting(validMeeting);
  expect(id).toBeGreaterThan(0);
});
```

### 4. Test Error Cases

```typescript
describe('Error Handling', () => {
  it('should handle null input', () => {
    expect(() => processData(null)).toThrow('Input cannot be null');
  });

  it('should handle empty array', () => {
    const result = processArray([]);
    expect(result).toEqual([]);
  });

  it('should handle network timeout', async () => {
    jest.setTimeout(1000);
    await expect(fetchData()).rejects.toThrow('Timeout');
  });
});
```

### 5. Keep Tests DRY

```typescript
// Good: Reusable test helpers
function createTestMeeting(overrides = {}) {
  return createMeeting({
    title: 'Test Meeting',
    meeting_type: 'standup',
    meeting_date: '2026-02-03T14:00:00.000Z',
    status: 'scheduled',
    ...overrides
  });
}

it('should create meeting with custom title', () => {
  const id = createTestMeeting({ title: 'Custom Title' });
  const meeting = getMeeting(id);
  expect(meeting?.title).toBe('Custom Title');
});
```

## Continuous Integration

### GitHub Actions Example

Create `.github/workflows/test.yml`:

```yaml
name: Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '20'
        cache: 'npm'
        cache-dependency-path: api/package-lock.json
    
    - name: Install dependencies
      working-directory: ./api
      run: npm ci
    
    - name: Run tests
      working-directory: ./api
      run: npm test -- --coverage
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3
      with:
        files: ./api/coverage/coverage-final.json
        flags: unittests
```

### Pre-commit Hook

Create `.husky/pre-commit`:

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

cd api
npm test -- --bail --findRelatedTests
```

## Troubleshooting Tests

### Common Issues

#### Issue: Tests Timeout

```typescript
// Increase timeout for slow tests
jest.setTimeout(10000); // 10 seconds

// Or per test
it('slow test', async () => {
  jest.setTimeout(30000);
  await slowOperation();
}, 30000);
```

#### Issue: Mock Not Working

```typescript
// Clear mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
});

// Reset modules
beforeEach(() => {
  jest.resetModules();
});
```

#### Issue: Database Locked

```bash
# Delete test database
rm api/data/meeting.db

# Or use in-memory database for tests
const db = new Database(':memory:');
```

#### Issue: Port Already in Use

```bash
# Use different port for tests
PORT=8081 npm test
```

### Debug Tests

```bash
# Run with Node debugger
node --inspect-brk node_modules/.bin/jest --runInBand

# Use VS Code debugger
# Add to .vscode/launch.json:
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/api/node_modules/.bin/jest",
  "args": ["--runInBand"],
  "console": "integratedTerminal"
}
```

## Additional Resources

- **Jest Documentation**: [jestjs.io/docs](https://jestjs.io/docs/getting-started)
- **Testing Best Practices**: [testingjavascript.com](https://testingjavascript.com/)
- **Supertest**: [github.com/visionmedia/supertest](https://github.com/visionmedia/supertest)
- **Artillery**: [artillery.io/docs](https://www.artillery.io/docs)

---

**Last Updated**: 2026-02-03  
**Version**: 0.1.0  
**Maintainer**: QA Team