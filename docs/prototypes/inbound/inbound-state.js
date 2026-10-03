import {
  initialPlans,
  projects,
  catalog,
  suppliers,
  locations,
  demoDate,
} from "./fixtures.js";

export const statuses = {
  draft: "ฉบับร่าง",
  planned: "รอรับสินค้า",
  receiving: "กำลังรับเข้า",
  inspection: "รอตรวจสินค้า",
  putaway: "รอจัดเก็บ",
  on_hold: "มีสินค้ากักกัน",
  completed: "เสร็จแล้ว",
};
export function totals(plan, lineId) {
  const lines = lineId ? plan.lines.filter((l) => l.id === lineId) : plan.lines;
  const batches = lineId
    ? plan.batches.filter((b) => b.lineId === lineId)
    : plan.batches;
  return {
    expected: lines.reduce((n, l) => n + l.expected, 0),
    received: batches.reduce((n, b) => n + b.qty, 0),
    accepted: batches.reduce((n, b) => n + b.accepted, 0),
    rejected: batches.reduce((n, b) => n + b.rejected, 0),
    putaway: batches.reduce((n, b) => n + b.putaway, 0),
    pendingInspection: batches
      .filter((b) => !b.inspected)
      .reduce((n, b) => n + b.qty, 0),
  };
}
export function status(plan) {
  const t = totals(plan);
  if (plan.draft) return "draft";
  if (!t.received) return "planned";
  if (t.received < t.expected) return "receiving";
  if (t.pendingInspection) return "inspection";
  if (t.putaway < t.accepted) return "putaway";
  if (t.rejected) return "on_hold";
  return "completed";
}
export function can(role, action) {
  if (role === "manager" || role === "supervisor") return true;
  return role === "operator" && ["receive", "putaway"].includes(action);
}
function ensure(condition, message) {
  if (!condition) throw new Error(message);
}
function positive(qty) {
  ensure(Number.isSafeInteger(qty) && qty > 0, "กรอกจำนวนเต็มที่มากกว่า 0");
}
function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const time = Date.parse(value + "T12:00:00Z");
  return (
    Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value
  );
}

