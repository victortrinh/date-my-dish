#!/bin/bash
# Pinterest API Demo Script
# Run each section one at a time during screen recording.
# Usage: Follow the steps below, copy-paste each section into your terminal.

# ============================================================
# STEP 0: Fill in your credentials (do this BEFORE recording)
# ============================================================
export PINTEREST_CLIENT_ID="1549246"
export PINTEREST_CLIENT_SECRET=""  # <-- paste your app secret here
export PINTEREST_REDIRECT_URI="https://datemydish.com/oauth/pinterest/callback"
export PINTEREST_BOARD_ID=""       # <-- paste your board ID here

# ============================================================
# STEP 1: Open the OAuth URL in your browser
# (Run this, then switch to the browser for the recording)
# ============================================================
# open "https://www.pinterest.com/oauth/?client_id=${PINTEREST_CLIENT_ID}&redirect_uri=${PINTEREST_REDIRECT_URI}&response_type=code&scope=boards:read,boards:write,pins:read,pins:write,user_accounts:read"

# ============================================================
# STEP 2: After granting access, paste the code from the URL bar
# ============================================================
# export AUTH_CODE="paste_code_here"

# ============================================================
# STEP 3: Exchange code for tokens
# ============================================================
# curl -s -X POST "https://api.pinterest.com/v5/oauth/token" \
#   -H "Authorization: Basic $(echo -n "${PINTEREST_CLIENT_ID}:${PINTEREST_CLIENT_SECRET}" | base64)" \
#   -H "Content-Type: application/x-www-form-urlencoded" \
#   -d "grant_type=authorization_code&code=${AUTH_CODE}&redirect_uri=${PINTEREST_REDIRECT_URI}&continuous_refresh=true" | python3 -m json.tool

# ============================================================
# STEP 4: Set the new access token
# ============================================================
# export PINTEREST_ACCESS_TOKEN="paste_access_token_here"

# ============================================================
# STEP 5: Create a pin (API usage demo)
# ============================================================
# curl -s -X POST "https://api.pinterest.com/v5/pins" \
#   -H "Authorization: Bearer ${PINTEREST_ACCESS_TOKEN}" \
#   -H "Content-Type: application/json" \
#   -d '{
#     "board_id": "'"${PINTEREST_BOARD_ID}"'",
#     "title": "Slow-Cooked Beef Ragu with Pappardelle Pasta",
#     "description": "Fork-tender beef chuck braised in tomatoes and red wine, served over wide pappardelle ribbons. The perfect date night pasta recipe.",
#     "link": "https://datemydish.com/en/recipes/beef-ragu-pappardelle/",
#     "alt_text": "Plate of pappardelle pasta topped with slow-cooked beef ragu and fresh parsley",
#     "media_source": {
#       "source_type": "image_url",
#       "url": "https://datemydish.com/_astro/beef-ragu-pappardelle.Ja3HguLJ.jpg"
#     }
#   }' | python3 -m json.tool

# ============================================================
# STEP 6: Show the pin on Pinterest (open your board)
# ============================================================
# open "https://www.pinterest.com/datemydish/recipes/"
