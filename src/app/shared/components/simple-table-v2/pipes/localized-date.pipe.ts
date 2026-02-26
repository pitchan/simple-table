import { DatePipe } from '@angular/common';
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'localizedDate',
  standalone: true,
})
export class LocalizedDatePipe implements PipeTransform {
  private datePipe = new DatePipe('fr-FR');

  transform(value: string | number | Date | null | undefined, format: string = 'dd/MM/yyyy'): string | null {
    if (!value) return null;
    return this.datePipe.transform(value, format);
  }
}
