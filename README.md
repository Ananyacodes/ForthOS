# 🧠 ForthOS – Task Planning Agents with FastAPI & LangGraph

![FastAPI](https://img.shields.io/badge/API-FastAPI-009688?logo=fastapi)
![LangGraph](https://img.shields.io/badge/Flow-LangGraph-blue)
![Model](https://img.shields.io/badge/Model-%20Custom--LLM-lightgrey?logo=python)

ForthOS is a lightweight multi-agent system: a **planner** & **executor** that work sequentially to break down tasks and simulate results via a customizable LLM model. It offers both an API and optional Streamlit UI.

---

## ✨ Features

- 🧠 **Planner Agent**: Generates structured plans for a given task  
- ⚙️ **Executor Agent**: Executes the plan and provides simulated results  
- 🚀 **FastAPI Endpoint**: POST `/plan` for easy integration  
- 💻 **Streamlit UI (optional)**: Frontend demo with interactive interface  
- 🔄 **LangGraph Workflow**: Modular orchestration for multi-agent flow  

---

## 🚀 Quick Start

### 1. Clone the Repo
```bash
git clone https://github.com/Ananyacodes/ForthOS.git
cd ForthOS
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Choose Your Model
- Default is `sshleifer/tiny-gpt2` (CPU-friendly).
- To use a larger LM (e.g., `falcon-7b-instruct`):
  - Update `model.py` accordingly (see comments).
  - Ensure you have the required VRAM/GPU.

### 4. Run the API Server
```bash
uvicorn main:app --reload
```
- Visit **http://localhost:8000/docs** to explore the `/plan` endpoint.

### 5. (Optional) Launch the UI
```bash
streamlit run streamlit_app.py
```

---

## 🧪 Example API Usage

**Request (POST `/plan`):**
```json
{ "task": "Organize a community outreach event" }
```

**Response:**
```json
{
  "task": "Organize a community outreach event",
  "plan": "...generated plan text...",
  "result": "...simulated execution result..."
}
```

---

## 💡 Model Info & Upgrade Path

- `sshleifer/tiny-gpt2` – lightweight, CPU-ready
- Easily swap in any HF model in `model.py`, e.g., `falcon-7b-instruct`

Upgrade example:
```python
model_id = "tiiuae/falcon-7b-instruct"
tokenizer = AutoTokenizer.from_pretrained(model_id, trust_remote_code=True)
model = AutoModelForCausalLM.from_pretrained(model_id, trust_remote_code=True, …
```

---

## 🔧 Next Steps / Improvements

- Add agent memory or context persistence
- Swap to more powerful models or external APIs
- Implement input validation and error handling
- Expand UI (like Swagger UI or Streamlit enhancements)

---

## 👤 Author

Built by **Ananya** ([Ananyacodes](https://github.com/Ananyacodes)) 💡

---

## 📜 License

This project is licensed under the **MIT License** — feel free to use and adapt!
# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.
