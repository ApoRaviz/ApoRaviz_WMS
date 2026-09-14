คุณเป็น Senior Full-Stack Developer, Software Architect และ UI/UX Designer ที่มีประสบการณ์ออกแบบระบบ WMS

ช่วยออกแบบและพัฒนา **Web Application ระบบ WMS แบบ MVP สำหรับบริษัทคลังสินค้าขนาดเล็ก**

ระบบนี้เน้นใช้งานจริง ไม่ต้องมีความซับซ้อนระดับ Enterprise WMS

เป้าหมายหลักคือ:

- ใช้งานง่าย
- รองรับบริษัทคลังขนาดเล็ก
- รองรับหลาย Client
- รองรับหลาย Project
- รองรับ Handheld Scanner
- ป้องกัน Transaction ซ้ำ
- ป้องกัน Stock ผิดจากการยิงซ้ำ
- สามารถตั้งค่า Allocation Rule ได้
- มี Stock Movement Report ที่ Trace ย้อนหลังได้ดี
- มี Movement Analysis เพื่อช่วยแนะนำการจัด Location
- สามารถขยายระบบในอนาคตได้

---

# สำคัญมาก: วิธีการพัฒนา

**ห้ามสร้างระบบทั้งหมดในครั้งเดียว**

ต้องพัฒนาแบบ:

```text
Module 1
↓
Implement
↓
Test
↓
Review
↓
แก้ไขจนพอใจ
↓
หยุดรอคำสั่งจากฉัน
↓
จึงไป Module 2
```

ทำทีละ Module เท่านั้น

เมื่อทำ Module ปัจจุบันเสร็จ:

1. สรุปสิ่งที่ทำ
2. แสดงไฟล์ที่เพิ่ม/แก้
3. อธิบาย Flow
4. Run Tests
5. ตรวจ Build
6. บอกสิ่งที่ยังไม่ทำ
7. เสนอสิ่งที่อาจปรับปรุง

จากนั้น **หยุด**

ห้ามเริ่ม Module ถัดไปเอง

ฉันจะเป็นคนตัดสินใจว่า Module ปัจจุบันพอใจแล้วหรือยัง

ถ้ายังไม่พอใจ ให้แก้ Module เดิมต่อ

เมื่อฉันบอกประมาณว่า:

```text
โอเค
ไปต่อ
เริ่ม Module ถัดไป
```

จึงสามารถเริ่ม Module ใหม่ได้

---

# Development Philosophy

ระบบนี้เป็น MVP

หลักสำคัญคือ:

```text
ทำให้น้อย
แต่ทำให้ดี

ทำให้จบทีละส่วน

อย่าสร้าง Architecture เกินความจำเป็น

อย่าสร้าง Feature ที่ยังไม่ได้ขอ
```

ให้เลือก:

```text
Simple
Maintainable
Readable
Testable
Extendable
```

มากกว่า:

```text
Over Engineering
Complex Architecture
Microservices
Unnecessary Abstraction
Premature Optimization
```

---

# Technology Stack

## Frontend

- Angular
- TypeScript
- Tailwind CSS
- Responsive Design

ใช้ Tailwind CSS เป็น Styling หลัก

สามารถใช้ SCSS เพิ่มเติมเฉพาะกรณีที่ Tailwind ไม่เหมาะสม

## Backend

- NestJS
- TypeScript
- REST API

## Main Database

- PostgreSQL

## Development / Deployment

- Docker
- Docker Compose

## Handheld Offline Storage

- SQLite

แต่ SQLite ใช้เฉพาะ:

```text
Handheld Local Storage
Offline Queue
Retry Queue
```

ไม่ใช่ Main Database ของ WMS

Architecture หลัก:

```text
Angular
   ↓
NestJS REST API
   ↓
PostgreSQL
```

กรณี Handheld:

```text
Handheld
   ↓
SQLite Local Queue
   ↓
NestJS API
   ↓
PostgreSQL
```

---

# Docker Strategy

สำหรับ Development ช่วงแรก:

```text
Angular
→ Run Local

NestJS
→ Run Local

PostgreSQL
→ Docker
```

