# schools.fyi

A dependency-free, source-linked explorer for comparing Ontario math and language learning paths across curriculums and independent schools.

## Run locally

No install or build is required:

```bash
python3 -m http.server 4173
```

Open <http://localhost:4173>. Data lives in `data.js`; the interface is plain HTML, CSS, and JavaScript so it can be hosted on any static file service.

## Information architecture

- **Curriculums** are canonical standards or programs: Ontario, AP, IB, and Kumon.
- **Schools** are individual institutions and describe local delivery: Bayview Glen, TFS, Havergal, UCC, and others.
- Provider-native terms stay visible because an AP course, IB programme, Kumon level, and Ontario grade are not automatically equivalent.
- Ontario, Kumon Canada, and Bayview Glen are the default comparison requested for the initial release.

## Contributing data

Each provider requires an official source URL, a provider type, grade or age range, and separate Math and Language summaries. Keep summaries factual and short. Use `Not publicly documented` rather than inferring details, and describe cross-system mappings as approximate.

The data is deliberately isolated from rendering code so it can later move to reviewed JSON submissions or an API without rebuilding the interface.

## Deployment

GitHub Pages deployment is defined in `.github/workflows/pages.yml`. In repository settings, set **Pages → Source** to **GitHub Actions**. Every push to `main` publishes the static site as an artifact.
