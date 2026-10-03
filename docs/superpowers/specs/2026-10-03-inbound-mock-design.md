# Inbound — mock design for review

สถานะ: แบบร่างพร้อมต้นแบบให้ทดลอง ยังไม่ใช่ Inbound ที่เชื่อม stock/database จริง

ผู้ใช้อนุญาตวันที่ 2026-10-03 ให้ตรวจ Login/Module 1 ซ้ำ แตก branch แล้วออกแบบ Inbound ด้วย mock data โดยไม่รอคำตอบระหว่างที่ไม่อยู่ จึงตัดสินใจรายละเอียดด้านล่างเป็น **สมมติฐานที่เปลี่ยนได้** ไม่ถือว่าเจ้าของงานตรวจรับทุกข้อแล้ว

## เป้าหมายและบริบท

เจ้าหน้าที่คลังขนาดเล็กต้องเห็นว่าวันนี้มีอะไรเข้า รับจาก Supplier ใด รับจริงเท่าไร ตรวจแล้วเท่าไร และเหลือจัดเก็บเท่าไร ใน Project ที่เลือก พร้อมใช้บน desktop, tablet และเครื่องสแกนที่ส่งข้อความแบบ keyboard wedge

ใช้ flow ที่ requirement ระบุ: Receive Plan → Receiving → Inspection (ตาม Project Configuration) → Putaway. Client คือผู้ใช้บริการ WMS; Supplier คือผู้ส่งสินค้าเข้า ไม่สลับคำกับ Customer. คง electric-violet, Noto Sans Thai/Manrope และโครงสร้าง Component/Service/Model เดิม

## ทางเลือกที่พิจารณา

| แนวทาง | ข้อดี | ข้อจำกัด |
|---|---|---|
| คิวเอกสาร + รายละเอียด + บันทึกทีละขั้น (เลือก) | ค้นหาเอกสารง่าย เห็นยอดทุกขั้น รองรับรับบางส่วนและ batch หลาย lot | ต้องมี summary ที่บอกขั้นตอนค้างชัด |
| Wizard บังคับจบทุกขั้นในครั้งเดียว | เรียนรู้ครั้งแรกง่าย | ไม่เหมาะเมื่อรับสินค้าไม่ครบ/หลายคนทำต่างเวลา |
| Kanban ตามสถานะ | ภาพรวมดี | ค้นหาเลขเอกสารและอ่านหลาย SKU บนจอเล็กลำบาก |

## ขอบเขตรอบออกแบบ

- ต้นแบบแยกใน `docs/prototypes/inbound/` ที่กดค้นหา/กรอง/สลับ Project/สร้าง draft/รับเข้า/ตรวจ/จัดเก็บได้ด้วยข้อมูลสมมติในหน่วยความจำ
- ภาพรวมคิว, ฟอร์มสร้างแผน, รายละเอียดเอกสาร, บันทึกการทำงาน และสถานะ empty/error/read-only
- Fixtures ของ Supplier, Item, Warehouse, storage และ project config เฉพาะที่จำเป็น; staging/quarantine เป็นพื้นที่จำลองในคำอธิบาย ไม่สร้างโมดูล Master Data ทั้งระบบ
- ไม่มี Inbound API, database migration, stock posting, real permissions, offline SQLite, barcode-camera integration, allocation, outbound หรือ inventory module ในรอบนี้
- Prototype ไม่ใช้บัญชี/รหัสผ่านจริง ไม่มี fetch ไป `/api`; refresh/reset คืน fixtures. เครื่องมือเปลี่ยน role อยู่ในแถบ “ตัวเลือกต้นแบบ” แยกจากงานคลัง

## Screens

### 1. คิวรับสินค้า

Sidebar แสดง Project/Client และเมนูรับสินค้าเข้า; topbar มี breadcrumb และชื่อผู้ใช้ตัวอย่าง. หัวหน้าแสดง “รับสินค้าเข้า”, คำอธิบายสั้น และปุ่มหลัก “สร้างแผนรับเข้า”. Summary เป็น **จำนวนเอกสาร** รอรับ/รอตรวจ/รอจัดเก็บ/เสร็จแล้ว ไม่รวมจำนวนที่ต่าง UOM เข้าด้วยกัน

