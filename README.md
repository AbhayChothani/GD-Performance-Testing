# PageSpeed QA Report Generator

A clean, modern, production-ready web application built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, and **`exceljs`** that automates website performance testing via Google PageSpeed Insights and generates reports matching the exact structure, styling, and formatting of `Book.xlsx`.

---

## 🚀 Key Features

### 1. Input & Automation
- **Bulk URL Input**: Multi-line textarea to paste one or dozens of target URLs.
- **Spreadsheet / CSV Importer**: Drag-and-drop or upload `.xlsx`, `.xls`, or `.csv` files to auto-extract URLs.
- **Sitemap XML Crawler**: Fetch all live URLs automatically from any site's `/sitemap.xml` (with support for sitemap indexes).
- **Giriraj Digital Demo Preset**: One-click button to load the exact 41 audited pages from `Book.xlsx` or 10 sample URLs.

### 2. Backend PageSpeed Audit Engine (`/api/pagespeed`)
- Automatically runs **two** audits for each URL (`Mobile` and `Desktop`).
- Automatically derives clean Page Names from page `<title>` tags or URL paths (e.g., `/services/product-engineering/` ➔ `Product Engineering`).
- Extracts exact metrics:
  1. `Performance` score (`0–100`)
  2. `Accessibility` score (`0–100`)
  3. `Best Practices` score (`0–100`)
  4. `SEO` score (`0–100`)
  5. `Total Blocking Time (ms)` (numeric integer)
  6. `Links` (instant screenshot view + preview modal)
  7. `Link for Detail Description` (direct live Google PageSpeed analysis link)
  8. `Comment` (editable inline QA notes)
- Supports optional `PAGESPEED_API_KEY` for high-volume quota.

### 3. Exact Spreadsheet Table (2 Rows per URL, 12 Columns)
Matches `Book.xlsx` down to the exact column sequence:
1. `Sr. No.` (sequential integer per device row: 1, 2, 3, 4...)
2. `Page Name` (vertically merged / `rowspan=2` across Mobile and Desktop)
3. `Page URL` (vertically merged / `rowspan=2`, clickable hyperlink)
4. `Screen Type` (`Mobile` on top row, `Desktop` on bottom row)
5. `Performance` (Google Lighthouse color-coded cell: Green `#38761D` for 90–100, Yellow `#FFFF00` for 50–89, Red `#FF0000` for 0–49)
6. `Accessibility` (same color rule)
7. `Best Practices` (same color rule)
8. `SEO` (same color rule)
9. `Total Blocking Time (ms)` (right-aligned integer)
10. `Links` (clickable **"View Screenshot"** link with lightbox preview modal)
11. `Link for Detail Description` (clickable link to `pagespeed.web.dev`)
12. `Comment` (editable inline text input cell per row for QA engineer notes)

### 4. Styled Excel (`.xlsx`) Export & Google Sheets Copy
- **Downloadable `.xlsx` File**: Generated using `exceljs`:
  - Mint/teal header row (`#B7E1CD`) with bold borders.
  - Rows 1–5 metadata block (`Site Name`, `Site URL`, `Environment`, `Created By`, `Created Date`) styled with `#B7E1CD`.
  - Merged cells (`rowspan=2`) for `Page Name` and `Page URL`.
  - True RGB fill colors (`#38761D` green, `#FFFF00` yellow, `#FF0000` red) with contrasting text colors.
  - Active clickable Excel hyperlinks for Page URL, Links (screenshot), and Detail Description.
  - Custom QA comments preserved.
- **Copy for Google Sheets**: One-click copy that places rich HTML and TSV on the clipboard so pasting (`Ctrl+V`) into Google Sheets preserves exact columns, merged cells, and cell colors.

---

## 🛠️ Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Spreadsheet Generation**: `exceljs`
- **Spreadsheet / CSV Parsing**: `xlsx`
- **Icons**: Lucide React

---

## 🏃 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Development Server
```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser.

### 3. Build & Run for Production
```bash
npm run build
npm run start
```