ไม่จำเป็นต้อง Dockerize Frontend และ Backend ตั้งแต่วันแรก

เป้าหมายคือ Debug และพัฒนาได้ง่าย

เมื่อระบบเริ่มนิ่งค่อยรองรับ:

```text
Docker Compose

frontend
backend
postgres
```

สำหรับ Production / On-Premise

SQLite ของ Handheld ไม่ต้องอยู่ใน Docker

---

# Business Structure

ระบบต้องรองรับ:

```text
WMS Company
     ↓
Client
     ↓
Project
     ↓
Business Data
```

---

# Client

Client คือบริษัทที่ใช้บริการคลัง

ตัวอย่าง:

```text
FUJI
NIKO
ADA
```

ห้ามเรียกระดับนี้ว่า Customer ใน Domain Model

เพราะภายในแต่ละ Project ยังมี Customer ทางธุรกิจอีก

---

# Project

หนึ่ง Client มีหลาย Project ได้

ตัวอย่าง:

```text
FUJI
 ├─ FUJI 1
 ├─ FUJI 2
 └─ FUJI 3

NIKO
 ├─ NIKO 1
 └─ NIKO 2

ADA
 ├─ ADA 1
 └─ ADA 2
```

ดังนั้นตัวอย่างนี้มี:

```text
7 Project IDs
```

Project เป็น Scope หลักของ Business Transaction

---

# Supplier และ Customer ภายใน Project

แต่ละ Project มี Supplier และ Customer ของตัวเองได้

ตัวอย่าง:

```text
Client: FUJI

Project: FUJI 1

Suppliers
 ├─ SUP001
 ├─ SUP002
 ├─ SUP003
 ├─ SUP004
 └─ SUP005

Customers
 ├─ CUS001
 ├─ CUS002
 └─ CUS003
```

นิยาม:

```text
Client
= ลูกค้าที่ใช้บริการ WMS

Project
= งาน / Business Unit ภายใต้ Client

Supplier
= ผู้ส่งสินค้าเข้า Project

Customer
= ผู้รับสินค้าที่ Project จ่ายออก
```

---

# Project Scope

Transaction สำคัญต้อง Scope ด้วย ProjectId

เช่น:

```text
Item
Stock
Inbound
Outbound
Allocation
Picking
StockMovement
Adjustment
Transfer
CycleCount
```

ห้าม Query Business Data โดย Item อย่างเดียวถ้าข้อมูลควรถูกแบ่งตาม Project

Concept หลัก:

```text
ProjectId + Business Entity
```

---

# Project Configuration

แต่ละ Project ต้องสามารถมี Configuration ต่างกันได้

ตัวอย่าง:

```text
ExpireDateControl

LotControl

SerialControl

BarcodeControl

RequireInspection

AllowPartialAllocation

AllocationPolicy
```

ห้ามเขียน Client-specific Logic เช่น:

```text
if client == FUJI
if project == FUJI1
```

ให้ใช้ Configuration

เป้าหมาย:

```text
WMS Core เดียว
        ↓
หลาย Project
        ↓
Config ต่างกัน
```

---

# Configurable Allocation

Allocation เป็นหนึ่งใน Core Features

แต่ละ Project สามารถตั้ง Allocation Policy ต่างกันได้

รองรับแนวคิด:

```text
FEFO
FIFO
LIFO
Expire Date
Receive Date
Lot Priority
Location Priority
```

MVP ยังไม่ต้องสร้าง Dynamic Rule Engine ที่ซับซ้อน

ให้เริ่มจาก:

```text
Primary Rule

Secondary Rule

Tertiary Rule
```

ตัวอย่าง:

```text
Project FUJI 1

Primary:
ExpireDate ASC

Secondary:
ReceiveDate ASC

Tertiary:
LocationPriority ASC
```

ความหมาย:

```text
ของหมดอายุก่อน
→ ออกก่อน

ถ้าวันหมดอายุเท่ากัน
→ ของรับเข้าก่อนออกก่อน

ถ้ายังเท่ากัน
→ Location Priority ที่ดีกว่าออกก่อน
```

