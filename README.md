
# ByteJudge – Online Coding Judge Platform

ByteJudge is a full-stack online coding judge platform where users can solve programming problems, write and execute code, and submit solutions for automated evaluation.

It supports Java and Python execution using Docker containers and integrates Google's Gemini API to provide AI-powered code reviews for submitted solutions.

## 🚀 Features

### 👨‍💻 User Features
- User registration and login.
- JWT-based authentication using HTTP-only cookies.
- Browse and search coding problems.
- Filter problems by difficulty.
- Solve problems using an integrated Monaco code editor.
- Run code against sample test cases.
- Submit solutions for evaluation against judge test cases.
- View submission history and execution results.
- Track solved problems and submission statistics.
- Save code for individual problems and programming languages.
- Get AI-powered code reviews for submissions.

### 🔐 Admin Features
- Admin dashboard.
- Create and manage coding problems.
- Configure problem descriptions and test cases.
- Manage problem difficulty levels.

### ⚙️ Code Execution Engine
- Supports Java 17 and Python 3.12.
- Docker-based isolated code execution.
- Compilation and runtime error detection.
- Execution timeout handling.
- Memory and CPU resource limits.
- Network access disabled inside execution containers.
- Evaluates multiple test cases.

### 🤖 AI Code Review
- Integrated with Google Gemini API.
- Generates code reviews for submissions.
- Provides feedback on:
  - Code summary.
  - Correctness.
  - Time complexity.
  - Space complexity.
  - Potential issues.
  - Improvement suggestions.
- Saves generated reviews to avoid unnecessary repeated generation.

## 🛠️ Tech Stack

 Frontend    ->  React.js, Vite, CSS 
 Code Editor ->  Monaco Editor 
 Backend     -> Node.js, Express.js 
 Database    ->  PostgreSQL, ORM, Prisma 
 Authentication -> JWT, HTTP-only Cookies 
 Code Execution -> Docker 
 AI Integration -> Google Gemini API 
 API Communication -> Axios 


## 🏗️ Project Architecture

```text
ByteJudge/
│
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── hooks/
│   │   └── ...
│   └── package.json
│
├── server/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   └── server.js
│   └── package.json
│
└── README.md
```

*The Docker executor is maintained as a separate execution service.*

## 🔄 How It Works

### 1. Authentication
- Users register and log in.
- The backend generates a JWT.
- JWT is stored in an HTTP-only cookie.
- Authentication middleware verifies protected requests.

### 2. Code Execution
- Users write code in the Monaco editor.
- The frontend sends code and language information to the backend.
- The execution service creates an isolated Docker container.
- Java code is compiled before execution.
- Python code is executed directly.
- The code runs against the provided test cases.
- Execution results are returned to the frontend.

### 3. Code Submission
- Users submit their solutions.
- The judge evaluates the solution against all test cases.
- Submission status and execution metrics are stored in PostgreSQL.
- Users can view their submission history.

### 4. AI Code Review
- Users request an AI review for a submission.
- The backend sends submission details to Gemini.
- Gemini generates structured feedback.
- The review is stored in the database and displayed in the submission details page.

## ⚙️ Installation and Setup

### Prerequisites

Make sure you have installed:

- Node.js
- npm
- Docker Desktop
- PostgreSQL or a Supabase PostgreSQL database
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/gayatrideshmukh25/OnlineJudge.git

cd OnlineJudge
```

### 2. Setup Backend

```bash
cd server
npm install
```

Create a `.env` file inside the `server` directory:

```env
PORT=3000
DATABASE_URL=your_database_connection_string
JWT_SECRET=your_jwt_secret
CLIENT_URL=http://localhost:5173
GEMINI_API_KEY=your_gemini_api_key
NODE_ENV=development
```

Configure the Prisma database connection and run migrations if required:

```bash
npx prisma generate
npx prisma migrate deploy
```

Start the backend:

```bash
npm start
```

### 3. Setup Frontend

Open another terminal:

```bash
cd client
npm install
```

Create a `.env` file inside the `client` directory:

```env
VITE_API_URL=http://localhost:3000/api
```

Start the frontend:

```bash
npm run dev
```

### 4. Start Docker

Make sure Docker Desktop is running.

Verify Docker:

```bash
docker ps
```

The executor requires the following images:

```bash
docker pull eclipse-temurin:17
docker pull python:3.12-slim
```

Start the executor service according to its configuration.

## 🔒 Security and Execution Isolation

- JWT authentication with HTTP-only cookies.
- Protected API routes using authentication middleware.
- Role-based access control for admin functionality.
- Docker-based execution isolation.
- Network access disabled for execution containers.
- CPU and memory limits.
- Execution timeouts to prevent long-running programs.

## 🌐 Deployment

The application uses:
- Frontend: Render
- Backend: Render
- Database: Supabase PostgreSQL

The Docker execution service is maintained separately and requires an accessible deployment for production code execution.





---

⭐ If you find this project interesting, consider giving it a star!
