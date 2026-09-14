# ทดลองต้นแบบ Login → เลือก Project

## เปิดใช้งาน

จากโฟลเดอร์ `ApoRaviz_WMS` รัน `./wms.cmd` แล้วเปิด http://127.0.0.1:4200/login
หยุด server ด้วย Ctrl+C ใน terminal ที่เปิดอยู่

ใช้ Node.js 24.21.0 ที่ติดตั้งเฉพาะงานใน `.tools/node-v24.21.0-win-x64` ไม่เปลี่ยน Node ของระบบหรือของ Adastria เดิม
เมื่อนำไปเครื่องใหม่: ดาวน์โหลด ZIP Windows x64 ของ Node 24.21.0 จาก nodejs.org ตรวจ SHA256 กับ SHASUMS256.txt แล้วแตกลง `.tools`; รัน `./wms.cmd ci` เพื่อติดตั้งตาม package-lock.json

## บัญชีสาธิต

| ชื่อผู้ใช้ | รหัสผ่าน | ผลลัพธ์ |
|---|---|---|
| demo | demo123 | เลือก Apo, Squ, Mdr ได้ |
| empty | demo123 | แสดงกรณีไม่มี Project ที่ได้รับสิทธิ์ |

บัญชีและข้อมูลเป็นการจำลองใน Frontend ทั้งหมด ไม่มีการยืนยันตัวตนหรือสิทธิ์จริงจาก server ไม่เก็บรหัสผ่านใน browser storage; refresh จะกลับไป Login

## สิ่งที่ควรลอง

1. ส่งฟอร์มว่าง / รหัสผ่านผิด / เปิดปิดการแสดงรหัสผ่าน
2. กรอกบัญชีสาธิต แล้ว Login; ขณะรอปุ่มยืนยันจะกดซ้ำไม่ได้
3. ค้นหา `sQU` และค้นหาคำที่ไม่มีผลลัพธ์; ล้างการค้นหา
4. เข้า Apo → เปลี่ยน Project → เข้า Mdr; ชื่อ Project ต้องเปลี่ยนทุกจุด
5. ออกจากระบบ แล้วเปิด `/projects` หรือ `/workspace` โดยตรง ต้องกลับหน้า Login
6. ลองจอ Desktop, Tablet และ Handheld; ทดสอบ Tab/Shift+Tab/Enter

## คำสั่งตรวจสอบ

จาก `ApoRaviz_WMS`:

```powershell
./wms.cmd run test:ci
./wms.cmd run build
# เปิด server ในอีก terminal ก่อนทดสอบ E2E; ต้องมี Microsoft Edge
./wms.cmd run test:e2e
```

## โครงสร้าง

- `frontend/src/app/features`: login, projects, workspace
- `frontend/src/app/core`: typed mock session และ navigation guards
- `frontend/src/app/shared`: brand, icon, topbar
- `frontend/src/styles.css`: Tailwind และ design tokens; ฟอนต์ถูก bundle ภายใน ไม่มี Google Fonts runtime request
- `frontend/e2e`: ทดสอบเส้นทางใช้งานด้วย Playwright/Edge
- `.agents/skills/ui-ux-pro-max`: skill และข้อมูลแนวทาง UI ที่ติดตั้งเฉพาะโปรเจกต์

Stack ที่ติดตั้ง: Angular framework 22.1.0, Angular CLI/build 22.1.8, TypeScript 6.0.x, Tailwind CSS 4.3.3, Node 24.21.0 LTS. ใช้ lockfile เป็นแหล่งอ้างอิง patch versions จริงทั้งหมด ไม่ใช้ global Angular CLI

## ขอบเขตและการพัฒนาต่อ

ยังไม่มี NestJS, PostgreSQL, migration, การจัดการบัญชีจริง, CRUD Client/Project หรือธุรกรรมคลัง นี่คือรอบต้นแบบของ Module 1 ไม่ใช่ Module 1 ฉบับสมบูรณ์

หลังรับ UI แล้วจึงออกแบบ API/session/สิทธิ์ฝั่ง Backend ให้ชัด และแทนบริการข้อมูลจำลองโดยคงส่วนหน้าจอที่รับแล้วไว้ การอัปเกรด Angular/Node ให้ทำเป็นรอบพร้อมตรวจ compatibility, unit tests, E2E และ Build; ไม่อัปเกรดอัตโนมัติข้าม major

## Skills ที่ใช้

Brainstorming: ขอบเขตได้รับการตกลงในบทสนทนาก่อน implementation; Karpathy: แยกของใหม่ จำกัด scope และตรวจพฤติกรรมจริง; UI UX Pro Max: ใช้ Quick Reference และข้อมูล Angular สำหรับ label, focus, contrast, touch target และโครงสร้าง component. ไม่ได้รัน Python design-system generator เพราะยังไม่พบ Python runtime ที่ใช้งานได้ในเครื่อง
# เอกสารประวัติต้นแบบ

ขั้นตอนและบัญชีสาธิตด้านล่างเป็นประวัติ UI รุ่นก่อน Module 1 ให้ใช้ [คู่มือทดสอบ Module 1](MODULE1-TEST.md) สำหรับระบบปัจจุบัน
