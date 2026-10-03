import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  input,
  output,
} from '@angular/core';
@Component({
  selector: 'wms-setup-dialog',
  template: `<dialog
    #dialog
    class="setup-dialog"
    [attr.aria-label]="label()"
    (cancel)="cancel($event)"
  >
    <ng-content />
  </dialog>`,
})
export class SetupDialog implements AfterViewInit, OnDestroy {
  @ViewChild('dialog', { static: true }) dialog!: ElementRef<HTMLDialogElement>;
  readonly label = input.required<string>();
  readonly busy = input(false);
  readonly cancelled = output<void>();
  ngAfterViewInit() {
    this.dialog.nativeElement.showModal();
  }
  cancel(event: Event) {
    event.preventDefault();
    if (!this.busy()) this.cancelled.emit();
  }
  ngOnDestroy() {
    this.dialog.nativeElement.close();
  }
}
