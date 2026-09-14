# Apo WMS

ระบบจัดการคลังสำหรับบริษัทขนาดเล็ก รองรับหลาย Client/Project

**Module 1:** Login/Logout, เปลี่ยนรหัสผ่าน, Administrator จัดการบัญชี, Role แยกตาม Project และ Permission ที่ตรวจโดย Backend
Project เริ่มต้น: Apo, Squ, Mdr — ยังไม่รวมงานรับเข้า/จัดเก็บ/หยิบ/จ่ายสินค้า

## Stack

Angular 22 + TypeScript + Tailwind CSS, Node.js 24.21.0 LTS, NestJS REST API และ PostgreSQL 18 ใน Docker

## เริ่มใช้งาน

เปิด Docker Desktop และใช้ Node 24.21.0 (Windows launcher ใช้ `.tools/node-v24.21.0-win-x64/`):

```powershell
.\.tools\node-v24.21.0-win-x64\node.exe scripts/setup-local.mjs
docker compose up -d --wait
.\backend.cmd ci
.\backend.cmd run build
.\wms.cmd ci
# Terminal 1
.\backend.cmd
# Terminal 2
.\wms.cmd
```

เปิด http://localhost:4200/login บัญชีเริ่มต้นอยู่ใน `.local/first-login.md` และต้องเปลี่ยนรหัสผ่านเมื่อเข้าสู่ระบบครั้งแรก
ใช้ `localhost` ให้ตรงกับ `APP_ORIGIN` ใน `.env` ไม่มีบัญชี demo หรือสมัครสมาชิกสาธารณะ
สคริปต์ setup ไม่เขียนทับ `.env` เดิมและ Backend ไม่รีเซ็ตรหัสผ่าน Admin เมื่อ restart

หากใช้ Node ที่ติดตั้งในระบบ ให้รัน `node scripts/setup-local.mjs` และ `npm ci`, `npm run build`, `npm start` ภายใน backend/frontend ตามลำดับ
`.tools/`, `.env`, `.local/` ไม่ขึ้น Git; ใช้ `.env.example` เป็นคู่มือ ตั้งค่า URL/รหัสผ่านให้ตรงกันหากตั้งเอง

## ตรวจสอบ

```powershell
.\backend.cmd test
.\backend.cmd run build
.\wms.cmd run test:ci
.\wms.cmd run build
# เปิด Angular ที่ localhost:4200 และหยุด API port 3000 ก่อน
# ต้องมี Microsoft Edge; runner เปิด API ทดสอบให้เอง
.\e2e.cmd
```

Backend tests และ browser tests ใช้ schema ชั่วคราวที่ขึ้นต้น `test_` และลบเมื่อจบ ไม่แก้ข้อมูลใช้งานใน public schema
หลัง browser tests ให้เปิด `.\backend.cmd` อีกครั้งสำหรับลองด้วยตนเอง
อ่านขั้นตอนใน [คู่มือทดสอบ Module 1](docs/MODULE1-TEST.md)

## เอกสาร

- [Requirement](docs/Prompt%20%E2%80%94%20WMS%20MVP%20for%20Small%20Warehouse.md)
- [แบบ Module 1](docs/superpowers/specs/2026-09-14-module1-access-design.md)
- [แผน Module 1](docs/superpowers/plans/2026-09-14-module1-access.md)
- [ประวัติต้นแบบ UI](docs/PROTOTYPE-REVIEW.md)

พัฒนาทีละ Module และหยุดให้เจ้าของงาน Review ก่อนเริ่ม Module ถัดไป
`exp/` เป็น source อ้างอิงเดิม ไม่รวมใน repository นี้

## UI design skill

ติดตั้งเฉพาะโปรเจกต์จาก [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill):

```sh
npx ui-ux-pro-max-cli init --ai codex
```

`.agents/` เป็นเครื่องมือ local ไม่ commit รวมกับ source แอป
