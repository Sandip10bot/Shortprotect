from fastapi import FastAPI
from fastapi.responses import RedirectResponse, HTMLResponse
import secrets

app = FastAPI()

# Temporary storage (production में DB use करो)
valid_tokens = {}

@app.get("/gen/{link_id}")
def generate_link(link_id: str):
    """Generate protected link"""
    token = secrets.token_urlsafe(16)
    original_link = f"https://softurl.in/{link_id}"
    valid_tokens[token] = original_link
    return {"protected": f"https://yourapp.vercel.app/go/{token}"}

@app.get("/go/{token}")
def go(token: str):
    """Redirect if valid token else show bypass message"""
    if token in valid_tokens:
        target = valid_tokens.pop(token)  # one-time use
        return RedirectResponse(target)  # final = softurl link
    else:
        return HTMLResponse("<h1>🚫 Bypass Detected</h1>", status_code=403)
