export const demoDate = "2026-10-03";
export const projects = [
  {
    id: "apo",
    name: "Apo",
    client: "บริษัทตัวอย่าง",
    lotControl: true,
    expiryControl: true,
    inspection: true,
    itemIds: ["paper", "soap", "bag"],
    supplierIndexes: [0, 1, 2],
    warehouseIds: ["wh1", "wh2"],
  },
  {
    id: "squ",
    name: "Squ",
    client: "บริษัทตัวอย่าง",
    lotControl: false,
    expiryControl: false,
    inspection: false,
    itemIds: ["bag"],
    supplierIndexes: [0],
    warehouseIds: ["wh1"],
  },
  {
    id: "mdr",
    name: "Mdr",
    client: "บริษัทตัวอย่าง",
    lotControl: true,
    expiryControl: false,
    inspection: true,
    itemIds: ["paper"],
    supplierIndexes: [2],
    warehouseIds: ["wh2"],
  },
];
export const catalog = [
  {
    id: "paper",
    code: "AP-1001",
    name: "กระดาษเช็ดมือ · แพ็ก 6 ม้วน",
    barcode: "8850000000011",
    unit: "ชิ้น",
  },
  {
    id: "soap",
    code: "AP-1002",
    name: "สบู่เหลวล้างมือ · 500 มล.",
    barcode: "8850000000028",
    unit: "ชิ้น",
  },
  {
    id: "bag",
    code: "AP-1003",
    name: "ถุงบรรจุสินค้า · ขนาด M",
    barcode: "8850000000035",
    unit: "ชิ้น",
  },
];
export const suppliers = [
  "สยาม ซัพพลาย",
  "กรีนแพ็ก เทรดดิ้ง",
  "นอร์ธสตาร์ โปรดักส์",
];
export const locations = [
  {
    id: "A-01-01",
    name: "A-01-01 · ชั้นวาง A",
    warehouseId: "wh1",
    type: "STORAGE",
  },
  {
    id: "A-01-02",
    name: "A-01-02 · ชั้นวาง A",
    warehouseId: "wh1",
    type: "STORAGE",
  },
  {
    id: "B-02-01",
    name: "B-02-01 · ชั้นวาง B",
    warehouseId: "wh2",
    type: "STORAGE",
  },
];
const line = (id, itemId, expected) => ({ id, itemId, expected });
const batch = (id, lineId, qty, inspected = false, putaway = 0) => ({
  id,
  lineId,
  qty,
  lot: "LOT-261003",
  expiry: "2027-10-03",
  receivedAt: demoDate,
  inspected,
  accepted: inspected ? qty : 0,
  rejected: 0,
  reason: "",
  putaway,
  placements: putaway ? [{ locationId: "A-01-01", qty: putaway }] : [],
});
const plan = (
  suffix,
  supplier,
  lines,
  batches = [],
  draft = false,
  projectId = "apo",
) => ({
  id: `${projectId}-${suffix}`,
  projectId,
  number: `RP-261003-${suffix}`,
  supplier,
  warehouseId: "wh1",
  warehouse: "คลังหลัก",
  expectedDate: demoDate,
  reference: `PO-26-${suffix}`,
  note: "ตรวจจำนวนและสภาพบรรจุภัณฑ์ก่อนรับเข้า",
  draft,
  lines,
  batches,
  activity: [
    { label: "สร้างแผนรับเข้าสินค้า", actor: "นภา · ผู้จัดการ", time: "08:00" },
  ],
});
export function initialPlans() {
  return [
    plan("001", suppliers[0], [
      line("l1", "paper", 180),
      line("l2", "soap", 60),
    ]),
    plan(
      "002",
      suppliers[1],
      [line("l1", "bag", 120)],
      [batch("b1", "l1", 60)],
    ),
    plan(
      "003",
      suppliers[2],
      [line("l1", "soap", 200)],
      [batch("b1", "l1", 200)],
    ),
    plan(
      "004",
      suppliers[0],
      [line("l1", "paper", 96)],
      [batch("b1", "l1", 96, true, 48)],
    ),
    plan(
      "005",
      suppliers[1],
      [line("l1", "bag", 80)],
      [batch("b1", "l1", 80, true, 80)],
    ),
    plan("006", suppliers[2], [line("l1", "soap", 160)], [], true),
    plan("007", suppliers[0], [line("l1", "bag", 60)], [], false, "squ"),
  ];
}
