# บันทึกพักงาน — 2026-09-14

ผู้ใช้สั่งพักเพราะ token ใกล้หมด ห้ามทำต่อจนกว่าผู้ใช้จะให้เริ่มใหม่

**กฎเหล็กของผู้ใช้:** ทั้ง Backend และ Frontend ต้องมีโครงสร้างที่ดี แยกหน้าที่ตาม best practices และรองรับการพัฒนาต่อ อ่าน [AGENTS.md](../AGENTS.md) ซึ่งบันทึกข้อกำหนดประจำโปรเจกต์ก่อนลงมือ ต้องตรวจสถาปัตยกรรมควบคู่กับ tests; MVP ลดขอบเขตฟีเจอร์ ไม่ลดคุณภาพโครงสร้าง

## งานล่าสุดและสถานะ

ผู้ใช้ไม่พอใจโครงสร้าง Backend ที่รวม logic ไว้มากเกินไป ต้องการแนวปฏิบัติที่เหมาะกับการพัฒนาต่อ
ตรวจพบว่า Controller เป็นตัวส่งต่อไปยัง AccessService ก้อนใหญ่ใน backend/src/main.ts ซึ่งรวม HTTP decorators, Request/Response, validation, business logic และ SQL ไว้ด้วยกัน

ยังไม่ได้แก้โค้ด refactor ทำแล้วเฉพาะ:

- สร้าง branch `refactor/backend-layers` จาก main commit `3fe06be`
- เขียนแผน [Backend layer separation](superpowers/plans/2026-09-14-backend-layers.md)
- รัน baseline Backend integration tests: 11/11 ผ่าน
- ยังไม่ dispatch agent สำหรับ refactor; ผู้ใช้อนุญาตให้ commit/push กฎ แผน และบันทึกพักงานขึ้น GitHub แล้ว โดยยังไม่ให้เริ่มแก้โค้ดต่อ

## ทำต่อเมื่อผู้ใช้อนุญาต

**ขอบเขตเพิ่มเติมจากผู้ใช้:** Frontend ต้องแยก Component, Service และ Model ให้ชัดเจนด้วย ยังเป็นงานที่พักไว้ ไม่ใช่คำสั่งให้เริ่มแก้โค้ดทันที

### Frontend

- ตรวจโครงสร้างจริงก่อน refactor โดยเฉพาะ `frontend/src/app/core/session.ts` ซึ่งปัจจุบันรวม types/models, session state และ API ของหลาย feature ไว้ด้วยกัน
- Component รับผิดชอบ template, form state/validation, events และการแสดงผล ไม่รวม HTTP requests หรือกฎธุรกิจที่ใช้ร่วมกัน
- แยก Service ตามหน้าที่ เช่น Auth/Session, Users, Roles และ Projects ให้แต่ละ service ดูแล API หรือ state ที่เกี่ยวข้องอย่างชัดเจน ไม่ย้ายทุกอย่างไป service ก้อนเดียว
- แยก Model และ API request/response types ออกจาก service ไว้ใกล้ feature เจ้าของข้อมูล เช่น User, Project, Role, Membership, Session และ DTO ของ create/update/password หลีกเลี่ยงการประกาศซ้ำ
- แยก Guard สำหรับการนำทางและสิทธิ์ออกจาก component โดย Backend ยังคงเป็นผู้บังคับสิทธิ์จริง
- ไม่แยกไฟล์หรือเพิ่ม abstraction เพียงเพื่อให้มีหลายชั้น; form state ที่ใช้เฉพาะหน้าควรอยู่ใน component และ shared UI ไม่ควรรู้ business logic ของ feature
- คงหน้าตา electric-violet, validation Username, ปุ่มแสดงรหัสผ่าน, error/loading states และพฤติกรรมเดิม รันทดสอบ UI/guards/services และ browser flows หลัง refactor
- เขียนแผน Frontend ให้ชัดก่อนลงมือ และประสานสัญญา API กับ Backend โดยไม่เปลี่ยนขอบเขต Module1

### Backend