อีก Project อาจเป็น:

```text
Primary:
ReceiveDate ASC

Secondary:
LocationPriority ASC
```

ให้ Allocation Logic แยกจาก UI และเปลี่ยน Policy ได้โดยไม่ Rewrite Core Logic

---

# Stock

Stock Model ต้องพิจารณาอย่างน้อย:

```text
ProjectId
WarehouseId
ItemId
LocationId

LotNumber
ExpireDate
ReceiveDate

Qty
AvailableQty
AllocatedQty
```

ต้องนิยามความหมายให้ชัดเจนระหว่าง:

```text
Physical Qty

Available Qty

Allocated Qty
```

---

# Stock Movement Ledger

**Stock Movement เป็น Core Architecture ของระบบ**

ระบบห้ามเก็บแค่ Stock Balance ปัจจุบัน

ต้องมี Stock Movement Ledger เพื่อสามารถ Trace ย้อนหลังได้

ตัวอย่าง:

```text
StockMovement

Id

ProjectId
WarehouseId

ItemId

FromLocationId
ToLocationId

MovementType

Qty

BeforeQty
AfterQty

ReferenceType
ReferenceId
ReferenceNumber

CommandId

DeviceId
UserId

CreatedAt
```

Field สามารถปรับตาม Architecture ที่เหมาะสม

แต่ต้อง Trace Transaction ได้ครบ

---

# Movement Types

รองรับอย่างน้อย:

```text
INBOUND

PUTAWAY

TRANSFER_OUT
TRANSFER_IN

ALLOCATE
DEALLOCATE

PICK

SHIP

ADJUSTMENT_IN
ADJUSTMENT_OUT

CYCLE_COUNT
```

ใช้ Enum / Constant / Lookup ที่อ่านรู้เรื่อง

อย่าใช้ Magic Number ที่กระจายตาม Code

---

# Stock Movement Report — Core Selling Point

**Stock Movement Report เป็นหนึ่งในจุดขายหลักของระบบ**

ไม่ใช่ Optional Report

ผู้ใช้งานต้องสามารถตอบคำถาม:

```text
Stock ตัวนี้เปลี่ยนเพราะอะไร?

เมื่อไร?

จำนวนเท่าไร?

Transaction ไหน?

จาก Location ไหน?

ไป Location ไหน?

ใครเป็นคนทำ?

ทำผ่าน Web หรือ Handheld?

ใช้ Device ไหน?

มี Transaction ซ้ำหรือไม่?
```

ต้องสามารถ Drill Down ได้:

```text
Stock Movement
        ↓
Reference
        ↓
Original Transaction
```

ตัวอย่าง:

```text
Movement

ReferenceType = PICKING
ReferenceNumber = PK260001

        ↓

เปิด Picking Transaction
```

---

# Stock Movement Report Filters

รองรับ Filter เช่น:

```text
Client

Project

Warehouse

Zone

Location

Item

Item Code

Item Name

Barcode

Movement Type

Reference Number

User

Device

Date Range
```

---

# Stock Movement Timeline

ควรมีหน้า Timeline ของ Item

ตัวอย่าง:

```text
ITEM-A

Current Stock: 78

--------------------------

01 Sep
INBOUND +100

02 Sep
PICK -10

03 Sep
PICK -10

04 Sep
ADJUSTMENT -2
```

เป้าหมายคือให้คนดูรู้ได้ทันทีว่า Stock เปลี่ยนมายังไง

---

# Before / After Qty

ถ้า Architecture เหมาะสม ให้ Movement สามารถ Trace:

```text
Before Qty

Movement Qty

After Qty
```

ตัวอย่าง:

```text
Before = 100

Movement = -20

After = 80
```

แต่ต้องจัดการให้ถูกต้องภายใต้ Concurrent Transaction

---

# Stock Movement Report และ Movement Analysis

แยกสอง Concept ให้ชัด:

## Stock Movement Report

ตอบคำถาม:

```text
เกิดอะไรขึ้น?
```

ใช้สำหรับ:

