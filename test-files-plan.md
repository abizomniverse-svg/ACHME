# Test Files Implementation Plan

This document outlines the testing strategy, tools, structure, and execution plan for implementing comprehensive full-stack testing for the **ACHME Communication / CRM** application.

---

## Overview

A robust test suite ensures stability, prevents regressions, and secures critical business flows (Auth, Invoices, Leads, Chat) in the ACHME system. This plan establishes standard testing practices across both the frontend React application and the backend Express/MySQL server.

*   **Goals**: 
    *   Add high-coverage unit and integration tests for core backend routes.
    *   Add React component and unit tests for critical frontend pages.
    *   Provide setup instructions and mocks for third-party integrations (Twilio, Node-schedule, Nodemailer).
    *   Maintain a robust, repeatable test suite that developers can run locally.

---

## Project Type
*   **Type**: **WEB + BACKEND** (Full-Stack Enterprise CRM Web Application)
*   **Primary Web Agent**: `frontend-specialist` (using `frontend-design`, `react-best-practices`)
*   **Primary Backend Agent**: `backend-specialist` (using `api-patterns`, `database-design`)
*   **Verification Agent**: `test-engineer` (using `testing-patterns`, `webapp-testing`)

---

## Success Criteria

1.  **Backend Route Coverage**: Unit and integration tests for at least 4 critical backend route areas:
    *   Authentication & Registration (`authRoutes.js`)
    *   Lead Management (`leadManagementRoutes.js`)
    *   Unified Invoice / Invoice Generation (`unifiedInvoiceRoute.js` & `invoice.js`)
    *   Notifications & OTP Services (`notificationRoutes.js` & `sendotp.js` mock checks)
2.  **Frontend Component Coverage**: Unit and component tests for:
    *   Authentication Views (`LoginAdmin.jsx`, `login.jsx`, `register.jsx`)
    *   Context Provider (`AuthContext.jsx`)
    *   Critical Components (`ClientSearchDropdown.jsx`, `Toast.jsx`)
3.  **Mocking Verification**: Successful execution of tests using mock databases and mock third-party services (no actual Twilio or Nodemailer messages sent during test runs).
4.  **One-Command Executable**: Devs can run `npm run test` in both `frontend` and `backend` directories and get clean, passing results.

---

## Tech Stack & Testing Strategy

### Frontend Testing (React)
*   **Framework**: **Jest** (configured natively in `react-scripts`)
*   **Utilities**: **React Testing Library (RTL)** (`@testing-library/react`, `@testing-library/jest-dom`) for DOM assertion and user interaction simulation.
*   **Strategy**: Unit test individual utility functions; integration test critical form-based components (Login/Register, Invoice Modal) with mock API responses.

### Backend Testing (Express & MySQL)
*   **Framework**: **Jest** (installed as a backend devDependency)
*   **HTTP Assertions**: **Supertest** for testing routes and request-response cycles.
*   **Database Isolation**: Mocking `mysql2` pool queries using Jest spy-ons or Jest mock functions to keep unit/controller tests fast and network-free. 
*   **Strategy**: Write route-level tests that simulate requests, mock database records, and verify HTTP status codes, headers, and payloads.

---

## Proposed File Structure

We will introduce organized test structures to separate test code from source code.

```bash
ACHME_COMUNICATION/
├── backend/
│   ├── package.json (modified: added test script, jest, supertest)
│   ├── tests/
│   │   ├── setup.js (global test setup, environment config, mocks)
│   │   ├── auth.test.js (tests for authRoutes.js)
│   │   ├── leads.test.js (tests for leadManagementRoutes.js)
│   │   ├── invoice.test.js (tests for unifiedInvoiceRoute.js/invoice.js)
│   │   └── notification.test.js (tests for notificationRoutes.js/sendotp.js)
├── frontend/
│   ├── package.json (existing: uses react-scripts test)
│   └── src/
│       ├── __tests__/ (standard colocated test directory)
│       │   ├── auth/
│       │   │   ├── AuthContext.test.jsx (tests for AuthContext.jsx)
│       │   │   ├── login.test.jsx (tests for login.jsx / LoginAdmin.jsx)
│       │   │   └── register.test.jsx (tests for register.jsx)
│       │   └── components/
│       │       ├── ClientSearchDropdown.test.jsx (tests for ClientSearchDropdown.jsx)
│       │       └── Toast.test.jsx (tests for Toast.jsx)
```

---

## Task Breakdown

### Phase 1: Backend Infrastructure & Setup
Establish test runner, install dependencies, and define global mock files.

| Task ID | Component / File | Agent | Skill | Priority | Dependencies | Details (INPUT → OUTPUT → VERIFY) |
| :--- | :--- | :--- | :--- | :---: | :--- | :--- |
| **B-INF-01** | `backend/package.json` | `backend-specialist` | `clean-code` | P0 | None | **INPUT**: Existing package.json<br>**OUTPUT**: package.json updated with `"devDependencies": {"jest": "^29.7.0", "supertest": "^7.0.0"}` and `"scripts": {"test": "jest --runInBand"}`<br>**VERIFY**: Run `npm install` in `backend/` and verify package-lock.json update. |
| **B-INF-02** | `backend/tests/setup.js` | `backend-specialist` | `testing-patterns` | P0 | B-INF-01 | **INPUT**: No file<br>**OUTPUT**: Global setup file that mocks `mysql2`, `twilio`, and `nodemailer` globally so tests don't initiate external calls.<br>**VERIFY**: File exists and exports default mock objects for db connection/queries. |

