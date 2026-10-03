import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import type { SetupDetail, SetupDraft } from '../../setup.model';
@Component({
  selector: 'wms-setup-rules',
  imports: [FormsModule, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './rule-fields.html',
})
export class RuleFields {
  readonly detail = input.required<SetupDetail>();
  readonly draft = input.required<SetupDraft>();
  readonly changed = output<void>();
}
