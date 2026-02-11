# 🕵️ UX Mystery Shopper Agent
### Autonomous Perception-First Product Testing

> **"It doesn't inspect code. It looks, it clicks, and it feels frustration."**

---

## 📖 Overview

**UX Mystery Shopper** is a synthetic user system that continuously tests your product the way real humans experience it—not the way engineers think it works. 

Unlike traditional E2E testing tools (Selenium, Cypress) that rely on DOM selectors and check if code "technically" works, our agents use **Visual Perception** and **Multimodal AI** to navigate signup flows. They detect UX friction, measure confusion, and explain *why* real users would drop off before revenue is lost.

## 💥 The Problem
Traditional QA testing fails to catch the silent revenue killers:
* **Bad UX:** Flows that are functional but confusing.
* **Cognitive Overload:** Too much text, ambiguous buttons, or "trust-breaking" layouts.
* **Silent Friction:** Issues that don't throw console errors but cause user abandonment.

## 🧠 How It Works: The "Three Brains" Architecture

Our agents don't just follow a script; they operate using a unique three-layer cognitive model:

### 1. 👁️ Brain 1: Vision (Perception)
The agent uses multimodal AI (GPT-4o/Gemini Vision) to "see" the UI just like a human.
* *Instead of:* `document.querySelector('#btn-submit')`
* *It sees:* "I see a blue 'Continue' button, but it looks visually disabled."

### 2. 🧭 Brain 2: Intent (Reasoning)
The agent is given a high-level goal (e.g., *"Sign up as a new user from France"*). It autonomously reasons through the flow:
* "I need to find the email field."
* "That popup looks like an ad, I should close it."

### 3. 📉 Brain 3: Emotion (Friction Detection)
The agent tracks its own hesitation and "Confusion Score" (0.0 - 1.0). It logs behavioral signals:
* **Backtracking** (Clicking, then going back)
* **Repeated Hovering** (Searching for cues)
* **Long Pauses** (Reading complex text)
* **Rage Clicks** (Simulated frustration)

---

## ✨ Key Features

### 💭 The "Live Thought Bubble"
Watch the agent think in real-time. We overlay a thought bubble on the screen showing the AI's internal monologue:
> *"I'm looking for the 'Next' button... I see two buttons... I'm confused which one is for new users."*

### 👵 The "Grandma Test" (Persona Modes)
Run tests with different synthetic personalities:
* **The Power User:** Skips instructions, clicks fast, gets annoyed by popups.
* **The Non-Tech User ("Grandma"):** Reads everything slowly, hesitates on icons without text labels, easily overwhelmed.

### 🤬 Rage-Click Simulation
If the **Confusion Score** exceeds a critical threshold (e.g., >0.8), the agent mimics extreme frustration by "rage clicking" or jiggling the mouse erratically before abandoning the flow—simulating a real user rage-quit.

### 🔥 Competitor "Roast" Mode
Input a competitor's URL to compare flows side-by-side.
* *Output:* "Your signup friction is 0.4, but [Competitor] is 0.1 because they ask for credit card *after* onboarding."

### 🛠️ Auto-Fix Suggestions (The Junior Designer)
The system doesn't just complain; it suggests solutions.
* *Example:* "Friction detected: Ambiguous copy. **Suggested Fix:** Change button text from 'Go' to 'Create Free Account'."

---

## 🏗️ Tech Stack

### Frontend (Dashboard)
* **React:** Interactive dashboard to view timeline runs.
* **Vite:** Fast tooling.
* **Tailwind CSS:** For rapid UI development (Confusion Meters, Timeline).
* **Framer Motion:** Smooth animations for the "Thought Bubble."

### Backend (Agent Runner)
* **Node.js (Express):** API and Agent Queue management.
* **Playwright:** The body of the agent (Navigation, Clicks, Screenshots).
* **LangChain.js:** Orchestrating the "Chain of Thought" (Observation → Reasoning → Action).

### AI & Intelligence
* **Multimodal LLMs (GPT-4o / Gemini 1.5 Pro):** The vision and reasoning engine.

---

## 🚀 Getting Started

### Prerequisites
* Node.js v18+
* OpenAI/Gemini API Key

### Installation

1. Clone the repo
   ```bash
   git clone [https://github.com/yourusername/ux-mystery-shopper.git](https://github.com/yourusername/ux-mystery-shopper.git)
 
hahaa