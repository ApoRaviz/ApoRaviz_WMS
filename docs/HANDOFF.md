# สถานะล่าสุด — 2026-10-03

## Internal IDs — bigint พร้อม public ID เดิม

- Branch ปัจจุบัน `refactor/internal-bigint-ids` จาก `eda16b9`; implementation `ca5e6bb` เปลี่ยน PK ภายใน Users/Projects/Clients/Warehouses และ FK ทั้ง 10 จุดเป็น bigint identity โดยเก็บ ID เดิมใน `public_id` unique; รายการใหม่ให้ PostgreSQL 18 สร้าง public ID แบบ UUIDv7
- API/URL/สมาชิก/session/audit JSON และรหัสธุรกิจเดิมคงเดิม; bigint อยู่ใน SQL หรือ string ไม่แปลงเป็น JavaScript Number; role/permission natural keys และ token hashes ใช้รูปแบบเดิม
- Backend 32/32 + build, Frontend 26/26 + build, source boundaries และ Edge 11/11 ผ่าน ใช้ schema ทดสอบแยก; ครอบคลุม populated migration, rollback/retry หลัง FK ขวางและ lock timeout, ID เกิน Number precision และ concurrent upgrade ของ schema เดิม
- Review ไม่พบ Critical/Important; เพิ่ม regression ของ lock timeout ตามข้อเสนอ Minor แล้ว การ initialize schema ใหม่พร้อมกันครั้งแรกยังไม่ใช่กรณีที่รับรอง ให้เริ่ม instance แรกเพียงตัวเดียว
- Benchmark ข้อมูลสังเคราะห์ 100,000 parent / 400,000 links: index รวมประมาณ 108.45 → 39.59 MiB (รวม public-ID index แล้ว) ไม่ใช่ผล throughput จริง และ heap เดิมไม่รับประกันว่าจะเล็กลงทันที
- **ยังไม่ migrate ฐานจริงและไม่หยุด Backend/Frontend ของเจ้าของ พอร์ต 3000/4200**: migration `003_internal_bigint_ids.sql` ใช้ schema ที่ Backend เก่าใช้ต่อไม่ได้ ต้องหยุด writers ทั้งหมด สำรองและตรวจ restore ก่อนเริ่ม Backend ใหม่เพียงตัวเดียว ทำตาม [QA และ deployment/rollback runbook](qa/2026-10-03-internal-bigint-ids.md) แทนขั้นตอน restart อย่างเดียวในประวัติด้านล่าง
- เก็บ branch/commit ในเครื่องให้เจ้าของทดสอบ ยังไม่ merge/push; `frontend/angular.json` เป็นการแก้ของผู้ใช้และไม่รวม commit; บันทึกหลักการเลือก ID และ migration verification ใน AGENTS.md แล้ว

## Project Setup — ทำตามแบบที่ผู้ใช้อนุมัติ

