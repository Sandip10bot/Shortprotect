from pymongo import MongoClient
import secrets, time

# Connect to MongoDB (replace with your URI)
client = MongoClient("mongodb+srv://sandipchava10ninfinity:sandipchava10ninfinity@cluster0.y02jh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0")
db = client["shortlink_db"]
tokens = db["auth_tokens"]

# Create TTL index for expiry
tokens.create_index("expires_at", expireAfterSeconds=0)

def handler(request, response):
    path = request["path"]  # URL path (e.g. /api/shortlink/abc123)
    query = request.get("query", {})  # query params

    # Handle shortlink: /api/shortlink/<token>
    if path.startswith("/api/shortlink/"):
        token = path.split("/")[-1]

        auth_key = secrets.token_urlsafe(16)
        expiry_time = int(time.time()) + 120  # 2 minutes

        tokens.insert_one({
            "auth_key": auth_key,
            "token": token,
            "expires_at": expiry_time
        })

        redirect_url = f"/api/token/{token}?auth={auth_key}"
        response.status_code = 302
        response.headers["Location"] = redirect_url
        return response

    # Handle token: /api/token/<token>
    if path.startswith("/api/token/"):
        token = path.split("/")[-1]
        auth = query.get("auth")

        if not auth:
            response.status_code = 403
            response.body = "⚠️ Bypass Detected! Please use the short link."
            return response

        entry = tokens.find_one_and_delete({"auth_key": auth, "token": token})
        if not entry:
            response.status_code = 403
            response.body = "⚠️ Bypass Detected! Invalid or expired key."
            return response

        response.status_code = 200
        response.body = f"✅ Access granted for token: {token}"
        return response

    # Default: not found
    response.status_code = 404
    response.body = "Not Found"
    return response
