import {
  projects,
  catalog,
  suppliers,
  locations,
  demoDate,
} from "./fixtures.js";
import { createStore, totals, status, statuses, can } from "./inbound-state.js";

const store = createStore();
const state = {
  projectId: "apo",
  role: "manager",
  planId: null,
  query: "",
  filter: "all",
  warehouse: "all",
  stage: "receive",
  batchId: null,
  lineId: null,
  failed: false,
};
const main = document.querySelector("main");
const dialog = document.querySelector("dialog");
let lastCommand;
let toastTimer;
const e = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const icon = (name) => `<svg aria-hidden="true"><use href="#${name}"/></svg>`;
const n = (value) => Number(value).toLocaleString("en-US");
const date = (value) =>
  new Date(value + "T12:00:00").toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
const item = (id) => catalog.find((i) => i.id === id);
const config = () => projects.find((p) => p.id === state.projectId);
const badge = (p) =>
  `<span class="badge ${status(p)}">${statuses[status(p)]}</span>`;
const projectOptions = () =>
  projects
    .map(
      (p) =>
        `<option value="${p.id}" ${p.id === state.projectId ? "selected" : ""}>${p.name}</option>`,
    )
    .join("");
const mobileProject = () =>
  `<label class="mobile-only mobile-project">โปรเจกต์ <select id="mobile-project" aria-label="โปรเจกต์ที่ทำงานบนมือถือ">${projectOptions()}</select></label>`;