```text
Audit

Trace Transaction

ตรวจ Stock ผิด

ตรวจ Transaction ซ้ำ

ดูว่าใครทำอะไร

ดูประวัติ Item
```

## Movement Analysis

ตอบคำถาม:

```text
จากข้อมูลที่ผ่านมา
เราควรจัดคลังอย่างไร?
```

ใช้สำหรับ:

```text
Fast Moving

Medium Moving

Slow Moving

Ranking

Location Recommendation
```

Architecture:

```text
StockMovement
      │
      ├── Stock Movement Report
      │       ↓
      │   Audit / Trace
      │
      └── Movement Analysis
              ↓
           Ranking
              ↓
     Location Recommendation
```

นี่เป็นหนึ่งในแนวคิดหลักของ Product

---

# Transaction Safety

อีก Core Requirement คือ:

**Transaction ห้ามทำงานครึ่งเดียว**

ตัวอย่าง Picking อาจกระทบ:

```text
Picking Detail

Stock

Allocation

Stock Movement

Handheld Command
```

ต้องอยู่ใน Database Transaction เดียวกันตามความเหมาะสม

Concept:

```text
BEGIN TRANSACTION

Update Picking
Update Stock
Insert StockMovement
Update Allocation
Record Command

COMMIT
```

ถ้าขั้นตอนไหน Error:

```text
ROLLBACK
```

ห้ามเกิด:

```text
Picking สำเร็จ

แต่ Stock ไม่เปลี่ยน
```

หรือ:

```text
Stock เปลี่ยน

แต่ Movement ไม่มี
```

---

# Handheld Support

ระบบต้อง Design รองรับ Handheld Scanner ตั้งแต่ Foundation

ปัญหาที่ต้องป้องกัน:

```text
ยิง Barcode

API ช้า

User ยิงซ้ำ
```

หรือ:

```text
Backend ทำสำเร็จแล้ว

Response กลับไม่ถึง Handheld

Handheld Retry
```

ห้ามสร้าง Transaction ซ้ำ

---

# Idempotency

ทุก Command สำคัญจาก Handheld ต้องมี:

```text
CommandId / Idempotency Key
```

ตัวอย่าง:

```text
CommandId

TaskId

DeviceId

UserId

CommandType

ItemId

Barcode

Qty

CreatedAt
```

CommandId เช่น UUID:

```text
550e8400-e29b-41d4-a716-446655440000
```

ถ้า Retry:

```text
ต้องใช้ CommandId เดิม
```

Backend ตรวจว่า:

```text
CommandId นี้เคย Process หรือยัง?
```

ถ้าเคย:

```text
ห้ามเปลี่ยน Stock ซ้ำ
ห้ามสร้าง Movement ซ้ำ
```

สามารถ Response กลับว่ารายการเคยสำเร็จแล้ว

Database ต้องมี Protection เช่น:

```text
UNIQUE(CommandId)
```

---

# Handheld SQLite

กรณีต้องรองรับ Offline / Network ไม่เสถียร:

```text
Scan
↓
Save SQLite
↓
Queue
↓
Send API
↓
Backend Confirm
↓
Mark Sent
```

ถ้าส่งไม่สำเร็จ:

```text
Retry
```

แต่ต้องใช้ CommandId เดิม

เพื่อให้ Backend Idempotency ทำงานได้

SQLite ใช้เฉพาะ Handheld Local Storage

ไม่ใช่ Main Database

---

# Double Task Claim

ต้องป้องกัน Handheld 2 เครื่องรับ Task เดียวกัน

เช่น:

```text
Handheld A

และ

Handheld B
```

พยายามรับ Picking Task เดียวกันพร้อมกัน

ห้ามใช้ Pattern:

```text
SELECT
↓
เห็น AVAILABLE
↓
UPDATE
```

เพราะทั้งสองเครื่องอาจเห็น AVAILABLE พร้อมกัน

ให้ใช้ Atomic Claim / Concurrency Control

Concept:

```text
AVAILABLE
↓
Atomic Update
↓
IN_PROGRESS
```

พร้อม:

```text
AssignedUserId

AssignedDeviceId

StartedAt
```

