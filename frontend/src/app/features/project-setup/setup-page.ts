import { SetupDialog } from './setup-dialog';
import { ChangeDetectionStrategy, Component, HostListener, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { Topbar } from '../../core/layout/topbar';
import { SessionService } from '../../core/auth/session.service';
import { apiErrorMessage } from '../../core/http/api-error';
import { SetupApi } from './setup-api.service';
import { makeDraft, sectionInput } from './setup-draft';
import {
  SetupDetail,
  SetupDraft,
  SetupSection,
  WritableSection,
  statusLabels,
} from './setup.model';
import { GeneralFields } from './general-fields';
import { WarehouseFields } from './warehouse-fields';
import { RuleFields } from './rule-fields';
import { MemberFields } from './member-fields';
import { SetupHistory } from './setup-history';
@Component({
  selector: 'wms-project-setup',
  imports: [
    SetupDialog,
    Topbar,
    RouterLink,
    DatePipe,
    GeneralFields,
    WarehouseFields,
    RuleFields,
    MemberFields,
    SetupHistory,
  ],
  templateUrl: './setup-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SetupPage {
  private readonly api = inject(SetupApi);
  private readonly route = inject(ActivatedRoute);
  readonly session = inject(SessionService);
  readonly detail = signal<SetupDetail | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly success = signal('');
  readonly conflict = signal(false);
  readonly dirty = signal(false);
  readonly section = signal<SetupSection>('general');
  readonly leavePrompt = signal(false);
  readonly statusPrompt = signal<'active' | 'inactive' | null>(null);
  readonly labels = statusLabels;
  readonly tabs: { id: SetupSection; name: string }[] = [
    { id: 'general', name: 'ข้อมูลทั่วไป' },
    { id: 'warehouses', name: 'คลังสินค้า' },
    { id: 'rules', name: 'กฎของโปรเจกต์' },
    { id: 'members', name: 'สมาชิก' },
    { id: 'history', name: 'ประวัติ' },
  ];
  draft!: SetupDraft;
  private id = '';
  private generation = 0;
  private resolveLeave?: (answer: boolean) => void;
  sectionTitle() {
    return this.tabs.find((tab) => tab.id === this.section())?.name;
  }
  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      this.id = params.get('projectId') ?? '';
      this.section.set('general');
      void this.load();
    });
  }
  async load() {
    const generation = ++this.generation;
    this.loading.set(true);
    this.error.set('');
    this.detail.set(null);
    try {
      const d = await this.api.detail(this.id);
      if (generation === this.generation) this.apply(d);
    } catch (error) {
      if (generation === this.generation)
        this.error.set(apiErrorMessage(error, 'โหลดการตั้งค่าไม่สำเร็จ'));
    } finally {
      if (generation === this.generation) this.loading.set(false);
    }
  }
  private apply(d: SetupDetail) {
    this.detail.set(d);
    this.draft = makeDraft(d);
    this.dirty.set(false);
    this.conflict.set(false);
  }
  changed() {
    const section = this.section();
    if (section === 'history') return;
    const d = this.detail()!;
    this.dirty.set(
      JSON.stringify(sectionInput(section, this.draft, d.canAdmin, 0)) !==
        JSON.stringify(sectionInput(section, makeDraft(d), d.canAdmin, 0)),
    );
    this.success.set('');
  }
  writable() {
    const d = this.detail();
    return (
      !!d &&
      this.section() !== 'history' &&
      (this.section() === 'general' ||
        this.section() === 'warehouses' ||
        (d.canAdmin && (this.section() !== 'rules' || !d.project.firstTransactionAt)))
    );
  }
  reset() {
    this.draft = makeDraft(this.detail()!);
    this.dirty.set(false);
    this.error.set('');
    this.success.set('');
  }
  async select(section: SetupSection) {
    if (section === this.section() || !(await this.confirmLeave())) return;
    this.reset();
    this.section.set(section);
  }
  async save(): Promise<boolean> {
    if (this.saving() || !this.writable() || this.conflict()) return false;
    const form = document.querySelector<HTMLFormElement>('#setup-form');
    if (form && !form.reportValidity()) return false;
    const d = this.detail()!;
    this.saving.set(true);
    this.error.set('');
    this.success.set('');
    try {
      this.apply(
        await this.api.save(
          d.project.id,
          this.section() as WritableSection,
          sectionInput(
            this.section() as WritableSection,
            this.draft,
            d.canAdmin,
            d.project.version,
          ),
        ),
      );
      this.success.set('บันทึกการตั้งค่าเรียบร้อยแล้ว');
      void this.session.restore();
      return true;
    } catch (error) {
      this.error.set(apiErrorMessage(error, 'บันทึกไม่สำเร็จ ข้อมูลที่กรอกยังอยู่'));
      this.conflict.set(
        error instanceof HttpErrorResponse &&
          error.status === 409 &&
          apiErrorMessage(error).includes('โหลดข้อมูลล่าสุด'),
      );
      return false;
    } finally {
      this.saving.set(false);
    }
  }
  confirmLeave(): Promise<boolean> {
    if (this.saving()) return Promise.resolve(false);
    if (!this.dirty()) return Promise.resolve(true);
    if (this.leavePrompt()) return Promise.resolve(false);
    this.leavePrompt.set(true);
    return new Promise((resolve) => (this.resolveLeave = resolve));
  }
  async leave(choice: 'save' | 'discard' | 'stay') {
    if (choice === 'save' && !(await this.save())) {
      this.finishLeave(false);
      return;
    }
    if (choice === 'discard') this.reset();
    this.finishLeave(choice !== 'stay');
  }
  private finishLeave(answer: boolean) {
    this.leavePrompt.set(false);
    this.resolveLeave?.(answer);
    this.resolveLeave = undefined;
  }
  async reloadLatest() {
    if (await this.confirmLeave()) await this.load();
  }
  async requestStatus() {
    if (await this.confirmLeave())
      this.statusPrompt.set(this.detail()!.project.status === 'active' ? 'inactive' : 'active');
  }
  async setStatus() {
    const d = this.detail()!,
      status = this.statusPrompt();
    if (!status || this.saving()) return;
    this.statusPrompt.set(null);
    this.saving.set(true);
    this.error.set('');
    try {
      this.apply(await this.api.status(d.project.id, d.project.version, status));
      this.success.set('เปลี่ยนสถานะเรียบร้อยแล้ว');
      void this.session.restore();
    } catch (error) {
      this.error.set(apiErrorMessage(error));
      this.conflict.set(
        error instanceof HttpErrorResponse &&
          error.status === 409 &&
          apiErrorMessage(error).includes('โหลดข้อมูลล่าสุด'),
      );
    } finally {
      this.saving.set(false);
    }
  }
  @HostListener('window:beforeunload', ['$event']) beforeUnload(event: BeforeUnloadEvent) {
    if (this.dirty() || this.saving()) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
}
