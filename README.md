# Apo WMS

ต้นแบบระบบจัดการคลังสำหรับบริษัทขนาดเล็ก รองรับหลาย Client/Project

**สถานะ:** ต้นแบบ UI ภาษาไทย — Login → เลือก Project (Apo, Squ, Mdr) → พื้นที่ทำงาน
ยังไม่มี Backend หรือระบบยืนยันตัวตนจริง ข้อมูลและสิทธิ์ทั้งหมดเป็นการจำลอง

## Stack

Angular 22 + TypeScript + Tailwind CSS, Node.js 24.21.0 LTS
ขั้นถัดไปใช้ NestJS REST API, PostgreSQL และ Docker ตาม requirement ใน `docs/`

## เริ่มใช้งาน

ใช้ Node 24.21.0 แล้วรัน:

```sh
cd frontend
npm ci
npm start -- --host 127.0.0.1 --port 4200
```

เปิด http://127.0.0.1:4200/login ใช้ `demo` / `demo123`
สำหรับ Node แบบ local ZIP ใน Windows ใช้ `wms.cmd` ตาม [คู่มือทดลองต้นแบบ](docs/PROTOTYPE-REVIEW.md)

## ตรวจสอบ

```sh
cd frontend
npm run test:ci
npm run build
# เปิด dev server อีก terminal และต้องมี Microsoft Edge
npm run test:e2e
```

ครอบคลุม Login, การกดยืนยันซ้ำ, Project ที่ได้รับสิทธิ์, การค้นหา/สลับ Project, logout, deep links, keyboard skip link และจอ Handheld

## เอกสาร

- [Requirement](docs/Prompt%20%E2%80%94%20WMS%20MVP%20for%20Small%20Warehouse.md)
- [ขอบเขตต้นแบบ](docs/superpowers/specs/2026-09-14-login-project-design.md)
- [แผนงาน](docs/superpowers/plans/2026-09-14-login-project.md)
- [วิธีทดลองและข้อจำกัด](docs/PROTOTYPE-REVIEW.md)

พัฒนาทีละ Module และหยุดให้เจ้าของงาน Review ก่อนเริ่ม Module ถัดไป
`exp/` เป็น source อ้างอิงเดิม ไม่รวมใน repository นี้

## UI design skill

ติดตั้งเฉพาะโปรเจกต์จาก [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill):

```sh
npx ui-ux-pro-max-cli init --ai codex
```

`.agents/` เป็นเครื่องมือ local ไม่ commit รวมกับ source แอป
