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
├── services/applicationApi.js   Builds the FormData + submit function (currently frontend-only)
└── components/
    ├── ApplicationPage.jsx      Main page: form state, step navigation, submit
    ├── layout/                  Logo, header, hero, stepper, success screen
    ├── steps/                   One file per step (Personal, Education, Internship, Documents, Review)
    └── ui/                      Reusable inputs, choice cards, file upload
```

## Notes

- Submitting is **frontend only** right now: the data is printed in the browser console and a demo
  Application ID is shown. To connect the backend, follow the comment in `src/services/applicationApi.js`.
- Field names and option values match `backend/src/constants/applicationOptions.js` — keep both in sync.
- Text answers are saved in the browser (localStorage) so a page refresh does not lose them.
  Uploaded files are not saved and must be selected again after a refresh.
