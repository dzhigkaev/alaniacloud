# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

Personal DevOps / Platform Engineering portfolio website for Timur Djigkaev.

Static single-page website hosted on AWS S3 + CloudFront at:

www.alaniacloud.com

Primary goal of the site:
Present credible infrastructure engineering experience for DevOps Engineer, SRE, Platform Engineer, and Cloud Infrastructure roles.

## Source of Truth

The resume located at:

/resume/TimurDjigkaevDevopsCV.pdf

is the primary source of truth.

Claude must NOT invent or exaggerate:

- achievements
- infrastructure scale
- ML platform ownership
- certifications
- metrics
- company responsibilities

If wording feels too impressive or too broad, simplify it.

Credibility is more important than sounding impressive.

## Local Development

Run a simple local HTTP server:

```bash
python -m http.server 8000