function toast(message) {
  const el = document.querySelector("#toast");
  el.textContent = message;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.hidden = true;
  }, 4500);
}
function changeProject(projectId) {
  Object.assign(state, {
    projectId,
    planId: null,
    query: "",
    filter: "all",
    warehouse: "all",
    failed: false,
  });
  document.querySelector("#project").value = projectId;
  history.replaceState(null, "", "#");
  render();
}
function openPlan(id) {
  const p = store.get(state.projectId, id);
  Object.assign(state, {
    planId: id,
    stage:
      status(p) === "inspection"
        ? "inspect"
        : status(p) === "putaway"
          ? "putaway"
          : "receive",
    batchId: null,
    lineId: null,
  });
  history.pushState(
    { projectId: state.projectId, planId: id },
    "",
    `#${state.projectId}/${id}`,
  );
  render();
  main.focus();
  window.scrollTo(0, 0);
}
function goList() {
  state.planId = null;
  history.pushState(null, "", "#");
  render();
  main.focus();
}
function render() {
  document.querySelector("#crumb-project").textContent = config().name;
  document.querySelector("#role-name").textContent =
    `${{ manager: "ผู้จัดการ", supervisor: "หัวหน้างาน", operator: "เจ้าหน้าที่", customer: "ผู้ดูข้อมูล" }[state.role]} · บัญชีตัวอย่าง`;
  if (state.failed) {
    main.innerHTML =
      mobileProject() +
      `<div class="surface empty">${icon("inbox")}<h1>โหลดรายการไม่สำเร็จ</h1><p>การเชื่อมต่อขัดข้อง กรุณาลองใหม่อีกครั้ง</p><button class="primary" data-action="retry">ลองใหม่</button></div>`;
    return;
  }
  if (state.planId) renderDetail();
  else renderList();
}
function renderList() {
  const plans = store.list(state.projectId);
  const count = (s) => plans.filter((p) => s.includes(status(p))).length;
  const stats = [
    ["clock", "รอรับ / กำลังรับ", count(["planned", "receiving"])],
    ["shield", "รอตรวจสินค้า", count(["inspection"])],
    ["layers", "รอจัดเก็บ", count(["putaway"])],
    ["check", "เสร็จแล้ว", count(["completed"])],
  ];
  main.innerHTML = `${mobileProject()}<section class="page-title"><div><p class="eyebrow">INBOUND OPERATIONS</p><h1>รับสินค้าเข้า</h1><p class="subtext">วางแผนรับ ตรวจสอบ และติดตามสินค้าจนถึงตำแหน่งจัดเก็บ</p></div>${can(state.role, "create") ? `<button class="primary" data-action="create">${icon("plus")}สร้างแผนรับเข้า</button>` : '<span class="badge draft">มุมมองตามสิทธิ์ที่เลือก</span>'}</section>
    <div class="stats">${stats.map(([symbol, label, count]) => `<div class="stat"><span class="stat-icon">${icon(symbol)}</span><div><span class="stat-label">${label}</span><strong>${count}</strong><small>เอกสาร</small></div></div>`).join("")}</div>
    <section class="surface"><div class="list-heading"><h2>รายการรับสินค้า<span class="count-pill">${plans.length} เอกสาร</span></h2><span class="desktop-date">3 ตุลาคม 2569</span></div>
    <div class="tabs" aria-label="กรองสถานะ">${[
      ["all", "ทั้งหมด"],
      ["planned", "รอรับ"],
      ["receiving", "กำลังรับ"],
      ["inspection", "รอตรวจ"],
      ["putaway", "รอจัดเก็บ"],
      ["completed", "เสร็จแล้ว"],
      ["on_hold", "กักกัน"],
      ["draft", "ฉบับร่าง"],
    ]
      .map(
        ([key, label]) =>
          `<button class="tab ${state.filter === key ? "active" : ""}" data-filter="${key}" aria-pressed="${state.filter === key}">${label}<span>${key === "all" ? plans.length : count([key])}</span></button>`,
      )
      .join("")}</div>
    <div class="filters"><label class="search">${icon("search")}<input id="search" type="search" aria-label="ค้นหาเอกสารรับสินค้า" placeholder="ค้นหาเลขเอกสาร, Supplier หรือสินค้า…" value="${e(state.query)}"></label><select id="warehouse" aria-label="กรองคลัง"><option value="all">ทุกคลังสินค้า</option><option value="wh1" ${state.warehouse === "wh1" ? "selected" : ""}>คลังหลัก</option><option value="wh2" ${state.warehouse === "wh2" ? "selected" : ""}>คลังสำรอง</option></select></div>
    <div id="list-results"></div></section>
    <div class="hint">${icon("shield")}<span>ตรวจยอดรับจริงก่อนยืนยันทุกครั้ง · สินค้าที่ต้องตรวจจะพร้อมจัดเก็บหลังผ่านการตรวจเท่านั้น</span></div>
    <div class="config"><span>Project: ${config().name}</span><span>Lot ${config().lotControl ? "เปิด" : "ปิด"}</span><span>วันหมดอายุ ${config().expiryControl ? "เปิด" : "ปิด"}</span><span>ตรวจสินค้า ${config().inspection ? "เปิด" : "ปิด"}</span></div>`;
  renderResults();
}
function renderResults() {
  const query = state.query.trim().toLowerCase();
  const all = store.list(state.projectId);
  const filtered = all.filter(
    (p) =>
      (state.filter === "all" || status(p) === state.filter) &&
      (state.warehouse === "all" || p.warehouseId === state.warehouse) &&
      `${p.number} ${p.reference} ${p.supplier} ${p.lines.map((l) => `${item(l.itemId).code} ${item(l.itemId).name}`).join(" ")}`
        .toLowerCase()
        .includes(query),
  );
  const container = document.querySelector("#list-results");
  if (!filtered.length) {
    container.innerHTML = `<div class="empty">${icon("inbox")}<h2>${all.length ? "ไม่พบรายการที่ค้นหา" : "ยังไม่มีแผนรับสินค้า"}</h2><p>${all.length ? "ลองเปลี่ยนคำค้นหาหรือสถานะที่เลือก" : "เริ่มวางแผนการรับสินค้าสำหรับโปรเจกต์นี้"}</p>${all.length ? '<button class="secondary" data-action="clear">ล้างตัวกรอง</button>' : can(state.role, "create") ? '<button class="primary" data-action="create">สร้างแผนรับเข้า</button>' : ""}</div>`;
    return;
  }
  container.innerHTML = `<div class="table-wrap"><table class="list-table"><thead><tr><th>เอกสารรับเข้า</th><th>Supplier / คลัง</th><th>นัดรับ</th><th>สถานะ</th><th>รับแล้ว / แผน</th><th><span class="sr-only">การทำงาน</span></th></tr></thead><tbody>${filtered
    .map((p) => {
      const t = totals(p);
      return `<tr><td><span class="ref">${p.number}</span><span class="cell-note">${e(p.reference || "ไม่มี reference")} · ${p.lines.length} SKU</span></td><td>${e(p.supplier)}<span class="cell-note">${p.warehouse}</span></td><td>${date(p.expectedDate)}</td><td>${badge(p)}</td><td><span class="number">${n(t.received)} <span class="qty-secondary">/ ${n(t.expected)} ชิ้น</span></span><progress max="${t.expected}" value="${t.received}" aria-label="รับแล้ว ${t.received} จาก ${t.expected} ชิ้น"></progress></td><td><button class="text-button" data-plan="${p.id}">ดูรายละเอียด ${icon("arrow")}</button></td></tr>`;
    })
    .join(
      "",
    )}</tbody></table></div><div class="list-footer"><span>แสดง ${filtered.length} จาก ${all.length} เอกสารใน ${config().name}</span><span>วันที่อ้างอิงของต้นแบบ: 3 ต.ค. 2569</span></div>`;
}
function renderDetail() {
  const p = store.get(state.projectId, state.planId);
  const t = totals(p);
  const current = status(p);
  const stepIndex =
    current === "draft"
      ? 0
      : ["planned", "receiving"].includes(current)
        ? 1
        : current === "inspection"
          ? 2
          : 3;
  main.innerHTML = `${mobileProject()}<button class="text-button back" data-action="list">${icon("arrow")}รายการรับสินค้า</button>
    <section class="page-title"><div><p class="eyebrow">RECEIVE PLAN / ${config().name.toUpperCase()}</p><div class="title-inline"><h1>${p.number}</h1>${badge(p)}</div><div class="meta"><span>Supplier<strong>${e(p.supplier)}</strong></span><span>คลังสินค้า<strong>${p.warehouse}</strong></span><span>นัดรับ<strong>${date(p.expectedDate)}</strong></span><span>Reference<strong>${e(p.reference || "—")}</strong></span></div></div>${p.draft && can(state.role, "create") ? '<button class="primary" data-action="release">ยืนยันแผนรับ</button>' : ""}</section>
    <div class="steps">${[
      ["แผนรับสินค้า", "Receive plan"],
      ["รับสินค้า", "Receiving"],
      [config().inspection ? "ตรวจสินค้า" : "ข้ามการตรวจ", "Inspection"],
      ["จัดเก็บสินค้า", "Putaway"],
    ]
      .map(
        ([th, en], i) =>
          `<div class="step ${i === stepIndex && current !== "completed" ? "current" : ""} ${i < stepIndex || current === "completed" ? "done" : ""}"><b>${i < stepIndex || current === "completed" ? "✓" : i + 1}</b><span>${th}<small>${en}</small></span></div>`,
      )
      .join("")}</div>
    <div class="detail-grid"><div><section class="surface"><div class="card-head"><h2 class="card-heading">รายการสินค้า</h2><span class="count-pill">${p.lines.length} SKU</span></div><div class="table-wrap"><table><thead><tr><th>สินค้า / หน่วย</th><th>แผน</th><th>รับแล้ว</th><th>ผ่านตรวจ</th><th>จัดเก็บ</th></tr></thead><tbody>${p.lines
      .map((l) => {
        const q = totals(p, l.id);
        const i = item(l.itemId);
        return `<tr><td><span class="ref">${i.code}</span><span class="cell-note">${i.name}</span><span class="cell-note">หน่วย: ${i.unit}</span></td><td>${n(q.expected)}</td><td>${n(q.received)}</td><td>${n(q.accepted)}</td><td class="number">${n(q.putaway)}</td></tr>`;
      })
      .join(
        "",
      )}</tbody></table></div><div class="list-footer"><span>รับแล้ว ${t.received} / ${t.expected} ชิ้น · จัดเก็บแล้ว ${t.putaway} ชิ้น</span></div></section>
    ${t.rejected ? `<div class="form-error" role="note"><b>กักกัน ${t.rejected} ชิ้น</b> · แยกจากยอดจัดเก็บ รอพิจารณาข้อยกเว้น</div>` : ""}
    <section class="surface activity"><h2>บันทึกการทำงาน</h2><ol>${p.activity.map((a) => `<li><div>${e(a.label)}<small>${e(a.time)} · ${e(a.actor)}</small></div></li>`).join("")}</ol></section>
    <div class="hint">${icon("box")}<span>${e(p.note || "รับและตรวจนับสินค้าตามแผน")}<br>พื้นที่รับเข้า: REC-01 · การจัดเก็บย้ายสินค้าชุดเดิม ไม่เพิ่มยอดรับซ้ำ</span></div></div>
    <section class="surface action-panel"><div class="action-tabs" aria-label="ขั้นตอนปฏิบัติงาน">${[
      ["receive", "รับเข้า"],
      ["inspect", "ตรวจสินค้า"],
      ["putaway", "จัดเก็บ"],
    ]
      .map(
        ([key, label]) =>
          `<button data-stage="${key}" class="${state.stage === key ? "active" : ""}" aria-pressed="${state.stage === key}">${label}</button>`,
      )
      .join(
        "",
      )}</div><div id="action-content" class="form-body"></div></section></div>`;
  renderAction(p);
}
function renderAction(p) {
  const host = document.querySelector("#action-content");
  const t = totals(p);
  if (p.draft) {
    host.innerHTML = `<div class="empty">${icon("clock")}<h3>แผนยังเป็นฉบับร่าง</h3><p>ตรวจข้อมูลและยืนยันแผนรับ<br>ก่อนเริ่มบันทึกรับสินค้า</p></div>`;
    return;
  }
  if (status(p) === "completed") {
    host.innerHTML = `<div class="empty">${icon("check")}<h3>รับและจัดเก็บครบแล้ว</h3><p>สินค้า ${t.putaway} ชิ้น มีตำแหน่งจัดเก็บครบตามแผน</p><button class="secondary" data-action="list">กลับรายการรับสินค้า</button></div>`;
    return;
  }
  if (!can(state.role, state.stage)) {
    host.innerHTML = `<div class="empty">${icon("shield")}<h3>ดูข้อมูลได้ตามสิทธิ์</h3><p>บทบาทที่เลือกไม่มีสิทธิ์${{ receive: "รับสินค้า", inspect: "ตรวจสินค้า", putaway: "จัดเก็บสินค้า" }[state.stage]}<br>เปลี่ยนบทบาทได้ที่ตัวเลือกต้นแบบ</p></div>`;
    return;
  }
  if (state.stage === "receive") {
    const remaining = p.lines.filter(
      (l) => totals(p, l.id).received < l.expected,
    );
    if (!remaining.length) {
      host.innerHTML = `<div class="empty">${icon("check")}<h3>รับครบตามแผนแล้ว</h3><p>ดำเนินการ${config().inspection ? "ตรวจสินค้า" : "จัดเก็บ"}ต่อในขั้นถัดไป</p><button class="primary" data-stage="${config().inspection ? "inspect" : "putaway"}">ไป${config().inspection ? "ตรวจสินค้า" : "จัดเก็บ"}</button></div>`;
      return;
    }
    const selected =
      remaining.find((l) => l.id === state.lineId) || remaining[0];
    state.lineId = selected.id;
    const left = selected.expected - totals(p, selected.id).received;
    host.innerHTML = `<p class="eyebrow">RECEIVING</p><h2 class="card-heading">บันทึกรับสินค้า</h2><label class="scan-label">สแกน Barcode<div class="scan-wrap"><input id="barcode" placeholder="สแกนหรือพิมพ์ Barcode" autocomplete="off">${icon("scan")}</div><span class="field-help">สแกนเพื่อเลือกสินค้า แล้วระบุจำนวนรับ</span></label><button class="scan-example" data-action="sample-barcode">ใช้ Barcode ตัวอย่าง ${item(selected.itemId).barcode}</button>
      <form id="action-form" data-method="receive"><label>สินค้าในแผน<select name="lineId" id="line-id">${remaining.map((l) => `<option value="${l.id}" ${l.id === selected.id ? "selected" : ""}>${item(l.itemId).code} · ${item(l.itemId).name}</option>`).join("")}</select></label><div class="batch-context">ยอดค้างรับ <b>${left} ชิ้น</b> · REC-01 / ${p.warehouse}</div>
      <label>จำนวนรับครั้งนี้ <input name="qty" id="receive-qty" type="number" inputmode="numeric" min="1" max="${left}" step="1" placeholder="ระบุจำนวนที่ตรวจนับได้" required></label>
      ${config().lotControl ? '<label>Lot Number <input name="lot" placeholder="เช่น LOT-261003-A" maxlength="60" required></label>' : ""}
      ${config().expiryControl ? `<label>วันหมดอายุ <input name="expiry" type="date" min="${demoDate}" required></label>` : ""}
      <div class="summary-line"><span>วันที่รับ</span><b>${date(demoDate)}</b></div><div id="form-error" class="form-error" role="alert" hidden></div><button class="primary" type="submit">${icon("check")}ยืนยันรับสินค้า</button><p class="action-caption">${config().inspection ? "หลังรับ จะรอตรวจสินค้าก่อนจัดเก็บ" : "โปรเจกต์นี้จัดเก็บต่อได้โดยไม่ผ่านการตรวจ"}</p></form>`;
  } else {
    const inspecting = state.stage === "inspect";
    const batches = p.batches.filter((b) =>
      inspecting ? !b.inspected : b.inspected && b.accepted > b.putaway,
    );
    if (!batches.length) {
      host.innerHTML = `<div class="empty">${icon("layers")}<h3>${inspecting ? "ไม่มีสินค้ารอตรวจ" : "ไม่มีสินค้ารอจัดเก็บ"}</h3><p>${!config().inspection && inspecting ? "โปรเจกต์นี้ไม่ต้องตรวจสินค้า" : t.rejected ? "สินค้าที่ไม่ผ่านอยู่ในพื้นที่กักกัน" : "บันทึกขั้นก่อนหน้า แล้วกลับมาดำเนินการต่อ"}</p><button class="secondary" data-stage="${inspecting ? "putaway" : "receive"}">${inspecting ? "ไปจัดเก็บ" : "กลับไปรับสินค้า"}</button></div>`;
      return;
    }
    const selected = batches.find((b) => b.id === state.batchId) || batches[0];
    state.batchId = selected.id;
    const line = p.lines.find((l) => l.id === selected.lineId);
    const i = item(line.itemId);
    const left = selected.accepted - selected.putaway;
    host.innerHTML = `<p class="eyebrow">${inspecting ? "QUALITY INSPECTION" : "PUTAWAY"}</p><h2 class="card-heading">${inspecting ? "บันทึกผลการตรวจ" : "บันทึกตำแหน่งจัดเก็บ"}</h2><form id="action-form" data-method="${state.stage}"><label>Batch ที่${inspecting ? "รอตรวจ" : "ผ่านตรวจ"}<select id="batch-id" name="batchId">${batches.map((b) => `<option value="${b.id}" ${b.id === selected.id ? "selected" : ""}>${item(p.lines.find((l) => l.id === b.lineId).itemId).code} · ${e(b.id)} · ${e(b.lot || "ไม่ควบคุม Lot")} · ${inspecting ? b.qty : b.accepted - b.putaway} ชิ้น</option>`).join("")}</select></label><div class="batch-context"><b>${i.code}</b> · ${i.name}<br>Lot: ${e(selected.lot || "ไม่ควบคุม")}<br>หมดอายุ: ${selected.expiry ? date(selected.expiry) : "ไม่ควบคุม"}<br>${inspecting ? "รอตรวจ" : "พร้อมจัดเก็บ"} <b>${inspecting ? selected.qty : left} ชิ้น</b></div>
      ${
        inspecting
          ? `<div class="field-row"><label>ผ่านตรวจ<input name="accepted" type="number" min="0" max="${selected.qty}" step="1" value="${selected.qty}" required></label><label>ไม่ผ่าน<input name="rejected" type="number" min="0" max="${selected.qty}" step="1" value="0" required></label></div><label>เหตุผลที่ไม่ผ่าน<input name="reason" placeholder="ระบุเมื่อมีสินค้าไม่ผ่าน" maxlength="200"></label><span class="field-help">ยอดรวมต้องเท่ากับ ${selected.qty} ชิ้น · ไม่ผ่านจะแยกกักกัน</span>`
          : `<label>ตำแหน่งปลายทาง<select name="locationId" required><option value="">เลือกตำแหน่งจัดเก็บ</option>${locations
              .filter((l) => l.warehouseId === p.warehouseId)
              .map((l) => `<option value="${l.id}">${l.name}</option>`)
              .join(
                "",
              )}</select></label><label>จำนวนจัดเก็บครั้งนี้<input name="qty" type="number" min="1" max="${left}" step="1" value="${left}" required></label><span class="field-help">รับบางส่วนไปจัดเก็บได้ ไม่เกินยอดผ่านตรวจคงเหลือ</span>`
      }
      <div id="form-error" class="form-error" role="alert" hidden></div><button class="primary" type="submit">${icon("check")}${inspecting ? "ยืนยันผลการตรวจ" : "ยืนยันจัดเก็บ"}</button></form>`;
  }
}
function createDialog() {
  dialog.innerHTML = `<div class="dialog-header"><div><p class="eyebrow">NEW RECEIVE PLAN</p><h2 id="dialog-title">สร้างแผนรับเข้า</h2><p>${config().name} · บันทึกเป็นฉบับร่างก่อนยืนยันรับ</p></div><button class="close" data-action="close" aria-label="ปิดฟอร์ม">×</button></div><form id="create-form"><div class="dialog-content"><div class="form-grid"><label>Supplier<select name="supplier" required><option value="">เลือกผู้ส่งสินค้า</option>${config()
    .supplierIndexes.map((index) => suppliers[index])
    .map((s) => `<option>${s}</option>`)
    .join(
      "",
    )}</select></label><label>คลังสินค้า<select name="warehouseId">${config()
    .warehouseIds.map(
      (id) =>
        `<option value="${id}">${id === "wh1" ? "คลังหลัก" : "คลังสำรอง"}</option>`,
    )
    .join(
      "",
    )}</select></label><label>วันที่นัดรับ<input type="date" name="expectedDate" value="${demoDate}" required></label><label>Reference / เลข PO<input name="reference" placeholder="เช่น PO-26-010" maxlength="80"></label><label class="full">สินค้า<select name="itemId">${catalog
    .filter((i) => config().itemIds.includes(i.id))
    .map((i) => `<option value="${i.id}">${i.code} · ${i.name}</option>`)
    .join(
      "",
    )}</select></label><label>จำนวนคาดรับ (ชิ้น)<input name="qty" type="number" min="1" step="1" required placeholder="เช่น 120"></label><label class="full">หมายเหตุ<textarea name="note" rows="2" placeholder="ข้อมูลที่เจ้าหน้าที่ควรทราบ" maxlength="300"></textarea></label></div><p class="field-help">แบบร่างนี้ทดลองหนึ่ง SKU ต่อเอกสาร · หน้ารายละเอียดมีตัวอย่างหลาย SKU</p><div id="create-error" class="form-error" role="alert" hidden></div></div><div class="dialog-footer"><button class="secondary" type="button" data-action="close">ยกเลิก</button><button class="primary" type="submit">บันทึกฉบับร่าง</button></div></form>`;
  dialog.showModal();
}
async function submitOperation(form) {
  if (form.querySelector("[type=submit]").disabled) return;
  const submittedRole = state.role;
  const values = Object.fromEntries(new FormData(form));
  const method = form.dataset.method;
  const cmd = {
    ...values,
    projectId: state.projectId,
    planId: state.planId,
    commandId: crypto.randomUUID(),
  };
  for (const key of ["qty", "accepted", "rejected"])
    if (key in cmd) cmd[key] = Number(cmd[key]);
  if (method === "receive") {
    cmd.lot = cmd.lot || "";
    cmd.expiry = cmd.expiry || "";
  }
  const button = form.querySelector("[type=submit]");
  button.disabled = true;
  button.textContent = "กำลังบันทึก…";
  const error = form.querySelector("[role=alert]");
  error.hidden = true;
  await new Promise((resolve) => setTimeout(resolve, 350));
  // This delay models a local preview only: replacing the form cancels its work.
  if (!form.isConnected || submittedRole !== state.role ||
      cmd.projectId !== state.projectId || cmd.planId !== state.planId) return;
  try {
    store[method](cmd, submittedRole);
    lastCommand = { method, cmd };
    document.querySelector("#replay-demo").disabled = false;
    toast(
      {
        receive: "บันทึกรับสินค้าแล้ว · ข้อมูลตัวอย่าง",
        inspect: "บันทึกผลการตรวจแล้ว · ข้อมูลตัวอย่าง",
        putaway: "บันทึกจัดเก็บแล้ว · ข้อมูลตัวอย่าง",
      }[method],
    );
    state.batchId = null;
    renderDetail();
  } catch (caught) {
    error.textContent = caught.message;
    error.hidden = false;
    button.disabled = false;
    button.textContent = {
      receive: "ยืนยันรับสินค้า",
      inspect: "ยืนยันผลการตรวจ",
      putaway: "ยืนยันจัดเก็บ",
    }[method];
  }
}
function scanBarcode(value) {
  const p = store.get(state.projectId, state.planId);
  const found = catalog.find((i) => i.barcode === value.trim());
  const line = found && p.lines.find((l) => l.itemId === found.id);
  if (!line) {
    toast("ไม่พบ Barcode นี้ในแผนรับสินค้า");
    return;
  }
  if (totals(p, line.id).received >= line.expected) {
    toast("สินค้านี้รับครบตามแผนแล้ว");
    return;
  }
  state.lineId = line.id;
  renderAction(p);
  document.querySelector("#barcode").value = value;
  document.querySelector("#receive-qty").focus();
}
document.addEventListener("click", async (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  if (button.dataset.plan) {
    openPlan(button.dataset.plan);
    return;
  }
  if (button.dataset.filter) {
    state.filter = button.dataset.filter;
    renderList();
    return;
  }
  if (button.dataset.stage) {
    state.stage = button.dataset.stage;
    state.batchId = null;
    renderDetail();
    return;
  }
  const action = button.dataset.action;
  if (action === "create") createDialog();
  if (action === "close") dialog.close();
  if (action === "list") goList();
  if (action === "clear") {
    state.query = "";
    state.filter = "all";
    state.warehouse = "all";
    renderList();
  }
  if (action === "release") {
    try {
      store.release(state.projectId, state.planId, state.role);
      renderDetail();
      toast("ยืนยันแผนรับแล้ว");
    } catch (error) {
      toast(error.message);
    }
  }
  if (action === "sample-barcode") {
    const p = store.get(state.projectId, state.planId);
    scanBarcode(
      item(p.lines.find((l) => l.id === state.lineId).itemId).barcode,
    );
  }
  if (action === "retry") {
    button.disabled = true;
    button.textContent = "กำลังโหลด…";
    await new Promise((r) => setTimeout(r, 350));
    state.failed = false;
    render();
  }
});
document.addEventListener("submit", (event) => {
  if (event.target.id === "action-form") {
    event.preventDefault();
    void submitOperation(event.target);
  }
  if (event.target.id === "create-form") {
    event.preventDefault();
    const input = Object.fromEntries(new FormData(event.target));
    try {
      const p = store.create(
        { ...input, qty: Number(input.qty), projectId: state.projectId },
        state.role,
      );
      dialog.close();
      openPlan(p.id);
      toast("บันทึกแผนฉบับร่างแล้ว");
    } catch (error) {
      const el = document.querySelector("#create-error");
      el.hidden = false;
      el.textContent = error.message;
    }
  }
});
main.addEventListener("input", (event) => {
  if (event.target.id === "search") {
    state.query = event.target.value;
    renderResults();
  }
});
main.addEventListener("change", (event) => {
  if (event.target.id === "warehouse") {
    state.warehouse = event.target.value;
    renderResults();
  }
  if (event.target.id === "mobile-project") changeProject(event.target.value);
  if (event.target.id === "line-id") {
    state.lineId = event.target.value;
    renderAction(store.get(state.projectId, state.planId));
  }
  if (event.target.id === "batch-id") {
    state.batchId = event.target.value;
    renderAction(store.get(state.projectId, state.planId));
  }
});
main.addEventListener("keydown", (event) => {
  if (event.target.id === "barcode" && event.key === "Enter") {
    event.preventDefault();
    scanBarcode(event.target.value);
  }
});
document
  .querySelector("#project")
  .addEventListener("change", (event) => changeProject(event.target.value));