ตรวจ Rows Affected หรือกลไก Concurrency ที่เหมาะสม

ผลต้องเป็น:

```text
A ได้ Task

B ต้องรู้ทันทีว่า Task ถูก Claim ไปแล้ว
```

---

# Main Modules

ระบบ MVP มี Module หลักประมาณ:

```text
Dashboard

Clients

Projects

Master Data

Inbound

Inventory

Outbound

Allocation

Stock Movement

Movement Analysis

Reports

Administration
```

แต่:

**อย่าสร้างทั้งหมดพร้อมกัน**

นี่เป็นเพียง Roadmap

---

# Master Data

อาจประกอบด้วย:

```text
Item

Barcode

Unit

Packaging

Category

Supplier

Customer

Warehouse

Zone

Location
```

Scope ตาม Project ตามความเหมาะสม

---

# Inbound

MVP Flow:

```text
Receive Plan
↓
Receiving
↓
Inspection
↓
Putaway
```

Inspection สามารถเปิด/ปิดตาม Project Configuration

รองรับข้อมูล:

```text
Supplier

Lot

Expire Date

Receive Date

Qty
```

---

# Inventory

รองรับ:

```text
Stock Inquiry

Stock by Location

Stock Movement

Transfer

Adjustment

Cycle Count
```

---

# Outbound

Flow:

```text
Outbound Order
↓
Allocation
↓
Picking
↓
Shipping
```

Allocation ใช้ Policy ของ Project

---

# Movement Analysis — Core Selling Point

Movement Analysis เป็นอีกหนึ่งจุดแข็งหลักของ Product

ต้องสามารถวิเคราะห์ว่าสินค้า:

```text
ออกบ่อยแค่ไหน

ออกถี่แค่ไหน

Qty ออกเท่าไร

ถูก Pick กี่ครั้ง

อยู่ในกี่ Orders

มี Movement กี่วัน

Movement ล่าสุดเมื่อไร
```

รองรับช่วง:

```text
7 วัน

30 วัน

60 วัน

90 วัน

Custom
```

Filter:

```text
Client

Project

Warehouse

Zone

Category

Date Range
```

---

# Movement Ranking

Report ตัวอย่าง:

```text
Rank

Item

Pick Count

Qty Out

Order Count

Movement Days

Last Movement

Current Location

Movement Class
```

Classification:

```text
Fast Moving

Medium Moving

Slow Moving
```

หรือ:

```text
A

B

C
```

---

# สำคัญ: Frequency กับ Volume ไม่เหมือนกัน

ห้ามวิเคราะห์จาก Qty อย่างเดียว

ตัวอย่าง:

```text
Item A

ออก 1 ครั้ง
Qty 1,000
```

ไม่ได้แปลว่า Item A ออกถี่

ในขณะที่:

```text
Item B

ออก 20 ครั้งต่อวัน
ครั้งละ Qty 1
```

อาจควรอยู่ใกล้ Picking Area มากกว่า

ดังนั้น Movement Analysis ต้องพิจารณาทั้ง:

```text
Frequency

Volume

Order Count

Movement Days
```

---

# Movement Score

Calculation Logic ต้องแยกออกจาก UI

สามารถรองรับ Factor เช่น:

```text
Pick Frequency

Qty Out

Order Count

Movement Days
```

ตัวอย่าง Weight:

```text
Pick Frequency = 40%

Qty Out = 30%

Order Frequency = 20%

Movement Days = 10%
```

นี่เป็นเพียงตัวอย่าง

อย่า Hardcode จนเปลี่ยนไม่ได้

---

# Location Recommendation

ระบบต้องสามารถแนะนำ:

```text
Fast Moving
→ ใกล้ Picking / Packing

Medium Moving
→ ระยะกลาง

Slow Moving
→ Location ไกลกว่า
```

MVP:

```text
Recommendation Only
```

ยังไม่ต้อง Move Stock อัตโนมัติ

ให้ User เป็นคนตัดสินใจ

---

# UI / UX

Frontend:

```text
Angular
+
Tailwind CSS
```

Design:

