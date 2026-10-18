# 🖥️ AlaniaCloud — Portfolio Website

Source code for my personal portfolio: **[AlaniaCloud](https://www.alaniacloud.com)** —
a fully static site hosted on **AWS S3** and served globally via **CloudFront**,
deployed through a security-hardened **GitHub Actions** pipeline.

The site is intentionally simple (a single self-contained `index.html`); the
interesting part is the **delivery and hosting setup** around it.

---

## 🌐 Live Site

**🔗 [www.alaniacloud.com](https://www.alaniacloud.com)**

---

## 🛠️ Stack

- **Frontend:** HTML5, CSS3, vanilla JavaScript — all inline in one file
- **Hosting:** Amazon S3 (private bucket)
- **CDN / TLS:** Amazon CloudFront + AWS Certificate Manager
- **CI/CD:** GitHub Actions
- **Access & config:** AWS IAM (OIDC), CloudFront policies

---

## 🔒 Security & Delivery

This is the part worth reading. The hosting setup follows current AWS and
supply-chain best practices:

- **No long-lived AWS keys.** Deploys authenticate via **GitHub OIDC** —
  GitHub mints a short-lived token and assumes a least-privilege IAM role
  scoped to this repo's `main` branch only.
- **Private origin.** The S3 bucket has **Block Public Access** on and is
  readable only by CloudFront through **Origin Access Control (OAC)** — the
  bucket cannot be reached directly.
- **Security headers** via a CloudFront response-headers policy:
  HSTS, Content-Security-Policy, `X-Frame-Options: DENY`,
  `X-Content-Type-Options: nosniff`, Referrer-Policy, Permissions-Policy.
- **Hardened CI.** GitHub Actions are **pinned to commit SHAs** (not mutable
  tags), the workflow runs with a minimal `permissions:` block, and no
  third-party action handles AWS credentials.
- **No third-party assets.** Icons are inline SVG and text uses the system
  font stack, so the page loads nothing from outside its own origin.
- **Automated updates** via Dependabot (npm + GitHub Actions, weekly).
- **Responsible disclosure** policy in [`SECURITY.md`](SECURITY.md).

---

## 📂 Project Structure

```bash
├── index.html                    # The site: HTML + CSS + JS, all inline
├── assets/
│   ├── profile.png               # Profile image (also the social preview image)
│   ├── profile-*.webp, *.jpg     # Resized avatar for the page
│   └── favicon.svg, favicon-32.png, apple-touch-icon.png
├── resume/
│   └── TimurDjigkaevDevopsCV.pdf  # Resume
├── tests/
│   ├── site.spec.js               # Playwright smoke tests (npm test)
│   └── serve.js                   # Local server with the production CSP and headers
├── playwright.config.js
├── .github/
│   ├── workflows/deploy.yaml      # CI/CD: OIDC deploy to S3 + CloudFront invalidation
│   └── dependabot.yml             # Weekly dependency & action updates
├── SECURITY.md                    # Responsible disclosure policy
└── README.md
```

---

## 🚀 Local Development

```bash
git clone https://github.com/dzhigkaev/alaniacloud.git
cd alaniacloud
python -m http.server 8000
# open http://localhost:8000
```

All markup, styles, and scripts live in `index.html`.

### Tests

```bash
npm ci
npx playwright install chromium webkit
npm test
```

`npm test` runs Playwright smoke tests in Chromium and WebKit against
`tests/serve.js`, a small static server that sends the same CSP and security
headers as CloudFront and serves only the paths the deploy uploads. The tests
cover section navigation, the skills tabs, the project sheet (close button,
Esc, backdrop, swipe), horizontal overflow from 375 to 1440 px wide, broken
links, and console or CSP errors.

---

## 📦 Deployment

Deployment is fully automated. Pushing to `main` triggers
[`.github/workflows/deploy.yaml`](.github/workflows/deploy.yaml):

1. **Authenticate** to AWS via OIDC (assume the deploy IAM role — no stored keys).
2. **Sync** `index.html`, `assets/`, and `resume/` to the private S3 bucket.
3. **Invalidate** the CloudFront cache so changes go live immediately.

---

## 📞 Connect

- **🌐 Website:** [alaniacloud.com](https://www.alaniacloud.com)
- **💼 LinkedIn:** [linkedin.com/in/djigkaev](https://www.linkedin.com/in/djigkaev)
- **📧 Email:** [timur.djigkaev@gmail.com](mailto:timur.djigkaev@gmail.com)
- **🐙 GitHub:** [github.com/dzhigkaev](https://github.com/dzhigkaev)

---

## 📄 License

Released under the [MIT License](LICENSE).