ค้นหาเลขเอกสาร, reference, Supplier และ item code. Filter ตามสถานะและคลัง. แต่ละแถวแสดงเลขเอกสาร, Supplier, วันที่นัด, สถานะข้อความ, ยอดรับ/แผน (fixtures ใช้ชิ้นทั้งหมด), ปุ่มดูรายละเอียด. Mobile เปลี่ยนเป็น cards มีข้อมูลหลักครบและปุ่มสูงอย่างน้อย 44px

### 2. สร้าง Receive Plan

Project มาจาก context แก้ไม่ได้ในฟอร์ม; เลือก Supplier และ Warehouse ของ Project, วันที่นัดรับ, reference ภายนอก, item/จำนวนคาดรับ และหมายเหตุ. ต้นแบบสร้างหนึ่ง SKU ต่อ draft เพื่อสำรวจ flow; Angular mock ขั้นถัดไปมี editor หลายบรรทัดพร้อมป้องกันบรรทัดซ้ำ

บันทึกเป็น draft ไม่เพิ่ม stock; กด “ยืนยันแผนรับ” จึงรับจริงได้. หลังมี receipt แล้วห้ามแก้ item/UOM/expectedQty ของบรรทัดนั้นจากฟอร์มแผน. การยกเลิกและการแก้ไขยอดที่ post แล้วต้องเป็น workflow แยก ไม่แอบลบ receipt

### 3. รายละเอียดและปฏิบัติงาน

มี breadcrumb กลับคิว, เลขเอกสาร/สถานะ, Supplier/Warehouse/วันนัด/reference, step indicators และรายการสินค้า. ตารางแสดง Expected, Received, Accepted, Putaway และ UOM ต่อบรรทัด. ด้านข้างเป็น panel รับเข้า/ตรวจ/จัดเก็บ; บน handheld เรียงตามการทำงาน ไม่มี panel ซ้อนเลื่อนหลายชั้น

- **Receiving:** สแกน barcode หรือเลือกรายการ; การสแกนเลือกสินค้าและ focus จำนวน **ไม่เพิ่มยอดเอง**. ใส่จำนวนรับครั้งนี้, Lot/Expire Date ตาม config; วันที่รับและ staging location ชัดเจน. บันทึกแล้วแสดงผลพร้อม remaining. รับซ้ำด้วย barcode เดิมได้เมื่อเป็น receipt ใหม่ที่ตั้งใจ; transport retry ต้องใช้ commandId เดิม
- **Inspection:** เลือก receipt batch ที่รอตรวจ แสดง item/lot/expiry/จำนวน. ระบุผ่าน/ไม่ผ่านรวมเท่าจำนวน batch และเหตุผลถ้ามีไม่ผ่าน. ต้นแบบตรวจเต็ม batch ต่อครั้ง; รับหลาย batch เพื่อแบ่งตรวจได้. ของไม่ผ่านเข้าสู่ quarantine จำลอง ห้าม putaway เป็น available
- **Putaway:** เลือก batch ที่ผ่านตรวจ (หรือได้รับอนุมัติอัตโนมัติตาม config) และ storage location ใน Project/Warehouse เดียวกัน. จำนวน >0 และไม่เกิน acceptedQty−putawayQty. จัดเก็บบางส่วนได้; ห้ามเลือก receiving/quarantine เป็นปลายทางปกติ
- การรับบางส่วนสามารถตรวจและจัดเก็บ batch ที่รับแล้วได้ ไม่ต้องรอครบทั้งแผน. สถานะเอกสารแสดงขั้นแรกที่ยังไม่ครบ; tabs เปิดขั้นหลังเมื่อมี batch ที่ทำได้
- ประวัติแสดงเวลา ผู้ทำ รายการ จำนวน หน่วย lot/location และผลการทำงาน. ต้นแบบเป็น activity log สำหรับสาธิต ไม่อ้างว่าเป็น ledger ที่บังคับด้วย database transaction