```text
Modern

Clean

Simple

Professional

Warehouse Friendly
```

ไม่ต้องเหมือน Enterprise ERP

เน้น:

```text
Search ง่าย

Filter ง่าย

Table อ่านง่าย

ปุ่มชัด

จำนวน Click น้อย

รองรับ Tablet

เตรียมรองรับ Handheld
```

Main Layout:

```text
Sidebar
+
Topbar
+
Main Content
```

Menu ในอนาคตประมาณ:

```text
Dashboard

Clients

Projects

Master Data

Inbound

Inventory

Outbound

Stock Movement

Movement Analysis

Reports

Settings
```

---

# Frontend Architecture

แนวทางประมาณ:

```text
src/app/

core/

shared/

layout/

features/

├── dashboard/
├── clients/
├── projects/
├── master/
├── inbound/
├── inventory/
├── outbound/
├── stock-movement/
├── movement-analysis/
├── reports/
└── administration/
```

แต่ให้ตรวจ Architecture และเลือกตามความเหมาะสม

อย่าสร้าง Folder ที่ยังไม่ได้ใช้เพียงเพื่อให้ดูครบ

---

# Backend Architecture

แนวทาง:

```text
src/modules/

├── clients/
├── projects/
├── master/
├── inbound/
├── inventory/
├── outbound/
├── stock/
├── stock-movement/
├── movement-analysis/
└── users/
```

แต่เหมือน Frontend:

**สร้างเฉพาะสิ่งที่ Module ปัจจุบันต้องใช้**

อย่าสร้าง Module ว่างทั้งหมดตั้งแต่เริ่ม

---

# Coding Principles

เน้น:

```text
Separation of Concerns

Strong Typing

Clear Naming

Transaction Safety

Idempotency

Concurrency Safety

Auditability

Testability
```

หลีกเลี่ยง:

```text
Huge Component

Huge Service

Business Logic ใน Angular Component

Business Logic ใน Controller

Client-specific if/else

Duplicate Code

Magic Number

Partial Transaction

Premature Abstraction
```

---

# Module-by-Module Development — สำคัญที่สุด

ระบบนี้ต้องพัฒนาแบบ Incremental

ตัวอย่าง:

```text
Phase / Module 1
Project Foundation

ทำให้เสร็จ
↓
ทดสอบ
↓
Review
↓
ฉันตรวจ
↓
แก้จนพอใจ
```

**ห้ามเริ่ม Module 2 จนกว่าฉันจะอนุญาต**

หลังจากนั้น:

```text
Module 2
↓
ทำให้เสร็จ
↓
Review
↓
รอฉัน
```

ทำแบบนี้ต่อไปทุก Module

---

# ห้ามทำ Ahead of Scope

ถ้ากำลังทำ:

```text
Client Module
```

อย่าแอบสร้าง:

```text
Inbound

Outbound

Allocation

Movement Analysis
```

พร้อมกัน

สร้างเฉพาะ Dependency ที่ Client Module จำเป็นจริง ๆ

ถ้าเห็นว่าสิ่งใดควรทำในอนาคต:

```text
ให้ Note ไว้
```

แต่ไม่ต้อง Implement

---

# Definition of Done ของแต่ละ Module

Module จะถือว่าเสร็จเมื่อ:

```text
Requirement ปัจจุบันครบ

Frontend ทำงาน

Backend ทำงาน

Database Migration พร้อม

Validation พร้อม

Error Handling พื้นฐานพร้อม

Tests ที่เหมาะสมผ่าน

Build ผ่าน

ไม่มี Breaking Error

Architecture อ่านง่าย

ไม่มี Code ที่ไม่จำเป็น
```

แล้วสรุปให้ฉัน Review

---

# เมื่อจบแต่ละ Module

ให้ตอบ:

## 1. What Was Implemented

ทำอะไรแล้ว

## 2. Files

เพิ่มหรือแก้ไฟล์ไหน

## 3. Database

เพิ่ม Table / Migration อะไร

## 4. Backend

API / Service / Logic อะไร

## 5. Frontend

Page / Component / State อะไร

## 6. Tests