- Branch `feat/project-setup` จาก `a181cff`; implementation `61943c3` ทำครบหน้า Admin list/สร้างฉบับร่าง และหน้าตั้งค่า 5 หมวด ข้อมูลทั่วไป/คลัง/กฎ/สมาชิก/ประวัติ
- Admin เข้า `จัดการระบบ → โปรเจกต์`; Manager ใช้ปุ่มตั้งค่าบน Project ของตน แก้ได้เฉพาะชื่อ/คำอธิบาย/สี/คลังเริ่มต้น Backend ตรวจขอบเขตและสิทธิ์ซ้ำด้วย
- Client/Warehouse เป็นข้อมูลกลาง มีหน้าเตรียมข้อมูลแยก; Project–Warehouse many-to-many; คลังเดียวใช้ร่วมหลาย Project ได้ สมาชิกยังใช้ชุดเดียวกับหน้าจัดการผู้ใช้
- มี audit ค่าเดิม/ใหม่ ผู้แก้จริง และ version กันแก้ทับ; ข้อมูลและประวัติบันทึกใน transaction เดียว รวมการแก้สมาชิกจากหน้าเดิมด้วย; ฟอร์มมี Save/Discard/Stay และคงค่าหากบันทึกล้มเหลว
- Backend build + 25/25, Frontend 26/26 + build, boundaries และ Edge รอบสุดท้าย 11/11 ผ่าน รวม migration รักษาข้อมูลเดิมและ regression จาก review ดู [QA/ผลล่าสุดและวิธีลอง](qa/2026-10-03-project-setup.md)
- Review แก้ stale Users form เขียนสมาชิกทับ Setup โดยเพิ่ม `expectedMemberships` ใน User PATCH และปุ่มทิ้ง/โหลดล่าสุด; แก้ Logout ให้ถามข้อมูลค้างก่อน revoke session มี regression RED→GREEN; หลัง deploy ให้ refresh หน้าที่เปิดค้างไว้
- ข้อเล็กที่เลื่อนไว้: ประวัติที่ Manager ดูอาจแสดง ID ของ Client/คลังเดิมที่ไม่อยู่ในรายการปัจจุบัน แทนชื่อ; ข้อมูลประวัติยังเก็บครบ
- ต้อง restart Backend เพื่อ apply migration `002_project_setup.sql` อัตโนมัติ (`.\backend.cmd run build` แล้ว `.\backend.cmd start` หรือ `npm run build`/`npm start` ใน backend) คง ID/บัญชี/สมาชิก/Project เดิม ไม่มี reset; เตรียมคลังจริงผ่านหน้าข้อมูลกลางก่อนใช้ Setup
- รอบนี้ยังไม่เชื่อม Inbound: กฎแสดง “เตรียมไว้สำหรับโมดูลปฏิบัติงาน”; `first_transaction_at` และ usage flags เป็นจุดรองรับภายในที่โมดูลธุรกรรมในอนาคตต้องอัปเดตพร้อมรายการ ไม่ใช่ stock integration ที่ทำแล้ว
- เก็บ branch ไว้ให้เจ้าของลองใน checkout เดิม ไม่ merge/push; `frontend/angular.json` เป็นการแก้ของผู้ใช้และไม่รวม commit; ทดสอบ API3002/UI4202 ไม่รบกวน 3000/4200
- งานถัดไป: เจ้าของทดสอบ Project Setup ก่อนพัฒนาโมดูลปฏิบัติงานต่อ; แผน Inbound ด้านล่างเป็นประวัติ ไม่ใช่งานที่เริ่มต่ออัตโนมัติ

## แก้เคอร์เซอร์หมุนเมื่อชี้ปุ่มบันทึกผู้ใช้งาน

- วิดีโอที่ผู้ใช้ส่งแสดงวงกลมรอตรงเมาส์บนปุ่ม “บันทึกผู้ใช้งาน” ซึ่งยัง disabled และข้อความยังไม่ใช่ “กำลังบันทึก…”
- ยืนยันสาเหตุ: `frontend/src/styles.css` กำหนด `button:disabled { cursor: wait }` ทำให้ฟอร์มที่ยังไม่ valid ดูเหมือนกำลังทำงานทั้งที่ไม่ได้ submit; เปลี่ยนเป็น `not-allowed` โดยคง validation/disabled และสถานะบันทึกจริงไว้
- เพิ่ม regression ใน browser flow เดิม: hover ปุ่ม invalid ไม่มี POST และไม่เป็น wait; กรอกครบปุ่ม enabled/cursor pointer; คลิกจึงส่ง POST หนึ่งครั้งและบันทึกสำเร็จ
- ก่อนแก้ test ล้มเหลวด้วย received cursor `wait`; หลังแก้ Edge 8/8 และ frontend build ผ่าน ใช้ schema ชั่วคราว API3002/UI4202 ไม่แตะบัญชีจริง
- ปุ่มยัง disabled ได้เมื่อข้อมูลไม่ครบ/ไม่ผ่านกฎ; คลิปไม่เห็นฟอร์มทั้งหมด จึงยังระบุไม่ได้ว่าข้อมูลของผู้ใช้ผิดช่องใด. อาการ hover ในคลิปนี้แก้แล้ว; ไม่ได้อ้างว่าแก้ request ค้างที่ยังไม่เคยพบ

## Inbound: รอบออกแบบด้วย mock data

คำสั่งล่าสุดให้ตรวจ Login/การทำงานเดิมซ้ำ แล้วแตก branch เริ่มออกแบบ Inbound โดยไม่รอคำตอบระหว่างผู้ใช้ไม่อยู่ จึงไม่ต้องรออนุญาตเริ่มโมดูลถัดไปตามข้อความเก่าในประวัติ แต่รอบนี้ยังเป็น “ออกแบบไปก่อน”

