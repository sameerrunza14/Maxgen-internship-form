# Frontend — how it works (flow)

Each flow lists the steps in order, with the file that does each step.
For what every file is, see [FILES.md](FILES.md).

**Where the backend is:**
- On your computer (`npm run dev`): calls to `/api/...` go to `http://localhost:5000` (set in `vite.config.js`).
- On Vercel: calls go to `VITE_API_URL` (the Render address).

---

## 1. App start

1. `index.html` loads `src/main.jsx`.
2. `main.jsx` starts React with the router → `App.jsx`.
3. `App.jsx` picks the page from the address:
   - `/` → `components/ApplicationPage.jsx` (the form)
   - `/admin/...` → the admin page (loaded only now)
   - any other address → back to `/`

---

## 2. Student form

```
Open page
  → load draft from the browser + load settings from the server
  → Step 1 Personal → Step 2 Education → Step 3 Internship → Step 4 Documents → Step 5 Review
  → Submit → Success screen (Application ID)
```

1. **Open** → `ApplicationPage.jsx`
   - Reads the saved draft from the browser (answers stay after a refresh; files cannot be saved).
   - `config/formConfig.js` → `GET /api/applications/config`.
     - Form closed → shows "Applications are closed" + the superadmin's message.
     - Uses the server's technologies, max technologies and passout years.
     - Removes old draft answers that are no longer allowed.
2. **Each step** → `components/steps/...Step.jsx` shows the fields (`components/ui/` inputs and cards).
   - Typing → the field is checked right away (`utils/validation.js` → `validateField`).
   - "Continue" → every field of the step is checked (`validateStep`). Errors → stay on the step and show red messages.
   - Answers are saved in the browser after every change.
3. **Documents** → `FileUpload.jsx` checks type and size. A big photo is made smaller by `utils/compressImage.js`.
4. **Review** → `ReviewStep.jsx` shows everything; "Edit" jumps back to a step. The declaration tick is required.
5. **Submit** → all steps are checked again → `services/applicationApi.js` builds the form data and sends `POST /api/applications`.
   - Server says a field is wrong → the form jumps to that step and shows the message.
   - Success → `SuccessScreen.jsx` shows the Application ID; the draft is deleted.
6. **Demo mode** (`VITE_DEMO_MODE=true`) → nothing is sent; a fake success is shown.

---

## 3. Admin sign-in

1. `/admin` → `AdminAuth.jsx` (`RequireAdmin`):
   - No token in the browser → `LoginPage.jsx`.
   - Token found → `GET /api/auth/me` checks it → page opens; `isSuperadmin` is known.
2. `LoginPage.jsx` → `adminApi.login()` → `POST /api/auth/login` → token saved in the browser → back to the page you wanted.
3. Any admin call later gets "session expired" (401) → token removed → login page (`adminApi.js` + `useErrorHandler` in `AdminUi.jsx`).
4. Superadmin-only pages also pass `RequireSuperadmin` (in `AdminUi.jsx`). HR sees "Only a superadmin can open this page".

**Forgot password:** `ForgotPasswordPage.jsx` → email link → `ResetPasswordPage.jsx` → new password → login page.
**New user:** gets a link with `&welcome=1` → `ResetPasswordPage.jsx` shows "Welcome! Set your password".

---

## 4. Applications list — `ApplicationsPage.jsx`

1. The filters live in the page address (e.g. `?status=pending&visited=today`), so Refresh and Back keep them.
2. On every filter change:
   - `adminApi.getStats()` → numbers: total, pending, accepted, rejected, new today, visited today.
   - `adminApi.listApplications()` → 10 rows per page. Page buttons at the bottom (← Previous · 1 2 3 … · Next →) keep all filters (the page number is in the address too, `?page=2`).
3. Typing in search waits 0.4 seconds before searching.
4. Each row shows: Returning tag (applied before), internship type, Status (Pending / Accepted / Rejected) and Progress (Visited → Joined; grey = not yet).
5. "N visited today" link → sets the filter `visited=today`.
6. **Download Excel** → `adminApi.downloadExcel()` with the same filters
   (with "Visited today" the button says "Download today's visitors" and the file is `Maxgen office visitors <date>.xlsx`).
