GRAYLINE MANAGEMENT FRONTEND
=============================

Included pages:
- index.html       Login and signup
- dashboard.html   Overview and summary
- storage.html     Storage CRUD
- people.html      Employee and task management
- css/style.css    Gray visual identity and responsive layout
- js/*.js          API integration and page behavior

INSTALLATION
------------
1. Copy the "css" and "js" folders and all four HTML files into the
   "static" folder beside your FastAPI main.py.

   Expected structure:
   project/
     main.py
     database.db
     static/
       index.html
       dashboard.html
       storage.html
       people.html
       css/style.css
       js/app.js
       js/auth.js
       js/dashboard.js
       js/storage.js
       js/people.js

2. Ensure your backend mounts the folder:
   app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

3. Start FastAPI:
   python -m uvicorn main:app --reload

4. Open:
   http://127.0.0.1:8000/static/index.html

API CONNECTION
--------------
The frontend uses the same origin as the page by default.
If frontend and backend are hosted on different origins, set the API base
before loading the page in the browser console:
   localStorage.setItem("grayline_api", "http://127.0.0.1:8000")
Then reload the page. Configure CORS on FastAPI for cross-origin hosting.

AUTHORIZATION
-------------
- Signup creates a regular user.
- Login stores the returned JWT in localStorage.
- Authenticated requests send Authorization: Bearer <token>.
- Admin-only controls are hidden for regular users.
- Backend authorization remains the real security boundary.

BACKEND NOTES
-------------
- The frontend expects /me to return the user object with id, username,
  email, phone, role.
- It expects /storage, /employees and /tasks to return JSON arrays/object
  as in the corrected backend.
- /update_quantity/{id} expects quantity as a query parameter.
- Current backend creates tasks for the admin's own account only. There
  is no task assignment UI because the API has no assignment endpoint.
- Employee login is not included: employees are records, not users in the
  current backend authentication model.
- Signup validates email with the browser input type, while backend
  validation remains authoritative.

SECURITY
--------
For production, use HTTPS and a strong SECRET_KEY environment variable.
JWT in localStorage is convenient for this simple frontend but is more
exposed to token theft if the site has an XSS vulnerability. Consider
HttpOnly Secure SameSite cookies for a production deployment.
