from fastapi import FastAPI

app = FastAPI(
    title="AnganAI API",
    description="Multi-Agent AI Assistant for Anganwadi Workers",
    version="1.0.0",
)

@app.get("/")
def root():
    return {
        "message": "Welcome to AnganAI API 🚀"
    }

@app.get("/health")
def health():
    return {
        "status": "healthy"
    }