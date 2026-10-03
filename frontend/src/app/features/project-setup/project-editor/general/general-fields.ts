import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { SetupDetail, SetupDraft } from '../../setup.model';
@Component({
  selector: 'wms-setup-general',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './general-fields.html',
})
export class GeneralFields {
  readonly detail = input.required<SetupDetail>();
  readonly draft = input.required<SetupDraft>();
  readonly changed = output<void>();
}