- Refactor เสร็จที่ `d9ba964` และส่ง `refactor/backend-layers` แล้ว; แตก branch ใหม่ `feat/inbound-mock` จาก commit นี้
- ตรวจ Login/Module 1 ซ้ำ: Backend 13/13, Frontend 22/22, builds/source boundaries ผ่าน, Edge+API/Postgres 8/8 บน schema ชั่วคราวและพอร์ต 3002/4202 โดยคงระบบจริง 3000/4200 ไว้ ดู [ผลตรวจ](qa/2026-10-03-module1-recheck.md)
- ใช้ brainstorming ออกแบบคิว → รับ → ตรวจตาม config → จัดเก็บ; ทำ interactive prototype ใน `docs/prototypes/inbound/` พร้อม mock memory เท่านั้น ไม่มี API/stock/database writes
- เปิด preview: `http://127.0.0.1:4300`; รันใหม่ได้ด้วย `.\.tools\node-v24.21.0-win-x64\node.exe scripts/preview-inbound.mjs`
- ต้นแบบลอง partial receive, batch/lot, quarantine, project config, mock roles, create/release, error/retry และ command replay ได้; desktop/tablet/mobile + keyboard dialog ผ่าน ดู [คู่มือลอง](prototypes/inbound/README.md) และ [ผลตรวจ](qa/2026-10-03-inbound-prototype.md)
- Review แก้ pending command หลัง reset/navigation, batch trace, mobile history/target size และ summary count แล้ว
- [Design spec](superpowers/specs/2026-10-03-inbound-mock-design.md) ระบุสมมติฐานที่ยังไม่ถือว่าเจ้าของตรวจรับ; [แผน Angular mock](superpowers/plans/2026-10-03-inbound-angular-mock.md) เป็นขั้นถัดไป ยังไม่ได้ execute
- งานถัดไป: ทบทวนต้นแบบ/สมมติฐานกับผู้ใช้ แล้วนำ workflow เข้า Angular ภายใต้ session/workspace guard ตามแผน; Backend Inbound/ledger/concurrency เป็นงานแยกภายหลัง
- `frontend/angular.json` ยังคงเป็นการแก้ analytics ของผู้ใช้ อย่ารวม commit

## ประวัติรอบ refactor

ผู้ใช้สั่งเริ่มทำต่อและอนุมัติให้ทำตามแผน โดยใช้ brainstorming ตามเดิม ข้อความพักงานด้านล่างเป็นประวัติเดิม ไม่ใช่คำสั่งปัจจุบัน

## ผลการ refactor Module 1

- ทำงานบน branch `refactor/backend-layers` จาก `0c2da4d`
- Backend แยก Auth/Users/Roles/Projects เป็น Controller → Service → Repository พร้อม modules, DTO pipes และ guards; `main.ts` เหลือ bootstrap และ export `createApp` สำหรับ tests
- รักษา transaction client, locks, administrator revalidation, throttle reservation และ session revocation เดิม
- Frontend แยก Auth API/Session state, Users/Roles/Projects services และ models; ย้าย topbar ที่รู้ session ไป `core/layout`; แยก template ขนาดใหญ่จาก component
- ดูรายละเอียดใน [ARCHITECTURE.md](ARCHITECTURE.md) และ [แผน Frontend](superpowers/plans/2026-10-03-frontend-layers.md)
- Baseline: Backend 11/11, Frontend 16/16; หลัง refactor Backend 13/13, Frontend 22/22; builds ทั้งสองส่วนและ source-boundary checks ผ่าน
- Browser flows ผ่าน 8/8 บน Edge ด้วย schema ทดสอบแยก ครอบคลุม auth/project/user CRUD/role/password reset/logout
- Review พบลำดับส่ง cookie เมื่อโหลด project catalog ล้มเหลวเปลี่ยนไป แก้ให้ตรงของเดิม และเพิ่ม regression tests 2 รายการที่ล้มเหลวก่อนแก้และผ่านหลังแก้
- ไม่เปลี่ยน schema/dependencies/ข้อมูลจริง/รหัสผ่าน ไม่แตะการแก้ `frontend/angular.json` ของผู้ใช้ และไม่รวมไฟล์นี้ใน commit
- ปัญหา spinner ที่เคยรายงานยังไม่ได้พบซ้ำ จึงไม่ได้สรุปว่าแก้สาเหตุแล้ว; flow เพิ่มผู้ใช้ผ่าน browser tests

## ขั้นถัดไป

ให้เจ้าของงานทดสอบ Module 1 ก่อนเริ่มโมดูลคลัง ใช้บัญชีเดิมและ electric-violet UI เดิม ไม่มี migration หรือ reset password ที่ต้องทำ

---

# ประวัติการพักงาน — 2026-09-14

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
