# ParkTariff — Parking Tariff Management System

A full-stack parking management system with region-based access control.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React.js, Redux Toolkit, React Router v6, Tailwind CSS |
| Backend | Node.js, Express.js |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | JWT |

## Roles

| Role | Access |
|---|---|
| ADMIN | Full access — all regions, tariffs, users, reports |
| OPERATIONS | Region-scoped — only their assigned region's sessions and reports |
| USER | Personal — own sessions and history only |

## Setup

### Prerequisites
- Node.js v18+
- PostgreSQL

### Backend
```bash
cd server
npm install
cp .env.example .env        # fill in your values
npx prisma migrate dev --config prisma.config.ts
node prisma/seed.js
npm run dev
```

### Frontend
```bash
cd client
npm install
cp .env.example .env        # fill in your values
npm start
```

## Default credentials (after seeding)
- Admin: admin@parktariff.com / admin123
- Ops (Airport): ops.airport@parktariff.com / ops123
- Test user: user@parktariff.com / user123