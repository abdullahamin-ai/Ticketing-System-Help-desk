# 🎫 Helpdesk Ticketing System

![Python](https://img.shields.io/badge/Python-3.11+-3776AB.svg?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-async-009688.svg?logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB.svg?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6.svg?logo=typescript&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-8-4479A1.svg?logo=mysql&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF.svg?logo=vite&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-ready-2496ED.svg?logo=docker&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

A full-stack **helpdesk / support ticketing system** — customers raise tickets, admins assign them to agents, agents resolve them through a threaded conversation, with real-time-style notifications, attachments, and analytics. Built as a **portfolio project** to demonstrate full-stack engineering: role-based access control, async API design, and a production-style React frontend.

---

## 📑 Table of Contents

- [Overview](#-overview)
- [Features](#️-features)
- [Tech Stack](#-tech-stack)
- [Role Permissions](#-role-permissions)
- [Project Structure](#-project-structure)
- [Installation](#-installation)
- [Authentication Flow](#-authentication-flow)
- [API Examples](#-api-examples)
- [License](#-license)

---

## 📌 Overview

This system models a real support desk workflow with three roles — **Customer**, **Agent**, and **Admin** — each with a scoped view of the data. Customers open tickets and message support; admins triage and assign tickets to agents; agents work only the tickets assigned to them. The backend enforces access control at the service layer (not just the UI), and the frontend mirrors it with role-aware dashboards, a live-updating notification bell, and a responsive ticket workspace.

---

## ⚙️ Features

- 🔐 JWT authentication with role-based access control (Admin / Agent / Customer)
- 🎫 Ticket lifecycle — create, assign, reassign, status transitions, close
- 💬 Threaded messaging on each ticket
- 📎 File attachments on tickets
- 🔔 Notifications with a live unread-count badge (auto-clears stale entries on reassignment)
- 🗂 Categories for organizing tickets
- 📊 Analytics dashboard (ticket volume, status breakdown)
- 📝 Audit logging of key actions (assignment, status changes)
- 🔎 Pagination and filtering across list endpoints

<p align="center">
  <img src="images/5_Admin_dashboard.png" alt="Admin dashboard" width="720" /><br/>
  <sub>Admin dashboard — system-wide ticket health, quick actions, and status/priority breakdown</sub>
</p>

---

## 🏗 Tech Stack

<table>
<tr>
<th align="left">Layer</th>
<th align="left">Technology</th>
<th align="left">Purpose</th>
</tr>
<tr><td rowspan="6"><b>Backend</b></td><td>FastAPI</td><td>Async REST API framework</td></tr>
<tr><td>SQLAlchemy 2.0 (async)</td><td>ORM / database layer</td></tr>
<tr><td>MySQL</td><td>Relational database</td></tr>
<tr><td>Alembic</td><td>Database schema migrations</td></tr>
<tr><td>PyJWT · Passlib · bcrypt</td><td>Authentication & password hashing</td></tr>
<tr><td>Pytest · httpx</td><td>Test suite</td></tr>
<tr><td rowspan="5"><b>Frontend</b></td><td>React 18 + TypeScript</td><td>UI framework & type safety</td></tr>
<tr><td>Vite</td><td>Build tool & dev server</td></tr>
<tr><td>Tailwind CSS</td><td>Utility-first styling</td></tr>
<tr><td>Zustand</td><td>Lightweight state management</td></tr>
<tr><td>Axios · React Router · React Hot Toast</td><td>HTTP client, routing, notifications UI</td></tr>
<tr><td rowspan="2"><b>Tooling</b></td><td>Docker Compose</td><td>Containerized backend + database</td></tr>
<tr><td>Uvicorn</td><td>ASGI server</td></tr>
</table>

<p align="center">
  <img src="https://skillicons.dev/icons?i=python,fastapi,react,typescript,mysql,vite,tailwind,docker" alt="Tech stack icons" />
</p>

**Architecture at a glance:** a layered FastAPI backend (`api` → `services` → `models`/`schemas`) exposing a versioned REST API, consumed by a React SPA that mirrors backend RBAC in its routing and UI state.

---

## 🔐 Role Permissions

| Capability                     | Customer | Agent | Admin |
|---------------------------------|:--------:|:-----:|:-----:|
| Create a ticket                 | ✅       | —     | ✅    |
| View own tickets                | ✅       | —     | ✅    |
| View tickets assigned to them   | —        | ✅    | ✅    |
| View **all** tickets            | —        | —     | ✅    |
| Reply to a ticket                | ✅       | ✅    | ✅    |
| Assign / reassign tickets        | —        | —     | ✅    |
| Manage users                     | —        | —     | ✅    |
| Manage categories                | —        | —     | ✅    |
| View analytics & audit logs      | —        | —     | ✅    |

<table>
<tr>
<td width="50%">
<p align="center"><b>Agent view</b></p>
<img src="images/7_Agent_dashboard.png" alt="Agent dashboard" />
<p align="center"><sub>Only tickets assigned to the logged-in agent</sub></p>
</td>
<td width="50%">
<p align="center"><b>Customer view</b></p>
<img src="images/6_Customer_dashboard.png" alt="Customer dashboard" />
<p align="center"><sub>A customer's own tickets and support activity</sub></p>
</td>
</tr>
</table>

---

## 🏛 Project Structure

```
Ticketing System/
├── Tickeing system Backend/    # FastAPI backend
│   ├── app/
│   │   ├── api/v1/             # Route handlers
│   │   ├── models/             # SQLAlchemy models
│   │   ├── schemas/            # Pydantic request/response schemas
│   │   ├── services/           # Business logic & RBAC checks
│   │   └── core/               # Config, DB session, security
│   ├── alembic/                 # DB migrations
│   ├── tests/                   # Pytest suite
│   └── docker-compose.yml
├── helpdesk-frontend/           # React + Vite frontend
│   └── src/
│       ├── pages/               # Route-level views
│       ├── components/          # Shared UI components
│       ├── services/            # API client modules
│       └── store/                # Zustand stores
└── images/                      # Screenshots used in this README
```

---

## 🚀 Installation

### 1️⃣ Clone Repository
```bash
git clone https://github.com/<your-username>/<your-repo>.git
cd "Ticketing System"
```

### 2️⃣ Backend Setup
```bash
cd "Tickeing system Backend"
python -m venv .venv
.venv\Scripts\activate       # Windows
source .venv/bin/activate    # Mac/Linux

pip install -r requirements.txt
cp .env.example .env         # fill in DB credentials, SECRET_KEY, etc.

alembic upgrade head
uvicorn app.main:app --reload
```
API runs at `http://127.0.0.1:8000` — interactive docs at `http://127.0.0.1:8000/docs`.

<p align="center">
  <img src="images/4_Helpdesk_backend_terminal.png" alt="Backend running in terminal" width="600" /><br/>
  <sub>FastAPI backend running via Uvicorn</sub>
</p>

### 3️⃣ Frontend Setup
```bash
cd helpdesk-frontend
npm install
cp .env.example .env         # set VITE_API_BASE_URL=http://localhost:8000/api/v1
npm run dev
```
App runs at `http://localhost:5173`.

<p align="center">
  <img src="images/3_Helpdesk_frontend_terminal.png" alt="Frontend running in terminal" width="600" /><br/>
  <sub>React frontend running via Vite</sub>
</p>

### 🐳 Or run the backend with Docker
```bash
cd "Tickeing system Backend"
docker compose up --build
```

---

## 🔑 Authentication Flow

- Register via `POST /auth/register`
- Login via `POST /auth/login` to receive a JWT access token
- Send `Authorization: Bearer <token>` on every protected request
- The token's embedded role (`customer` / `agent` / `admin`) drives what each user can see and do — enforced server-side in the service layer, not just hidden in the UI

<p align="center">
  <img src="images/2_Login_page.png" alt="Login page" width="420" /><br/>
  <sub>Sign-in screen</sub>
</p>

---

## 📘 API Examples

<p align="center">
  <img src="images/1_Swagger_ui.png" alt="Swagger UI" width="720" /><br/>
  <sub>Interactive, auto-generated API reference at <code>/docs</code></sub>
</p>

| Method | Endpoint                          | Description                              |
|--------|------------------------------------|-------------------------------------------|
| POST   | `/auth/register`                   | Register a new user                       |
| POST   | `/auth/login`                      | Obtain a JWT access token                 |
| GET    | `/tickets`                         | List tickets (scoped to caller's role)    |
| POST   | `/tickets`                         | Create a new ticket                       |
| GET    | `/tickets/{ticket_id}`             | Get ticket details                        |
| POST   | `/tickets/{ticket_id}/assign`      | Assign / reassign / unassign a ticket     |
| POST   | `/tickets/{ticket_id}/status`      | Change ticket status                      |
| POST   | `/tickets/{ticket_id}/close`       | Close a ticket                            |
| GET    | `/messages`                        | List messages on a ticket                 |
| POST   | `/messages`                        | Post a reply to a ticket                  |
| GET    | `/notifications`                   | List notifications for the current user   |
| GET    | `/notifications/unread-count`      | Get the live unread notification count    |
| POST   | `/notifications/mark-read`         | Mark one, several, or all as read         |
| GET    | `/categories`                      | List ticket categories                    |
| GET    | `/analytics/tickets`               | Ticket analytics summary                  |

Full, always-up-to-date reference: interactive Swagger UI at `/docs` once the server is running.

---

## 📜 License

MIT License © 2026 — Built for educational and portfolio purposes.