7. **Backup ZIP** (superadmin) → `adminApi.downloadBackup()`.

---

## 5. One application — `ApplicationDetailPage.jsx`

1. Open → `adminApi.getApplication(id)` (details + notes + documents + other applications of the same person).
2. **Accept / Reject** → "Are you sure?" box with the "Email the student" tick → `adminApi.updateStatus()` → shows "Email sent" or a warning.
3. **Student visited the office** tick → `adminApi.updateVisited()` → shows the time and who ticked it.
   **Student joined the internship** tick → `adminApi.updateJoined()` (same way).
4. **Returning applicant** box (yellow) → all applications of this person, newest first; click one to open it.
5. **Notes** → `adminApi.addNote()`. Pencil → edit box → `adminApi.editNote()` (HR: own notes only; superadmin: any) → "(edited)".
   Superadmin can delete with ✕ → `adminApi.deleteNote()`.
6. **Letters & certificates** (`components/CertificatesSection.jsx`):
   "Upload PDF" → file picker (PDF, max 2 MB, checked in the browser and on the server) → `adminApi.uploadCertificate()` →
   green tick, "Given · date by name", "N of 3 given". View / Download → `adminApi.openCertificate()`.
   Replace = upload again. Superadmin: Remove → confirm → `adminApi.deleteCertificate()`.
   Send to student: **WhatsApp** → `adminApi.sendCertificateOnWhatsapp()` opens a new tab with `wa.me` (message + download link), HR presses Send.
   **Email** → "Email the …?" box → `adminApi.emailCertificate()` → "Emailed · date by name".
   **Documents** → `adminApi.openDocument()` gets the file with the sign-in token, then opens it in a new tab or downloads it.
7. **Edit details** (HR + superadmin) → `EditApplicationPage.jsx` → `adminApi.editApplication()` → back with "Application details saved."
8. **Move to trash** (superadmin) → confirm → `adminApi.moveToTrash()` → back to the list.
9. **In trash** → yellow-red bar with Restore (HR + superadmin) → `adminApi.restoreApplication()`.

---

## 6. Superadmin pages

| Page | What happens |
| --- | --- |
| **Reports** (`ReportsPage.jsx`) | Choose dates (`DateFilter.jsx`) → `adminApi.getReports()` → summary cards + coloured bars (green accepted, yellow pending, red rejected). |
| **Users** (`UsersPage.jsx`) | Add user → `adminApi.createUser()` → the set-password link is shown with a Copy button (also emailed). Role / on-off / new link → confirm dialog → `adminApi.updateUser()` / `sendSetupLink()`. |
| **Activity log** (`ActivityPage.jsx`) | Filters person / action / dates → `adminApi.getActivity()` → 50 per page. Tick entries (or "Select all on this page") → "Move N to trash" → confirm → `adminApi.trashActivity()`. |
| **Trash** (`TrashPage.jsx`, HR too) | HR sees only the applications list with Restore. Superadmin: tab **Applications**: `listApplications({ trash: 'true' })` → days left; Restore; Delete for ever / Empty trash need typing DELETE. Tab **Activity log**: `getActivity({ trash: 'true' })` → tick entries → `restoreActivity()` or `deleteActivityForever()` (type DELETE). |
| **Settings** (`SettingsPage.jsx`) | `adminApi.getSettings()` → edit → Save → `adminApi.saveSettings()`. "Undo changes" puts back the saved values. The form uses the new values on the next page load. |

---

## 7. Build and deploy

- `npm run dev` → development on `http://localhost:5173` (backend must run on port 5000).
- `npm run build` → makes the `dist/` folder.
- Vercel builds automatically on every `git push`. `vercel.json` makes `/admin/...` addresses work after a refresh.
- Settings on Vercel: `VITE_API_URL` = backend address. Remove `VITE_DEMO_MODE`.
