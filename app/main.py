from fastapi import FastAPI

app = FastAPI(title="Chambit Menu")

@app.get("/health")
def health():
    return {"status": "ok"}