## สถานะและกฎปริมาณ

`DRAFT → PLANNED → RECEIVING → INSPECTION → PUTAWAY → COMPLETED`; config ปิด inspection จะข้ามขั้นนั้น. สถานะสรุปคำนวณจากยอดตามลำดับ:

1. draft ยังไม่ release → DRAFT
2. ไม่รับเลย → PLANNED
3. received รวมยังไม่ครบ expected → RECEIVING
4. มี batch รอตรวจ → INSPECTION
5. มี acceptedQty ที่ยังไม่ putaway → PUTAWAY
6. มี rejectedQty → ON_HOLD (คงข้อยกเว้นไว้จนมี disposition workflow)
7. ครบทุกยอดและไม่มีข้อยกเว้น → COMPLETED

| กฎ | สมมติฐานสำหรับ mock |
|---|---|
| จำนวน | จำนวนเต็มบวก หน่วย PCS; ไม่มี UOM conversion ในรอบนี้ |
| รับเกิน | ปฏิเสธเกิน expectedQty; ไม่สร้าง over-receipt approval flow |
| รับขาด | คง RECEIVING และยอดค้าง ไม่ปิดขาดอัตโนมัติ |
| การตรวจ | accepted+rejected = batch.qty; batch ที่ตรวจแล้วแก้ซ้ำไม่ได้ |
| กักกัน | rejectedQty แยกชัดเจน ไม่เป็น available; เอกสาร ON_HOLD หลังจัดเก็บยอดผ่านครบ |
| หมดอายุ | ถ้าเปิด ExpireDateControl ต้องระบุ ISO date ที่ไม่ก่อนวันรับ; ไม่ใส่วันปลอมเมื่อ config ปิด |
| Lot | บังคับเมื่อ LotControl; เก็บต่อ receipt batch เพื่อไม่รวมคนละ lot |
| Serial | ยังไม่ออกแบบ serial capture UI; Project ที่ต้องใช้ serial ต้องเพิ่ม flow ก่อนใช้จริง |
| Retry | commandId เดิม+payload เดิม คืนผลเดิม ไม่มีบวกซ้ำ; payload ต่างกันต้อง conflict |
| Project | ตรวจทั้งเอกสาร, supplier/item/location/config; id ของเอกสารนอก Project เปิดไม่ได้ |

## Stock semantics เมื่อพัฒนา Backend จริง

Receiving สร้าง physical stock ที่ receiving/staging และ movement INBOUND; ก่อนผ่านตรวจ/ก่อนจัดเก็บยังไม่ available สำหรับ allocation. Inspection แยก quality bucket โดยมี trace ชัดเจน; ไม่เพิ่ม physical stock ซ้ำ. Putaway ย้าย accepted stock ไป storage พร้อม movement PUTAWAY และจึง available. ไม่คำนวณ physicalQty = received+putaway เพราะเป็นสินค้าชุดเดียวกัน

Receipt detail, balance, movement และ command-result ต้อง commit ใน transaction เดียว. Putaway ใช้ transaction เดียวกันสำหรับ source decrement/destination increment/movement/command-result. `commandId`, payload fingerprint, user/device, timestamp, before/after, reference และ optimistic version ต้องออกแบบก่อนเปิดธุรกรรมจริง. Retry เป็นการส่งเจตนาเดิมซ้ำ; การยิง barcode คนละเจตนาใช้ key ใหม่. Mock จำลอง semantics ใน tab เดียว ไม่พิสูจน์ concurrent-device safety

## โครงสร้าง Angular mock ขั้นถัดไป

```text
features/inbound/
  models/      inbound-plan, receipt-batch, inbound-command, inbound-config
  data/        inbound.fixtures, inbound-mock.repository
  services/    inbound.service, inbound-policy
  pages/       inbound-list, inbound-detail, receive-plan-editor
  components/  inbound-status, receiving-form, inspection-form, putaway-form
```