1. อ่านแผน backend-layers และตรวจ git status ก่อนแก้
2. แยก Controller → Service → Repository ตาม Auth, Users, Roles, Projects พร้อม feature modules, typed DTO validation pipes และ authentication/admin guards
3. main.ts เหลือ bootstrap; ย้าย app configuration/wiring ออกอย่างเหมาะสม ไม่มี AccessService ก้อนรวม
4. Controller ดูแล HTTP/cookies; Service ไม่รับ Express Request/Response; SQL อยู่ใน Repository; Service กำหนด transaction boundary และส่ง PoolClient เดียวให้ Repository ที่ร่วม transaction
5. รักษา endpoint, response/status/error messages, schema, cookie/session และพฤติกรรมเดิม ไม่เปลี่ยน ORM/เพิ่มโมดูลคลัง
6. รักษาการล็อกและตรวจสิทธิ์ซ้ำใน transaction: password reset/login/change race, admin concurrent disable, throttle reservation ก่อน await
7. รัน tests เดิม 11 รายการโดยไม่ลดความเข้มของ assertion, build, ตรวจ layer boundaries และ browser flows ด้วยฐานข้อมูลทดสอบแยก แล้ว review ก่อนส่ง GitHub

## ข้อควรระวังใน workspace

- `frontend/angular.json` มีการเปลี่ยนค่า CLI analytics ของผู้ใช้ค้างอยู่ อย่าแก้/คืนค่า/รวม commit โดยไม่ได้รับคำสั่ง
- บัญชีและข้อมูลจริงอยู่ PostgreSQL Docker service `postgres`, Compose project `apo-wms`, host127.0.0.1 port5433, database/user `wms`, schema `public`
- รหัสผ่านอยู่ `.env` และ `.local/first-login.md` ซึ่งถูก ignore ห้ามใส่ในเอกสารหรือ Git รหัส Admin ชั่วคราวอาจถูกผู้ใช้เปลี่ยนแล้ว
- อย่า reset DB, password หรือปิด dev server ที่ผู้ใช้กำลังใช้งานโดยไม่จำเป็น
- Node24.21.0 portable อยู่ `.tools/node-v24.21.0-win-x64`; `backend.cmd` เป็น npm wrapper ของ backend, `wms.cmd` ของ frontend
- Backend tests ใช้ schema test_* แยกอัตโนมัติ; `e2e.cmd` ต้องหยุด API port3000 ก่อนจึงรันได้ อย่ารันชน API ที่ผู้ใช้ใช้อยู่
- `.local/debug-real-admin.cjs` เป็น diagnostic ที่ใช้ API port3002 และ schema ชั่วคราว ผ่าน flow Login → เปลี่ยนรหัส → เปิดฟอร์ม → บันทึกผู้ใช้ โดยไม่แตะ public; เป็นไฟล์ local ไม่ commit

## งานที่ทำเสร็จแล้วบน GitHub main

- `b6831d2`: Module1 ใช้ Nest/Postgres จริง — auth, admin-created users, roles ต่อ project, permission, password change/reset, sessions
- `1f372e2`: ปุ่มแสดง/ซ่อนรหัสผ่านทั้ง3ช่องในหน้าเปลี่ยนรหัสผ่าน
- `3fe06be`: แก้ Username HTML pattern ให้เข้ากับ browser regex v flag, ข้อความเตือนภาษาไทยและ submit guard; รับอังกฤษ/ตัวเลข/จุด/underscore/hyphen 3–50 ตัว ชื่อแสดงใช้ไทยได้
- ล่าสุด Frontend tests16/16 และ build ผ่าน; Backend baseline11/11 ผ่าน

## เรื่องที่ยังหาสาเหตุไม่ได้

ผู้ใช้แจ้งกดเพิ่มผู้ใช้งานแล้วหมุนเหมือนโหลดไม่เสร็จ ยังไม่ทราบว่าค้างตอนเปิดฟอร์มหรือกดบันทึก ถามแล้วแต่ยังไม่มีคำตอบ
ลอง Edge ทั้ง mocked API สำหรับตรวจ UI และ API/Postgres จริงใน schema ทดสอบแล้ว เปิดฟอร์มและบันทึกผ่าน HTTP201 ไม่เกิดอาการค้าง จึงยังไม่ได้อ้างว่าแก้ spinner แล้ว

## หลักการทำงานที่ผู้ใช้ให้ความสำคัญ

ใช้ brainstorming และ karpathy-guidelines, UI ตาม electric-violet ที่รับแล้ว พัฒนาทีละ Module และให้ผู้ใช้ test ก่อนเริ่มโมดูลถัดไป
มีการอนุญาตให้ส่งงานขึ้น https://github.com/ApoRaviz/ApoRaviz_WMS ไว้แล้ว แต่ขณะนี้คำสั่งล่าสุดคือพักงาน
