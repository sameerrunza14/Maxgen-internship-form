# Frontend — what is in which file

The frontend is a React app (Vite + Tailwind CSS). It has two parts:
- the **application form** for students (`/`)
- the **admin panel** for HR and the superadmin (`/admin`)

How to read this file: **file name — where it is — what it does.**
Example: `InternshipStep.jsx` is **in `src/components/steps/`** and shows step 3 of the form.

---

## 1. Project structure

```
frontend/
├── index.html                the single HTML page; React fills it
├── package.json              npm packages and commands (npm run dev, npm run build)
├── vite.config.js            Vite setup; in development sends /api calls to the backend (port 5000)
├── vercel.json               on Vercel, every address opens index.html (so /admin links work)
├── .env.example              VITE_API_URL (backend address) and VITE_DEMO_MODE
├── .oxlintrc.json            code-checker settings
├── README.md                 how to run and build
├── docs/
│   ├── FILES.md              this file
│   └── FLOW.md               how each screen works, step by step
├── public/
│   └── logo.png              Maxgen logo (also used in emails)
└── src/
    ├── main.jsx              starts React
    ├── App.jsx               all page addresses (routes)
    ├── index.css             Tailwind + brand colours + fonts
    ├── config/               demo mode and form settings from the server
    ├── constants/            all form options (technologies, durations ...)
    ├── services/             sends the form to the backend
    ├── utils/                form checks and image compression
    ├── components/           the student form
    │   ├── layout/           header, hero, stepper, FAQ, success screen, footer
    │   ├── steps/            the 5 form steps
    │   └── ui/               inputs, cards, file upload
    └── admin/                the admin panel
        ├── components/       layout, menu, buttons, dialogs, tags
        └── pages/            one file per admin page
```

---

## 2. Start files

| File | Where it is | What it does |
| --- | --- | --- |
| `main.jsx` | `src/` | Starts React and the router. |
| `App.jsx` | `src/` | The list of page addresses: `/` = form, `/admin/...` = admin pages. Admin pages load only when someone opens `/admin`, so students never download admin code. Wraps admin pages with "must be signed in" and superadmin pages with "must be superadmin". |
| `index.css` | `src/` | Tailwind, the Maxgen colours (navy `brand`, red `accent`) and the font. |

---

## 3. config, constants, services, utils (form side)

| File | Where it is | What it does |
| --- | --- | --- |
| `demoMode.js` | `src/config/` | `VITE_DEMO_MODE=true` → the form shows a "Demo preview" bar and does not really send anything (used before the backend was live). |
| `formConfig.js` | `src/config/` | Gets the form settings from the server (`/api/applications/config`): open / closed, technologies list, max technologies, passout years. If the server cannot be reached, the built-in values are used. |
| `formOptions.js` | `src/constants/` | Every option on the form: genders, qualifications, technologies (with descriptions), durations, letters, locations, internship types (Summer / Winter / Regular with months), modes, reference sources, documents and size limits, declaration text, step names. **Keep it the same as `backend/src/constants/applicationOptions.js`.** |
| `applicationApi.js` | `src/services/` | Builds the form data (fields + files) and sends it to `POST /api/applications`. Shows the server's error messages. |
| `validation.js` | `src/utils/` | Checks every field in the browser before going to the next step (same rules as the backend). Lists which fields belong to which step. |
| `compressImage.js` | `src/utils/` | Makes a photo smaller in the browser when it is over the size limit, so students can upload phone photos. |

---

## 4. The student form — `src/components/`

| File | Where it is | What it does |
| --- | --- | --- |
| `ApplicationPage.jsx` | `src/components/` | The whole form page. Keeps all answers, the current step, errors and the result. Saves a draft in the browser (so a refresh does not lose answers). Loads the form settings; shows "Applications are closed" when the form is closed. Sends the form and shows the success screen. |
| `PageHeader.jsx` | `src/components/layout/` | Top bar, the blue hero with the technologies in the background (the chosen ones light up in red), and the footer. |
| `Stepper.jsx` | `src/components/layout/` | Step list: on the left on laptop, a small bar on phone. |
| `FaqSection.jsx` | `src/components/layout/` | "Questions before you apply" below the form. |
| `SuccessScreen.jsx` | `src/components/layout/` | After submit: Application ID and next steps. |
| `Logo.jsx` | `src/components/layout/` | The Maxgen logo. |
| `PersonalStep.jsx` | `src/components/steps/` | Step 1: name, email, phone, parent phone, gender, address. |
| `EducationStep.jsx` | `src/components/steps/` | Step 2: qualification, specialization, institute, semester, passout year (this year + a few years ahead, from Settings). |
| `InternshipStep.jsx` | `src/components/steps/` | Step 3: internship type (Summer / Winter / Regular), technologies (up to the Settings limit), durations, letters, location, mode, project, reference. |
| `DocumentsStep.jsx` | `src/components/steps/` | Step 4: Aadhaar / PAN, College ID, resume (required), photo (optional). |
| `ReviewStep.jsx` | `src/components/steps/` | Step 5: everything on one screen with "Edit" links, and the declaration tick. |
| `Inputs.jsx` | `src/components/ui/` | Text box, phone box (+91), dropdown, big text box. |
| `ChoiceCards.jsx` | `src/components/ui/` | The clickable cards (one choice or many, with a maximum). |
| `FileUpload.jsx` | `src/components/ui/` | Choose / replace / remove a file, checks type and size, compresses big photos. |
| `Field.jsx` | `src/components/ui/` | Label + hint + red error message around an input. |