เพิ่มเฉพาะไฟล์ที่ใช้จริง. Component ดูแล form/loading/focus; service ดูแล use case และ business validation; repository เก็บ fixtures ตาม Project. Typed command/result เป็น seam สำหรับ API adapter ในภายหลัง ไม่ใช้ generic repository หรือ global store ใหม่. Models ไม่ import implementation service. Shell ใช้ session จริงแต่มีป้ายโหมดจำลอง; mock data ไม่ผูกกับ public DB

Route ที่เสนอ `/workspace/:projectId/inbound` และ `.../inbound/:planId`; resolver/guard ต้องตรวจ workspace ผ่าน server เดิมก่อนเปิด mock. Company administrator เห็นทุก Project ตามระบบเดิม. Permission catalog ตอนนี้มีเพียง `workspace.view` จึงยังไม่ถือว่า Inbound permission ใช้จริงแล้ว

## สิทธิ์ที่เสนอ (รอตรวจรับ)

| บทบาท | ดู | สร้าง/release | รับ | ตรวจ | จัดเก็บ |
|---|---|---|---|---|---|
| Company admin / Manager | ✓ | ✓ | ✓ | ✓ | ✓ |
| Supervisor | ✓ | ✓ | ✓ | ✓ | ✓ |
| Operator | ✓ | — | ✓ | — | ✓ |
| Customer | ✓ | — | — | — | — |

สิทธิ์จริงต้องใช้ `inbound.view/create/receive/inspect/putaway` และ backend enforce ตาม Project ก่อนขึ้น production. Prototype role selector มีไว้สำรวจข้อจำกัดของ UI เท่านั้น ไม่เป็น authorization

## Fixtures / walkthrough

วันที่ตัวอย่าง 3 ต.ค. 2026. Apo เปิด lot/expiry/inspection มีเอกสาร draft, planned, partial receiving, inspection, putaway และ completed. Squ ปิด inspection/lot/expiry เพื่อเห็นการข้ามขั้นโดย config. Mdr แสดง empty state. Location fixtures มีเฉพาะ STORAGE สำหรับเลือกปลายทาง; RECEIVING (REC-01) และ QUARANTINE เป็นข้อความอธิบายพื้นที่ในต้นแบบ ยังไม่ใช่ location records. Supplier/Item เป็นชื่อสมมติ ไม่มีบัญชีจริง

เส้นทางทบทวน: คิว Apo → RP-261003-001 → รับทั้งสอง SKU พร้อม lot/expiry → ตรวจผ่าน → จัดเก็บ → completed. อีกเส้นทาง: batch ที่รอตรวจ → ไม่ผ่านบางส่วนพร้อมเหตุผล → จัดเก็บเฉพาะผ่าน → ON_HOLD. สลับ Squ เพื่อเห็น flow ไม่ตรวจ; Mdr เพื่อ empty state; Customer เพื่อ read-only

## Acceptance ของรอบนี้

- Login/Module 1 ตรวจซ้ำผ่านบน isolated schema และพอร์ต 3002/4202; ไม่ reset บัญชีจริง
- เปิดต้นแบบที่ localhost ได้; desktop/tablet/360px ไม่มี page overflow; label/focus/keyboard/dialog cancel ใช้ได้
- ค้นหา/กรอง/เปิดเอกสาร/เปลี่ยน Project/สร้าง draft และ happy-path simulation กดใช้งานได้
- ป้องกันจำนวนผิด รับเกิน จัดเก็บเกิน และ project mismatch; state เปลี่ยนเฉพาะ mock memory
- เอกสารระบุ assumption, deferred scope, data model, flow, API migration boundary และ test plan
- จบที่แบบและ mock prototype สำหรับ review ตามคำสั่ง “ตอนนี้ให้ออกแบบไปก่อน”

## ประเด็นให้เจ้าของงานทบทวนภายหลัง

กฎรับเกิน/ปิดขาด, หน่วยย่อย/ทศนิยม, serial control, รับสินค้าหมดอายุได้หรือไม่, default role permissions, quarantine disposition และวิธีเชื่อม PO/ASN จริง. ใช้ข้อเสนอข้างต้นในการออกแบบต่อโดยไม่รอคำตอบในรอบนี้