### Phase 2: Backend Route Testing
Write targeted test suites for the core HTTP API endpoints.

| Task ID | Component / File | Agent | Skill | Priority | Dependencies | Details (INPUT → OUTPUT → VERIFY) |
| :--- | :--- | :--- | :--- | :---: | :--- | :--- |
| **B-TST-01** | `backend/tests/auth.test.js` | `backend-specialist` | `api-patterns` | P0 | B-INF-02 | **INPUT**: `backend/routes/authRoutes.js`<br>**OUTPUT**: Test suite testing registration, login with valid/invalid credentials, and token verification.<br>**VERIFY**: Run `npx jest backend/tests/auth.test.js` and verify passing assertions. |
| **B-TST-02** | `backend/tests/leads.test.js` | `backend-specialist` | `api-patterns` | P1 | B-INF-02 | **INPUT**: `backend/routes/leadManagementRoutes.js`<br>**OUTPUT**: Test suite testing lead creation, lead retrieval, editing, status transitions, and search functions.<br>**VERIFY**: Run `npx jest backend/tests/leads.test.js` and verify all CRUD operations pass. |
| **B-TST-03** | `backend/tests/invoice.test.js` | `backend-specialist` | `api-patterns` | P1 | B-INF-02 | **INPUT**: `backend/routes/unifiedInvoiceRoute.js` and `invoice.js`<br>**OUTPUT**: Test suite testing invoice generation, calculation validations, and report compilation inputs.<br>**VERIFY**: Run `npx jest backend/tests/invoice.test.js` and see arithmetic check assertions succeed. |
| **B-TST-04** | `backend/tests/notification.test.js` | `backend-specialist` | `api-patterns` | P2 | B-INF-02 | **INPUT**: `backend/routes/notificationRoutes.js`<br>**OUTPUT**: Test suite asserting notifications are recorded in DB, and verification codes are generated correctly.<br>**VERIFY**: Run `npx jest backend/tests/notification.test.js` and see mock calls to Twilio verified. |

### Phase 3: Frontend Testing
Write tests for the React application leveraging CRA's built-in testing tools.

| Task ID | Component / File | Agent | Skill | Priority | Dependencies | Details (INPUT → OUTPUT → VERIFY) |
| :--- | :--- | :--- | :--- | :---: | :--- | :--- |
| **F-TST-01** | `frontend/src/__tests__/auth/AuthContext.test.jsx` | `frontend-specialist` | `react-best-practices` | P0 | None | **INPUT**: `frontend/src/auth/AuthContext.jsx`<br>**OUTPUT**: React component test mapping context login/logout status transitions and token storage.<br>**VERIFY**: Run `npm run test -- AuthContext.test.jsx` and see local storage assertions pass. |
| **F-TST-02** | `frontend/src/__tests__/auth/login.test.jsx` | `frontend-specialist` | `react-best-practices` | P0 | F-TST-01 | **INPUT**: `frontend/src/auth/login.jsx` and `LoginAdmin.jsx`<br>**OUTPUT**: RTL tests testing user entry, input validation errors, and API submission trigger.<br>**VERIFY**: Run `npm run test -- login.test.jsx` and observe error boundary and submit mock assertions. |
| **F-TST-03** | `frontend/src/__tests__/components/Toast.test.jsx` | `frontend-specialist` | `react-best-practices` | P2 | None | **INPUT**: `frontend/src/components/Toast.jsx`<br>**OUTPUT**: Fast assertions confirming custom styles render, and auto-dismiss runs.<br>**VERIFY**: Run `npm run test -- Toast.test.jsx` with Jest fake timers. |
| **F-TST-04** | `frontend/src/__tests__/components/ClientSearchDropdown.test.jsx` | `frontend-specialist` | `react-best-practices` | P2 | None | **INPUT**: `frontend/src/components/ClientSearchDropdown.jsx`<br>**OUTPUT**: Mocking list inputs and asserting list filtering dynamically upon search string change.<br>**VERIFY**: Run `npm run test -- ClientSearchDropdown.test.jsx` and check debounce assertion. |

---

## Phase X: Final Verification Plan

To verify that the newly introduced testing suite executes flawlessly, we will execute the following step-by-step verification protocol.

### 1. Backend Verification
Run the backend test suite:
```bash
cd backend
npm run test
```
*   **Criteria**: 100% of defined tests in `backend/tests/` must pass.
*   **No Network Calls**: Console logs or test failures should not indicate unresolved external HTTP requests to Twilio/Nodemailer.

### 2. Frontend Verification
Run the frontend test suite:
```bash
cd frontend
npm run test -- --watchAll=false
```
*   **Criteria**: All tests in `frontend/src/__tests__/` must pass.
*   **No Unhandled Promise Rejections**: Axios mock interceptors should intercept all endpoint calls made during testing.

### 3. CI/CD Readiness & Security check
```bash
python .agent/skills/vulnerability-scanner/scripts/security_scan.py .
```
*   **Criteria**: Test files must not leak sensitive tokens or database credentials (environment variables or config overrides must be cleanly mocked).

---

## Rollback & Safety Plan

*   If packages installed in `backend` introduce duplicate dependencies or compatibility issues, we can revert `package.json` and `package-lock.json` immediately using:
    ```bash
    git checkout backend/package.json backend/package-lock.json
    ```
*   If Jest clashes with existing configurations, we will execute tests utilizing a standalone node command targeting a local script rather than global runners.
