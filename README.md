# 🖥️ AlaniaCloud — Portfolio Website

Welcome to the source code of my personal portfolio website: **[AlaniaCloud](https://www.alaniacloud.com)** — a fully static site hosted on **AWS S3** and served globally via **CloudFront**.

This project showcases who I am as a DevOps Engineer — my experience, skills, resume, and contact links.

---

## 🌐 Live Website
**🔗 [www.alaniacloud.com](https://www.alaniacloud.com)**

---

## ✨ Features

- **📱 Responsive Design** — Optimized for all devices and screen sizes
- **🎨 Modern UI** — Clean, professional interface with smooth animations
- **📄 Resume Integration** — Direct access to download my latest resume
- **⚡ Fast Loading** — Static site optimized for performance
- **🌍 Global CDN** — Delivered worldwide through AWS CloudFront
- **📞 Contact Integration** — Easy access to professional contact information

---

## 🛠️ Technologies

- **Frontend:** HTML5, CSS3, JavaScript (all embedded in single file)
- **Hosting:** AWS S3 (Static Website Hosting)
- **CDN & SSL:** AWS CloudFront with SSL/TLS certificate
- **Domain:** Custom domain with HTTPS
- **Version Control:** Git & GitHub

---

## 📂 Project Structure

```bash
├── index.html       # Main HTML file with embedded CSS, JS, and complete portfolio
└── README.md        # This file
```

**Note:** This is a minimalist single-file portfolio - all styling, animations, and JavaScript are embedded directly in the HTML file for optimal performance and simplicity.

---

## 🚀 Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/dzhigkaev/alaniacloud-portfolio.git
   cd alaniacloud-portfolio
   ```

2. **Open locally**
   ```bash
   # Simply open index.html in your preferred browser
   open index.html
   # Or use a local server for testing
   python -m http.server 8000
   ```

3. **Make changes and test**
   - All code is in `index.html` - CSS, JavaScript, and HTML are embedded
   - Refresh browser to see changes
   - Test responsiveness across different devices

---

## 📦 Deployment

This site is deployed using AWS services with a simple but robust architecture:

1. **S3 Bucket** — Static website hosting for the HTML file
2. **CloudFront** — Global CDN for fast delivery and HTTPS termination
3. **SSL Certificate** — AWS Certificate Manager for secure HTTPS
4. **Custom Domain** — Professional domain with SSL/TLS encryption
5. **Simple Deployment** — Just upload `index.html` to S3 bucket

---

## 🎯 About This Portfolio

This portfolio demonstrates my expertise in:
- **Cloud Infrastructure** (AWS)
- **DevOps Practices** (CI/CD, Infrastructure as Code)
- **Web Development** (Modern frontend technologies)
- **Performance Optimization** (CDN, static hosting)
- **Security Best Practices** (HTTPS, secure hosting)

---

## 📞 Connect With Me

- **🌐 Website:** [alaniacloud.com](https://www.alaniacloud.com)
- **💼 LinkedIn:** [linkedin.com/in/djigkaev](https://www.linkedin.com/in/djigkaev)
- **📧 Email:** [timur.djigkaev@gmail.com](mailto:timur.djigkaev@gmail.com)
- **🐙 GitHub:** [github.com/dzhigkaev](https://github.com/dzhigkaev)

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

<div align="center">
  <strong>Built with ❤️ by a DevOps Engineer</strong><br>
  <em>Showcasing cloud-native solutions and modern web practices</em>
</div>