document.querySelector("#role").addEventListener("change", (event) => {
  state.role = event.target.value;
  render();
});
document.querySelector("#nav-inbound").addEventListener("click", goList);
document.querySelector("#brand-home").addEventListener("click", (event) => {
  event.preventDefault();
  goList();
});
document.querySelector("#options-toggle").addEventListener("click", (event) => {
  const panel = document.querySelector("#demo-options");
  panel.hidden = !panel.hidden;
  event.currentTarget.setAttribute("aria-expanded", String(!panel.hidden));
});
document.querySelector("#error-demo").addEventListener("click", () => {
  state.failed = true;
  render();
});
document.querySelector("#reset-demo").addEventListener("click", () => {
  store.reset();
  lastCommand = null;
  document.querySelector("#replay-demo").disabled = true;
  changeProject(state.projectId);
  toast("คืนข้อมูลตัวอย่างเริ่มต้นแล้ว");
});
document.querySelector("#replay-demo").addEventListener("click", () => {
  if (!lastCommand) return;
  try {
    const result = store[lastCommand.method](lastCommand.cmd, state.role);
    toast(
      result.replayed
        ? "รายการนี้บันทึกแล้ว · ไม่เพิ่มยอดซ้ำ"
        : "บันทึกรายการแล้ว",
    );
    render();
  } catch (error) {
    toast(error.message);
  }
});
window.addEventListener("popstate", () => {
  const [projectId, planId] = location.hash.slice(1).split("/");
  if (projects.some((p) => p.id === projectId)) {
    state.projectId = projectId;
    document.querySelector("#project").value = projectId;
    try {
      store.get(projectId, planId);
      state.planId = planId;
    } catch {
      state.planId = null;
    }
  } else state.planId = null;
  render();
});
render();
