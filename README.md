# 🧠 AI-CodeLab

An AI-powered coding practice platform — solve DSA problems, get hints, debug your code, and analyze complexity, all in one place.

**Live Demo:** [ai-code-lab-six.vercel.app](https://ai-code-lab-six.vercel.app)

---

## ✨ Features

- 📚 **616 DSA problems** across Easy, Medium, and Hard difficulty
- 💻 **In-browser code editor** with syntax highlighting (Monaco Editor)
- 🌐 **4 languages** — Python, JavaScript, Java, C++
- ▶️ **Run & Submit** — real code execution via Judge0
- 🤖 **AI Agent** powered by Groq (llama-3.3-70b)
  - 💡 Hints — progressive nudges without spoiling the answer
  - 🐛 Debug — analyzes your actual code against the failed test case
  - ✅ Solution — full solution with dry run on the example test case
  - 📊 Complexity — time/space analysis of your submitted code
- 👤 **Profile page** — solved count, difficulty breakdown, recent activity
- 🔐 **JWT authentication** — register and login

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, MUI, Monaco Editor |
| Backend | Spring Boot 3, Java 21 |
| Database | MongoDB Atlas |
| Code Execution | Judge0 CE |
| AI | Groq API (llama-3.3-70b-versatile) |
| Auth | JWT (jjwt) |
| Deployment | Vercel (frontend) + Render (backend) |

---


---

## 🚀 Running Locally

### Prerequisites
- Node.js 18+
- Java 21
- Maven
- MongoDB Atlas account
- Groq API key (free at [console.groq.com](https://console.groq.com))

### 1. Clone the repo
```bash
git clone https://github.com/AnshikaGoel3/AI-CodeLab.git
cd AI-CodeLab
```

### 2. Backend setup
```bash
cd ai-codelab-backend

# Create .env file
cp ../.env.example .env
# Fill in MONGODB_URI, GROQ_API_KEY, JWT_SECRET
```

```bash
# Run the backend
./mvnw spring-boot:run
# Starts at http://localhost:8080
```

### 3. Import problems (one time only)
```bash
cd dataset
pip install pymongo pandas python-dotenv
python import_problems.py
```

### 4. Frontend setup
```bash
cd ai-codelab-frontend

# Create .env file
echo "VITE_API_URL=http://localhost:8080/api" > .env

npm install
npm run dev
# Starts at http://localhost:5173
```

---

## 🔑 Environment Variables

### Backend (`.env` in `ai-codelab-backend/`)

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `GROQ_API_KEY` | Groq API key |
| `JWT_SECRET` | Random 64-char string for signing JWTs |
| `CORS_ALLOWED_ORIGINS` | Comma-separated allowed origins |

### Frontend (`.env` in `ai-codelab-frontend/`)

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend API base URL (e.g. `http://localhost:8080/api`) |

---

## 🌍 Deployment

| Service | Platform | URL |
|---|---|---|
| Frontend | Vercel | [ai-code-lab-six.vercel.app](https://ai-code-lab-six.vercel.app) |
| Backend | Render | [ai-codelab.onrender.com](https://ai-codelab.onrender.com) |
| Database | MongoDB Atlas | M0 Free Cluster |

### Render (Backend)
- Root Directory: `ai-codelab-backend`
- Runtime: Docker
- Add env vars: `MONGODB_URI`, `GROQ_API_KEY`, `JWT_SECRET`, `CORS_ALLOWED_ORIGINS`

### Vercel (Frontend)
- Root Directory: `ai-codelab-frontend`
- Add env var: `VITE_API_URL=https://ai-codelab.onrender.com/api`

---

## 📸 Screenshots

<img width="1920" height="1200" alt="image" src="https://github.com/user-attachments/assets/d37b15c1-cf9b-4dec-ba1b-621a849262a6" />
<img width="1920" height="1200" alt="image" src="https://github.com/user-attachments/assets/de424464-11eb-41d4-98cc-af5f00e95989" />
<img width="1920" height="1200" alt="image" src="https://github.com/user-attachments/assets/05d28dd7-79e5-4a0b-b153-41a703647ce8" />
<img width="1920" height="1200" alt="image" src="https://github.com/user-attachments/assets/071edca8-b9fa-45f5-8165-ad4e76ba188f" />




---

## 🧩 How the Code Execution Works

User code goes through a **preamble injection** system:

1. Each problem stores a hidden `preamble` per language in MongoDB
2. The preamble handles all stdin parsing and calls `solve(params...)`
3. The user only writes the `solve()` function body
4. Backend concatenates `preamble + userCode` before sending to Judge0
5. This keeps the editor clean and prevents boilerplate errors

---

## 👩‍💻 Author

**Anshika Goel**  
Full Stack Developer  

- GitHub: https://github.com/AnshikaGoel3

