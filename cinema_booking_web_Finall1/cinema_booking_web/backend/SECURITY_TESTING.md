# Testing the Security Enhancements

Here is how you can test each security mechanism using `curl` or Postman:

### 1. Rate Limiting for Login Attempts
Send 6 consecutive POST requests to the login endpoint within 15 minutes.
```bash
for i in {1..6}; do
  curl -X POST http://localhost:5000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@test.com", "password":"wrongpassword"}'
done
```
**Expected Result**: The 6th request will return a `429 Too Many Requests` status code with the message `"Too many login attempts from this IP..."`.

### 2. Account Lockout (Broken Authentication Protection)
1. Register a user.
2. Send exactly 5 failed login attempts (`POST /auth/login`) with the **Wrong** password for that valid user email. Wait between attempts so you don't hit the IP rate limiter, or modify the rate limiter limits temporarily for testing.
3. On the 5th attempt, the user document in the database updates `lockUntil`.
4. Try to login one more time.
**Expected Result**: You will receive a `423 Locked` response with `"Account is temporarily locked due to multiple failed login attempts. Try again later."`

### 3. Object-Level Authorization (BOLA Detection)
1. Register **User A** and login to get `TOKEN_A`.
2. Register **User B** and login to get `TOKEN_B`.
3. Create a booking using `TOKEN_A` via `POST /booking`. Note the returned `bookingId`.
4. Send a delete request using `TOKEN_B`:
```bash
curl -X DELETE http://localhost:5000/booking/[bookingId] \
-H 'Authorization: Bearer [TOKEN_B]'
```
**Expected Result**: The backend will detect you are trying to manipulate another user's booking and return a `403 Forbidden` response. The event will also be logged as a "BOLA Attack Vector Detected" in the server console/logs.

### 4. Database Encryption
1. Register a new user with an email and phone number.
2. Open your MongoDB GUI (e.g., MongoDB Compass) or use the mongo shell and inspect the `users` collection.
**Expected Result**: You will see the `email` and `phone` fields look like encrypted strings (e.g., `__enc_email: true, email: '[encrypted_gibberish]'`), completely unreadable if the database were compromised.

### 5. NoSQL Injection Prevention
Attempt to bypass the login by using NoSQL operators in the JSON payload:
```bash
curl -X POST http://localhost:5000/auth/login \
-H 'Content-Type: application/json' \
-d '{"email": {"$gt": ""}, "password": "pass"}'
```
**Expected Result**: `express-mongo-sanitize` strips out keys beginning with `$` or contains `.`, rendering the attack useless. Or, the strict `Joi` validation we added will reject the payload immediately returning a `400 Bad Request` because email must be a strict string, not an object.

### 6. CSRF Protection (Double Submit Cookie)
1. Get a CSRF token and cookie:
```bash
curl -i http://localhost:5000/auth/csrf-token
```
2. Try a state-changing request **without** CSRF header/cookie:
```bash
curl -X POST http://localhost:5000/auth/login \
-H 'Content-Type: application/json' \
-d '{"email":"test@test.com", "password":"Wrong123!"}'
```
**Expected Result**: `403` with `"Missing CSRF token"`.

3. Retry with both cookie and `X-CSRF-Token` header matching the received token.
**Expected Result**: request is processed normally (success/failure depends on credentials, not CSRF).