// In-memory demonstration only. This does not provide server authorization or database safety.
export function createStore() {
  let plans = initialPlans();
  const commands = new Map();
  let sequence = 8;
  const find = (projectId, id) => {
    const p = plans.find(
      (item) => item.projectId === projectId && item.id === id,
    );
    ensure(p, "ไม่พบเอกสารในโปรเจกต์นี้");
    return p;
  };
  const record = (p, label) =>
    p.activity.unshift({
      label,
      actor: "นภา · ผู้ใช้ตัวอย่าง",
      time: new Date().toLocaleTimeString("th-TH", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    });
  const batchLabel = (p, b) => {
    const line = p.lines.find((l) => l.id === b.lineId);
    return `${catalog.find((i) => i.id === line.itemId).code} · ${b.id}${b.lot ? ` · ${b.lot}` : ""}`;
  };
  function execute(action, cmd, role, work) {
    ensure(can(role, action), "บทบาทนี้ไม่มีสิทธิ์ทำรายการนี้ในแบบจำลอง");
    const fingerprint = JSON.stringify(
      Object.keys(cmd)
        .sort()
        .map((key) => [key, cmd[key]]),
    );
    const previous = commands.get(cmd.commandId);
    if (previous) {
      ensure(
        previous.fingerprint === fingerprint && previous.action === action,
        "คำสั่งเดิมมีข้อมูลไม่ตรงกัน",
      );
      return { plan: structuredClone(previous.plan), replayed: true };
    }
    const p = find(cmd.projectId, cmd.planId);
    ensure(!p.draft, "ยืนยันแผนรับก่อนบันทึกการรับจริง");
    work(p);
    commands.set(cmd.commandId, {
      action,
      fingerprint,
      plan: structuredClone(p),
    });
    return { plan: structuredClone(p), replayed: false };
  }
  return {
    list: (projectId) =>
      structuredClone(plans.filter((p) => p.projectId === projectId)),
    get: (projectId, id) => structuredClone(find(projectId, id)),
    reset() {
      plans = initialPlans();
      commands.clear();
      sequence = 8;
    },
    create(input, role) {
      ensure(can(role, "create"), "บทบาทนี้ดูข้อมูลได้ แต่สร้างแผนไม่ได้");
      const project = projects.find((p) => p.id === input.projectId);
      ensure(project, "ไม่พบโปรเจกต์");
      ensure(
        project.supplierIndexes.some(
          (index) => suppliers[index] === input.supplier,
        ) && project.itemIds.includes(input.itemId),
        "เลือก Supplier และสินค้าในโปรเจกต์นี้",
      );
      ensure(
        project.warehouseIds.includes(input.warehouseId),
        "เลือกคลังสินค้าในโปรเจกต์นี้",
      );
      ensure(validDate(input.expectedDate), "ระบุวันนัดรับที่ถูกต้อง");
      positive(input.qty);
      const suffix = String(sequence++).padStart(3, "0");
      const p = {
        id: `${input.projectId}-${suffix}`,
        projectId: input.projectId,
        number: `RP-261003-${suffix}`,
        supplier: input.supplier,
        warehouseId: input.warehouseId,
        warehouse: input.warehouseId === "wh1" ? "คลังหลัก" : "คลังสำรอง",
        expectedDate: input.expectedDate,
        reference: input.reference,
        note: input.note,
        draft: true,
        lines: [{ id: "l1", itemId: input.itemId, expected: input.qty }],
        batches: [],
        activity: [],
      };
      record(p, "บันทึกแผนฉบับร่าง");
      plans.unshift(p);
      return structuredClone(p);
    },
    release(projectId, id, role) {
      ensure(can(role, "create"), "บทบาทนี้ยืนยันแผนรับไม่ได้");
      const p = find(projectId, id);
      ensure(p.draft, "แผนนี้ยืนยันแล้ว");
      p.draft = false;
      record(p, "ยืนยันแผน · พร้อมรับสินค้า");
      return structuredClone(p);
    },
    receive(cmd, role) {
      return execute("receive", cmd, role, (p) => {
        const line = p.lines.find((l) => l.id === cmd.lineId);
        ensure(line, "เลือกสินค้าที่อยู่ในแผนรับ");
        positive(cmd.qty);
        const config = projects.find((x) => x.id === p.projectId);
        ensure(
          cmd.qty <= line.expected - totals(p, line.id).received,
          "จำนวนรับเกินยอดค้างในแผน",
        );
        ensure(!config.lotControl || cmd.lot.trim(), "โปรเจกต์นี้ต้องระบุ Lot");
        ensure(
          !config.expiryControl ||
            (validDate(cmd.expiry) && cmd.expiry >= demoDate),
          "ระบุวันหมดอายุที่ไม่ก่อนวันรับสินค้า",
        );
        p.batches.push({
          id: `b${p.batches.length + 1}`,
          lineId: line.id,
          qty: cmd.qty,
          lot: config.lotControl ? cmd.lot.trim() : "",
          expiry: config.expiryControl ? cmd.expiry : "",
          receivedAt: demoDate,
          inspected: !config.inspection,
          accepted: config.inspection ? 0 : cmd.qty,
          rejected: 0,
          reason: "",
          putaway: 0,
          placements: [],
        });
        record(
          p,
          `รับ ${catalog.find((i) => i.id === line.itemId).code} ${cmd.qty} ชิ้น → พื้นที่รับเข้า${cmd.lot ? ` · ${cmd.lot}` : ""}`,
        );
      });
    },
    inspect(cmd, role) {
      return execute("inspect", cmd, role, (p) => {
        const b = p.batches.find((b) => b.id === cmd.batchId);
        ensure(b && !b.inspected, "เลือก batch ที่ยังรอตรวจ");
        ensure(
          Number.isSafeInteger(cmd.accepted) &&
            Number.isSafeInteger(cmd.rejected) &&
            cmd.accepted >= 0 &&
            cmd.rejected >= 0 &&
            cmd.accepted + cmd.rejected === b.qty,
          `ยอดผ่านและไม่ผ่านต้องรวมเป็น ${b.qty} ชิ้น`,
        );
        ensure(
          !cmd.rejected || cmd.reason.trim(),
          "ระบุเหตุผลสำหรับสินค้าที่ไม่ผ่าน",
        );
        Object.assign(b, {
          inspected: true,
          accepted: cmd.accepted,
          rejected: cmd.rejected,
          reason: cmd.reason.trim(),
        });
        record(
          p,
          `ตรวจ ${batchLabel(p, b)} · ผ่าน ${b.accepted} / กักกัน ${b.rejected} ชิ้น${b.reason ? ` · ${b.reason}` : ""}`,
        );
      });
    },
    putaway(cmd, role) {
      return execute("putaway", cmd, role, (p) => {
        const b = p.batches.find((b) => b.id === cmd.batchId);
        ensure(
          b?.inspected,
          "สินค้าต้องผ่านตรวจ หรือเป็นโปรเจกต์ที่ไม่ต้องตรวจ",
        );
        positive(cmd.qty);
        ensure(
          cmd.qty <= b.accepted - b.putaway,
          "จำนวนจัดเก็บเกินยอดผ่านตรวจที่เหลือ",
        );
        ensure(
          locations.some(
            (l) =>
              l.id === cmd.locationId &&
              l.warehouseId === p.warehouseId &&
              l.type === "STORAGE",
          ),
          "เลือกตำแหน่งจัดเก็บในคลังเดียวกัน",
        );
        b.putaway += cmd.qty;
        b.placements.push({ locationId: cmd.locationId, qty: cmd.qty });
        record(
          p,
          `จัดเก็บ ${cmd.qty} ชิ้น → ${cmd.locationId} · ${batchLabel(p, b)}`,
        );
      });
    },
  };
}
