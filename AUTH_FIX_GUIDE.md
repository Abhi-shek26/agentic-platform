# Authentication Gateway Fix - Complete Guide

## What Was Fixed

### Problem 1: Hard-coded API URLs
**Issue:** Login component used hardcoded `http://localhost:5000` instead of environment variable  
**Fix:** Now uses `import.meta.env.VITE_API_URL` for consistency

### Problem 2: No 401 Error Handling
**Issue:** When token expires or is invalid, app would fail with blank 401 errors  
**Fix:** Now automatically redirects to login when receiving 401 response

### Problem 3: Token Not Being Persisted Across Requests
**Issue:** Token was generated but not properly stored in server memory  
**Fix:** Improved token storage and validation logging

### Problem 4: Confusing Login/Signup UX
**Issue:** Form state didn't clear, users got stuck on signup form  
**Fix:** Added mode indicators, error clearing, and success feedback

---

## How to Test

### Option 1: Full Development Setup (Recommended)

```bash
# 1. Start all services (backend, frontend, database, redis)
npm run dev:full

# The app will run on:
# - Frontend: http://localhost:5173
# - Backend: http://localhost:5000
# - API Docs: http://localhost:5000/
```

### Option 2: Backend Only

```bash
# 1. Start Docker services (PostgreSQL + Redis)
npm run dev:services

# 2. Start backend server (in another terminal)
npm run dev

# 3. Start frontend client (in another terminal)
npm run dev:client
```

### Option 3: Manual Backend Testing

```bash
# 1. Start backend
npm run dev

# 2. Test signup
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "TestPass123",
    "displayName": "Test User"
  }'

# Response should include a token:
# {
#   "success": true,
#   "user": { ... },
#   "token": "long-hex-string"
# }

# 3. Test login with that token
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123"
  }'

# 4. Make authenticated request with token
curl http://localhost:5000/api/projects \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## Complete Test Workflow

### 1. **Signup Test**
```
✓ Go to http://localhost:5173
✓ Click "Need an account? Sign Up"
✓ Fill in form:
  - Email: newuser@test.com
  - Username: newuser123
  - Password: MyPass@123 (uppercase, lowercase, number, 8+ chars)
  - Display Name: New User
✓ Click "Sign Up"
✓ See success message: "Account created successfully! Logging in..."
✓ Auto-redirects to dashboard
```

### 2. **Login Test**
```
✓ Click Logout
✓ Should show login form by default
✓ Enter email: newuser@test.com
✓ Enter password: MyPass@123
✓ Click Login
✓ Should immediately redirect to dashboard
```

### 3. **Invalid Credentials Test**
```
✓ Go to login
✓ Enter email: nonexistent@test.com
✓ Enter password: wrongpassword
✓ Click Login
✓ Should show error: "Invalid credentials"
✓ Should stay on login page (not redirect)
```

### 4. **Token Validation Test**
```
✓ Login successfully
✓ Open browser DevTools (F12)
✓ Go to Application > Local Storage
✓ Verify "authToken" exists and has a long hex value
✓ Refresh the page
✓ Should still be logged in (token verified)
✓ If you delete authToken and refresh, should redirect to login
```

### 5. **401 Error Handling Test**
```
✓ Login successfully
✓ Open DevTools Network tab
✓ Check a request to /api/projects (should have Authorization header)
✓ If backend returns 401:
  - Should automatically clear token
  - Should redirect to login page
  - Should show login form
```

---

## Debug Commands

### Check token in backend
```bash
curl http://localhost:5000/api/auth/debug
```

Response shows all tokens currently in server memory:
```json
{
  "tokensInMap": 1,
  "tokens": [
    {
      "token": "5cc240689545...",
      "user": "test@example.com"
    }
  ]
}
```

### Verify token is valid
```bash
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Should return user info if valid, 401 if invalid.

---

## Common Issues & Solutions

### Issue: "Token not found in mapping"
**Cause:** Server restarted after login (tokens are in-memory only)  
**Solution:** Log out and log back in to get a new token

### Issue: Always redirected to login
**Cause:** Token is expired or invalid  
**Solution:** Clear localStorage and try again
```javascript
localStorage.removeItem('authToken');
```

### Issue: CORS errors
**Cause:** API URL not matching backend URL  
**Check:** Verify `VITE_API_URL` in .env or browser console logs  
**Fix:** Update .env: `VITE_API_URL=http://localhost:5000`

### Issue: Can't create account with duplicate email
**Cause:** Email already registered  
**Solution:** Use a different email or clear the in-memory storage by restarting server

---

## What Happens Behind the Scenes

### Signup Flow
```
1. User fills form → sends to POST /api/auth/signup
2. Backend validates inputs
3. Backend creates user in storage
4. Backend generates random token
5. Backend stores token → user mapping in memory
6. Backend returns { success, user, token }
7. Frontend stores token in localStorage
8. Frontend dispatches onSuccess callback
9. App component detects token and renders dashboard
```

### Login Flow
```
1. User fills form → sends to POST /api/auth/login
2. Backend finds user by email
3. Backend verifies password with bcrypt
4. Backend generates new token
5. Backend stores token → user mapping in memory
6. Backend returns { success, user, token }
7. Frontend stores token in localStorage
8. Frontend dispatches onSuccess callback
9. App component renders dashboard
```

### Authenticated Request Flow
```
1. Frontend makes API request with Authorization header
2. Backend requireAuth middleware extracts token
3. Backend looks up token in tokenToUser map
4. If found: continue with request
5. If not found: return 401 error
6. Frontend catches 401 error
7. Frontend clears localStorage and token state
8. Frontend dispatches 'api:unauthorized' event
9. App component detects event and redirects to login
```

---

## Files Changed

1. **client/src/pages/Login.tsx**
   - Use environment API_BASE instead of hardcoded localhost
   - Add error/success clearing on mode toggle
   - Add token validation before storage
   - Add visual feedback for current mode
   - Disable inputs during loading

2. **client/src/lib/api.ts**
   - Add handleApiResponse wrapper
   - Check for 401 responses
   - Dispatch event to App for unauthorized errors
   - Clear localStorage on 401

3. **client/src/App.tsx**
   - Verify token on mount
   - Listen for 'api:unauthorized' event
   - Auto-redirect to login on 401

4. **server/routes.ts**
   - Improved login endpoint logging
   - Improved signup endpoint logging
   - Better requireAuth middleware with detailed logging
   - Added /api/auth/debug endpoint for troubleshooting
   - Consistent token response format

---

## Next Steps (Future Improvements)

1. **Persistent Token Storage:** Store tokens in database instead of in-memory
2. **Token Expiration:** Add token expiry timestamps
3. **Refresh Tokens:** Implement refresh token rotation
4. **Session Cookies:** Use httpOnly cookies for better security
5. **Rate Limiting:** Add rate limiting on auth endpoints
6. **Email Verification:** Add email confirmation for new accounts
7. **Password Reset:** Implement forgot password flow
