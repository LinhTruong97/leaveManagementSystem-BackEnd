## Description

A simple web application for managing leaves, which enables both admin, managers and their team members to efficiently request and oversee their time off. The purpose of this app is to assist individuals and teams in maintaining order and keeping their leave schedules in check.

## Link Deploy

App link: https://leave-management-system-hoailinhhhhh.netlify.app

Repo FE: https://github.com/LinhTruong97/leaveManagementSystem-FrontEnd

Repo BE: https://github.com/LinhTruong97/leaveManagementSystem-BackEnd

## Setup

### Installation

1. Clone the repository

```
git clone <repository_url>
```

2. Navigate to the project directory:

```
cd <folder_name>
```

3. Install dependencies:

```
npm install
```

### Configuration

Create a .env file to setup enviroment variables

```
PORT=""
MONGODB_URI=""
JWT_SECRET_KEY=""
END_DATE = "MM/DD"

MAIL_USERNAME = ""
MAIL_PASSWORD = ""
OAUTH_CLIENTID = ""
OAUTH_CLIENT_SECRET = ""
OAUTH_REFRESH_TOKEN = ""

REACT_APP_FRONTEND_API = ""
```

Create a serviceAccountKey.json file from firebase project to setup firebase

### Usage

```
npm run dev
```

## API Endpoints

### Authorization

```
/**
 * @route POST /auth/login
 * @description Log in with email and password
 * @body {email, passsword}
 * @access Public
 */

 /**
 * @route PUT /auth/setup/:token
 * @description Set up account
 * @body {userName, email, passsword}
 * @access Public
 */
```

### User

```
/**
 * @route GET /users/me
 * @description Get current user info
 * @body
 * @access Login required
 */

 /**
 * @route PUT /users/:userId
 * @description  Update user profile
 * @body
 * @access Login required
 */
```

### Employee

```
/**
 * @route POST /employees
 * @description Create a new employee
 * @body { fullName, email, role, reportTo, birthday}
 * @access  Login required, limit access by role (admin office)
 */

 /**
 * @route GET /employees
 * @description Get the list of full employees
 * @access Login required, limit access by role
 */

 /**
 * @route GET /employees/report-to
 * @description Get the list of full reportTo employees
 * @access Login required, limit access by role (admin office)
 */

 /**
 * @route GET /employees/:employeeId
 * @description Get specific employee
 * @access Login required, limit access by role (admin office, manager)
 */

 /**
 * @route PUT /employees/update/:employeeId
 * @description Update an employee's profile
 * @body { userName ,fullName, email, role, reportTo, gender, phone, address, birthday}
 * @access Login required, limit access by role (admin office)
 */

 /**
 * @route PUT /employees/terminate/:employeeId
 * @description Terminate an employee
 * @access Login required, limit access by role (admin office)
 */

 /**
 * @route PUT /employees/reactivate/:employeeId
 * @description Reactivate an employee
 * @access Login required, limit access by role (admin office)
 */

 /**
 * @route DELETE /employees/delete/:employeeId
 * @description  Delete an employee
 * @access Login required, limit access by role (admin office)
 */
```

### Leave

```
/**
 * @route GET /leaves/me
 * @description Get the list of my leaves
 * @access Login required
 */

 /**
 * @route GET /leaves/
 * @description Get the list of full employees leaves
 * @access Login required, limit access by role (admin office, manager)
 */

 /**
 * @route GET /leaves/pending
 * @description Get the list of pending leaves
 * @access Login required, limit access by role (admin office, manager)
 */

/**
 * @route GET /leaves/:requestId
 * @description Get a leave request
 * @access Login required
 */

 /**
 * @route GET /leaves/balance/me
 * @description Get leave balance of current user
 * @access Login required
 */

 /**
 * @route POST /leaves
 * @description Create a leave request
 * @body { categoryName, fromDate, toDate, type, reason}
 * @access Login required
 */

 /**
 * @route PUT /leaves/:requestId
 * @description Update a leave request
 * @body { categoryName, fromDate, toDate, type, reason}
 * @limit only when status is pending
 * @access Login required
 */

 /**
 * @route DELETE /leaves/:requestId
 * @description Delete a leave request
 * @limit only when status is pending
 * @access Login required
 */

 /**
 * @route PUT /leaves/approve/:requestId
 * @description Approve a leave request
 * @limit only when status is pending
 * @access Login required, limit access by role (manager, admin office)
 */


 /**
 * @route PUT /leaves/reject/:requestId
 * @description Reject a leave request
 * @limit only when status is pending
 * @access Login required, limit access by role (manager, admin office)
 */

 /**
 * @route GET /leaves/leave-by-month/:year
 * @description Get total leave taken by month
 * @limit only when status is approved
 * @access Login required, limit access by role (manager, admin office)
 */
```

### Notification

```
/**
 * @route GET /notifications
 * @description Get all notifications
 * @access Login required
 */

 /**
 * @route PUT /notifications/mark-read-all
 * @description Mark all notifications read
 * @access Login required
 */

 /**
 * @route PUT /notifications/mark-read/:notificationId
 * @description Mark single notification read
 * @access Login required
 */
```

## ERD

<img width="766" alt="Screenshot 2023-11-28 at 21 46 48 2" src="https://github.com/LinhTruong97/leaveManagementSystem-BackEnd/assets/129475892/f9e6cac0-ba59-435c-8265-5752416f6dc3">
