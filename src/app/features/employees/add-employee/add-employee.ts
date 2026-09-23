// features/employees/add-employee/add-employee.ts
import { Component , inject  } from '@angular/core';
import { RouterLink , Router , RouterModule , RouterOutlet  } from '@angular/router';
import { AddEmployeeState } from './add-employee-state';

@Component({
  selector: 'app-add-employee',
  standalone: true,
  imports: [RouterLink, RouterOutlet , RouterModule],
  templateUrl: './add-employee.html',
  styleUrl: './add-employee.css',
})
export class AddEmployee {
  state = inject(AddEmployeeState);
  private router = inject(Router);

  onDiscardDraft() {
    this.state.reset();
    this.router.navigate(['/directory']);
  }

  onPhotoSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('حجم الصورة أكبر من 2MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert('الملف المختار مش صورة');
      return;
    }

    this.state.setPhoto(file);
  }
}