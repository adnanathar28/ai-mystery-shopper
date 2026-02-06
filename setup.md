# 🛒 AI Mystery Shopper - Setup Guide

Welcome to the AI Mystery Shopper project! Follow these steps to set up the application on your local machine.

## 📋 Prerequisites
- **Node.js**: Ensure you have Node.js installed (v16 or higher recommended).
- **Git**: To clone/pull the repository.

---

## 🚀 Installation

### 1. Clone the Repository
```bash
git clone https://github.com/adityamatAI/lablabderiv.git
cd lablabderiv/ai-mystery-shopper
```

### 2. Backend Setup (The Brain)
Install the dependencies for the Node.js server.
```bash
# Make sure you are in 'ai-mystery-shopper' directory
npm install
```

**Configuration:**
Create a `.env` file in the `ai-mystery-shopper` root directory to store your secrets.
```bash
# Create .env file
touch .env
```
Add the following content to `.env`:
```env
OPENAI_API_KEY=your_openai_api_key_here
```

### 3. Frontend Setup (The Interface)
Install the dependencies for the React client.
```bash
cd client
npm install
```

---

## ▶️ Running the Application

You will need **two terminal windows** running simultaneously.

### Terminal 1: Start the Backend
```bash
# From 'ai-mystery-shopper' root
node src/index.js
```
*Expected Output:* `Backend running on port 3001`

### Terminal 2: Start the Frontend
```bash
# From 'ai-mystery-shopper/client'
npm start
```
*This will automatically open the dashboard at [http://localhost:3000](http://localhost:3000).*

---

## 📂 Project Structure
- **Backend**: Runs on Port `3001`. Handles AI logic (`shopper.js`) and stores session screenshots in `public/sessions/`.
- **Frontend**: Runs on Port `3000`. React Dashboard to view missions.

Happy Coding! 🤖


npm install playwright-extra puppeteer-extra-plugin-stealth run this asw