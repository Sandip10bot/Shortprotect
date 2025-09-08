from fastapi import FastAPI
from fastapi.responses import RedirectResponse, HTMLResponse
import secrets

app = FastAPI()

valid_tokens = {}

@app.get("/gen/{link_id}")
def generate_link(link_id: str):
    token = secrets.token_urlsafe(16)
    original_link = f"https://softurl.in/{link_id}"
    valid_tokens[token] = original_link
    return {"protected": f"https://mythobot.vercel.app/go/{token}"}

@app.get("/go/{token}")
def go(token: str):
    if token in valid_tokens:
        target = valid_tokens.pop(token)
        return RedirectResponse(target)
    else:
        return HTMLResponse("<h1>🚫 Bypass Detected</h1>", status_code=403)