ทดสอบอะไร และผลเป็นอย่างไร

## 7. How To Test

ฉันสามารถทดสอบเองอย่างไร

## 8. Remaining

อะไรยังไม่ได้ทำ

## 9. Next Possible Module

แนะนำได้ว่า Module ต่อไปควรเป็นอะไร

**แต่ห้ามเริ่มทำ**

จากนั้นหยุดรอ Feedback ของฉัน

---

# Initial Roadmap

Roadmap เบื้องต้นสามารถเป็น:

```text
1. Project Foundation

2. PostgreSQL + Docker

3. Authentication / User

4. Client Management

5. Project Management

6. Warehouse / Zone / Location

7. Item Master

8. Supplier / Customer

9. Stock Foundation

10. Stock Movement

11. Inbound

12. Inventory

13. Outbound

14. Allocation

15. Handheld Transaction Foundation

16. Stock Movement Report

17. Movement Analysis

18. Location Recommendation

19. Reports / Dashboard
```

นี่เป็นเพียง Roadmap

สามารถเสนอการเรียงใหม่ได้หากมี Dependency ที่สมเหตุสมผล

แต่ยังคงกฎ:

**ทำทีละ Module เท่านั้น**

---

# ก่อนเริ่มเขียน Code

ขั้นแรกให้ทำเพียง:

1. อ่าน Requirement ทั้งหมด
2. ตรวจ Repository ปัจจุบัน
3. วิเคราะห์ Existing Architecture ถ้ามี
4. เสนอ Architecture
5. เสนอ Database Foundation
6. เสนอ Module Dependency
7. เสนอ Roadmap
8. แนะนำว่า Module แรกควรเป็นอะไร
9. อธิบาย Scope ของ Module แรกให้ชัด

**อย่าเพิ่ง Implement ทุก Module**

หลังจากตกลง Module แรกแล้วจึงเริ่ม Implement Module แรก

---

# Core Selling Points

Product นี้ไม่ต้องแข่งกับ Enterprise WMS ด้วยจำนวน Feature

จุดแข็งคือ:

```text
1. WMS สำหรับบริษัทคลังขนาดเล็ก

2. Multi Client / Multi Project

3. Configurable Allocation

   FIFO
   FEFO
   Receive Date
   Expire Date
   Location Priority

4. Handheld Safe

   Idempotency
   Offline Queue
   Transaction Safety
   Double Task Protection

5. Stock Movement Report

   Full Transaction Trace
   Before / After Qty
   Reference Tracking
   User Tracking
   Device Tracking

6. Movement Analysis

   Frequency
   Volume
   Order Count
   Movement Days

7. Fast / Medium / Slow Classification

8. Location Recommendation
```

---

# Product Concept

ระบบต้องตอบได้ทั้งสองคำถาม:

```text
Stock Movement Report

"เกิดอะไรขึ้นกับ Stock?"
```

และ:

```text
Movement Analysis

"จากสิ่งที่เกิดขึ้น เราควรจัดคลังอย่างไร?"
```

ดังนั้น Core Value คือ:

```text
Stock Visibility
        +
Transaction Traceability
        +
Transaction Safety
        +
Movement Analysis
        +
Location Recommendation
```

เป้าหมายคือสร้าง WMS ที่บริษัทเล็กสามารถใช้งานได้จริง มี Feature เท่าที่จำเป็น แต่ Stock เชื่อถือได้ ตรวจสอบย้อนหลังได้ และช่วยให้จัดคลังได้ดีขึ้นจากข้อมูล Movement จริง

---

# คำสั่งสำหรับรอบแรก

ในรอบแรกนี้:

**ยังไม่ต้องเขียนระบบทั้งหมด**

ให้ทำเพียง:

```text
วิเคราะห์ Requirement
↓
ตรวจ Repository
↓
เสนอ Architecture
↓
เสนอ Database Foundation
↓
เสนอ Roadmap แบบทีละ Module
↓
เลือก Module แรก
↓
กำหนด Scope ของ Module แรก
```

จากนั้นหยุดรอฉัน Review ก่อนเริ่ม Implementation