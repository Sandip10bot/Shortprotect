from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

app = FastAPI()

@app.get("/token/{token}")
async def check_token(token: str, request: Request):
    # Dummy bypass detect logic
    if token.startswith("gAAAAA"):
        return JSONResponse(
            {"error": "Bypass detected!"},
            status_code=403
        )
    return {"status": "ok", "token": token}
