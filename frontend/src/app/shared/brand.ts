import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon } from './icon';

@Component({
  selector: 'wms-brand',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ` <div class="flex items-center gap-3" [class.text-white]="inverse()">
    <span class="brand-mark"><wms-icon name="box" /></span>
    <div>
      <span class="font-display text-[23px] font-extrabold tracking-tight"
        >Apo<span class="font-medium opacity-65"> WMS</span></span
      >
      <span class="block text-[10px] tracking-[.2em] opacity-65">WAREHOUSE MANAGEMENT</span>
    </div>
  </div>`,
})
export class Brand {
  readonly inverse = input(false);
}
