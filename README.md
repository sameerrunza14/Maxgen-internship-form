# Maxgen Internship Application — Frontend

React + Vite + Tailwind CSS (v4). Plain JavaScript, no TypeScript.

## Run locally

```bash
npm install
npm run dev        # http://localhost:5173
```

## Logo

The company logo is at `public/logo.png` (same file as on maxgentechnologies.com, with the empty
border trimmed). To change it, replace that file.

## Build for production

```bash
npm run build      # output goes to dist/
```

## Folder structure

```
src/
├── App.jsx
├── index.css                    Tailwind import + Maxgen brand colours
├── constants/formOptions.js     All options, documents, steps and declaration text
├── utils/validation.js          Validation rules for every field and step
├── services/applicationApi.js   Builds the FormData and sends it to the backend
├── admin/                       Admin panel: sign in, applications list, application details
└── components/
    ├── ApplicationPage.jsx      Main page: form state, step navigation, submit
    ├── layout/                  Logo, header, hero, stepper, success screen
    ├── steps/                   One file per step (Personal, Education, Internship, Documents, Review)
    └── ui/                      Reusable inputs, choice cards, file upload
```

## Admin panel

Open `/admin` (e.g. http://localhost:5173/admin) and sign in with an account created by
`npm run create-admin` in the backend folder. HR can search and filter applications, open every detail and
document, and accept or reject. The admin pages are loaded only when `/admin` is opened, so students filling
the form do not download them. `vercel.json` makes `/admin` links work on Vercel.

## Backend

The form sends applications to the Node.js + Express + MongoDB backend in the `backend` folder
(`POST /api/applications`). During development, run the backend on port 5000 and the frontend with
`npm run dev`; Vite forwards `/api` requests to the backend (see `vite.config.js`). Setup steps are in
`backend/README.md`.

## Notes

- Field names and option values must match `backend/src/constants/applicationOptions.js`.
- Text answers are saved in the browser (localStorage) so a page refresh does not lose them.
  Uploaded files are not saved and must be selected again after a refresh.