---

## 5. Admin panel — main files (`src/admin/`)

| File | Where it is | What it does |
| --- | --- | --- |
| `adminApi.js` | `src/admin/` | **Every call from the admin panel to the backend**: sign in, applications, stats, Excel, ZIP, documents, notes, status, visited, edit, trash, users, settings, reports, activity. Keeps the sign-in token in the browser. If the sign-in has expired, sends you to the login page. |
| `AdminAuth.jsx` | `src/admin/` | Checks the sign-in when an admin page opens. Shares the signed-in person and `isSuperadmin` with every admin page. |
| `dateRanges.js` | `src/admin/` | Date filter: Today, Yesterday, Last 7 days, This month, Last month, Custom. |
| `formatters.js` | `src/admin/` | Shows dates ("2 Nov 2026, 4:48 pm"), phones ("98765 43210") and file sizes nicely. |

### Admin components — `src/admin/components/`

| File | Where it is | What it does |
| --- | --- | --- |
| `AdminLayout.jsx` | `src/admin/components/` | Header (logo, name, role, change password, sign out) and the menu. HR sees Applications + Trash; the superadmin also sees Reports, Users, Activity log, Settings. |
| `AdminUi.jsx` | `src/admin/components/` | Shared pieces: page title, coloured message box, card, "Are you sure?" dialog (can ask to type DELETE), button styles, the "only superadmin" guard, error handler (expired sign-in → login page). |
| `DateFilter.jsx` | `src/admin/components/` | Date dropdown + From / To boxes (Reports and Activity pages). |
| `StatusBadge.jsx` | `src/admin/components/` | Pending / Accepted / Rejected badge. |
| `Tags.jsx` | `src/admin/components/` | "✓ Visited" tag and "Returning · 2nd time" tag. |
| `AuthLayout.jsx` | `src/admin/components/` | The centered layout of login / forgot / reset password pages. |
| `PasswordInput.jsx` | `src/admin/components/` | Password box with show / hide. |

### Admin pages — `src/admin/pages/`

| File | Address | Who | What it does |
| --- | --- | --- | --- |
| `LoginPage.jsx` | `/admin/login` | everyone | Sign in. |
| `ForgotPasswordPage.jsx` | `/admin/forgot-password` | everyone | Asks for the email, sends a reset link. |
| `ResetPasswordPage.jsx` | `/admin/reset-password` | everyone | Choose a new password from the email link. Shows "Welcome! Set your password" for a new user's link. |
| `ChangePasswordPage.jsx` | `/admin/password` | signed in | Change your own password. |
| `ApplicationsPage.jsx` | `/admin` | HR + superadmin | The list: numbers at the top ("new today", "visited today"), status cards, search, filters (technology, location, mode, type, visited, applicant, applied date), table on laptop / cards on phone, Visited and Returning tags, Excel download. Superadmin: ZIP backup button. |
| `ApplicationDetailPage.jsx` | `/admin/applications/:id` | HR + superadmin | One application: details, call / WhatsApp / email buttons, accept / reject (+ email tick), "Student visited the office" tick, returning-applicant history, HR notes (pencil = edit: HR own notes, superadmin any), documents (view / download). Restore when in the trash (HR + superadmin). Superadmin: Edit details, Move to trash, delete note. |
| `EditApplicationPage.jsx` | `/admin/applications/:id/edit` | superadmin | Correct the student's details. |
| `ReportsPage.jsx` | `/admin/reports` | superadmin | Totals, acceptance rate, time to decide, visited, returning, and bars by internship type, technology, month, source, duration, location, mode, qualification. |
| `UsersPage.jsx` | `/admin/users` | superadmin | Add users, change role, turn off / on, send set-password link (with Copy button). |
| `ActivityPage.jsx` | `/admin/activity` | superadmin | Who did what and when, with filters. Tick entries → "Move to trash". Lock icon = record of a log change, cannot be removed. |
| `TrashPage.jsx` | `/admin/trash` | HR + superadmin | HR: deleted applications, view and Restore only. Superadmin: two tabs. **Applications:** days left, Restore, Delete for ever, Empty trash. **Activity log** (`?tab=activity`): removed log entries, Restore, Delete for ever, Empty log trash. |
| `SettingsPage.jsx` | `/admin/settings` | superadmin | Form open / closed + message, notification emails, technologies list, technologies per student, repeat-block days, passout years ahead. |
