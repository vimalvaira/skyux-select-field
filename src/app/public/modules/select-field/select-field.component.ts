import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  forwardRef,
  Input,
  EventEmitter,
  Output,
  OnDestroy
} from '@angular/core';

import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR
} from '@angular/forms';

import {
  Observable
} from 'rxjs/Observable';

import {
  SkyModalService,
  SkyModalCloseArgs
} from '@skyux/modals';

import {
  SkyLibResourcesService
} from '@skyux/i18n';

import {
  SkyToken
} from '@skyux/indicators';

import {
  SkySelectField,
  SkySelectFieldSelectMode
} from './types';

import {
  SkySelectFieldPickerContext
} from './select-field-picker-context';

import {
  SkySelectFieldPickerComponent
} from './select-field-picker.component';

@Component({
  selector: 'sky-select-field',
  templateUrl: './select-field.component.html',
  styleUrls: ['./select-field.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      /* tslint:disable-next-line:no-forward-ref */
      useExisting: forwardRef(() => SkySelectFieldComponent),
      multi: true
    }
  ]
})
export class SkySelectFieldComponent implements ControlValueAccessor, OnDestroy {
  @Input()
  public ariaLabel: string;

  @Input()
  public ariaLabelledBy: string;

  @Input()
  public data: Observable<SkySelectField[]>;

  @Input()
  public set descriptorKey(value: string) {
    this._descriptorKey = value;
  }

  public get descriptorKey(): string {
    return this._descriptorKey || 'label';
  }

  @Input()
  public set disabled(value: boolean) {
    this._disabled = value;
  }

  public get disabled(): boolean {
    return this._disabled || false;
  }

  @Input()
  public set selectMode(value: SkySelectFieldSelectMode) {
    this._selectMode = value;
  }

  public get selectMode(): SkySelectFieldSelectMode {
    return this._selectMode || 'multiple';
  }

  @Input()
  public multipleSelectOpenButtonText: string;

  @Input()
  public singleSelectClearButtonTitle: string;

  @Input()
  public singleSelectOpenButtonTitle: string;

  @Input()
  public singleSelectPlaceholderText: string;

  @Input()
  public pickerHeading: string;

  @Output()
  public blur = new EventEmitter();

  public get value(): any {
    return this._value;
  }

  public set value(value: any) {
    if (JSON.stringify(this._value) !== JSON.stringify(value)) {
      this._value = value;
      this.onChange(this.value);
      this.onTouched();
    }
  }

  public get singleSelectModeValue(): string {
    const value = this.value;

    if (value) {
      return (value as any)[this.descriptorKey];
    }

    return '';
  }

  public tokens: SkyToken[];

  private _descriptorKey: string;
  private _disabled: boolean;
  private _selectMode: SkySelectFieldSelectMode;
  private _value: any;
  private isModalOpen = false;

  constructor(
    private changeDetector: ChangeDetectorRef,
    private modalService: SkyModalService,
    private resourcesService: SkyLibResourcesService
  ) { }

  public ngOnDestroy() {
    this.blur.complete();
  }

  public onTokensChange(change: SkyToken[]) {
    if (!change || change === this.tokens) {
      return;
    }

    const newIds = change.map(token => token.value.id);

    this.data.take(1).subscribe((items: SkySelectField[]) => {
      const newValues = items.filter(item => newIds.indexOf(item.id) > -1);
      this.value = newValues;
      this.setTokensFromValue();
      this.changeDetector.markForCheck();
    });
  }

  public openPicker() {
    (
      this.pickerHeading ?
        Observable.of(this.pickerHeading) :
        this.resourcesService.getString(
          `skyux_select_field_${this.selectMode}_select_picker_heading`
        )
    )
      .take(1)
      .subscribe((headingText) => {
        const pickerContext = new SkySelectFieldPickerContext();
        pickerContext.headingText = headingText;
        pickerContext.data = this.data;
        pickerContext.selectedValue = this.value;
        pickerContext.selectMode = this.selectMode;

        const modalInstance = this.modalService.open(SkySelectFieldPickerComponent, {
          providers: [{
            provide: SkySelectFieldPickerContext,
            useValue: pickerContext
          }]
        });
        this.isModalOpen = true;

        modalInstance.closed.subscribe((result: SkyModalCloseArgs) => {
          if (result.reason === 'save') {
            if (this.selectMode === 'single') {
              this.writeValue(result.data[0]);
            } else {
              this.writeValue(result.data);
            }
          }
          this.isModalOpen = false;
        });
      });
  }

  public writeValue(value: any) {
    if (this.disabled) {
      return;
    }

    if (value) {
      this.value = value;
      this.setTokensFromValue();
      this.changeDetector.markForCheck();
    }
  }

  public onHostFocusOut(): void {
    if (!this.isModalOpen) {
      this.onTouched();
    }
  }

  public onTouched(): void {
    this._registeredTouchCallback();
    this.blur.emit();
  }

  // Angular automatically constructs these methods.
  /* istanbul ignore next */
  public onChange = (value: any) => { };

  public registerOnChange(fn: (value: any) => void) {
    this.onChange = fn;
  }

  public registerOnTouched(fn: () => void) {
    this._registeredTouchCallback = fn;
  }

  public setDisabledState(disabled: boolean) {
    this.disabled = disabled;
    this.changeDetector.markForCheck();
  }

  public clearSelection() {
    this.value = undefined;
  }

  /* istanbul ignore next */
  private _registeredTouchCallback = () => { };

  private setTokensFromValue() {
    // Tokens only appear for multiple select mode.
    if (this.selectMode === 'single') {
      return;
    }

    // Collapse the tokens into a single token if the user has selected many options.
    if (this.value.length > 5) {
      this.resourcesService.getString(
        'skyux_select_field_multiple_select_summary',
        this.value.length.toString()
      )
        .take(1)
        .subscribe((label) => {
          this.tokens = [{
            value: {
              [this.descriptorKey]: label
            }
          }];
        });
    } else {
      this.tokens = this.value.map((value: any) => ({ value }));
    }
  }
}
