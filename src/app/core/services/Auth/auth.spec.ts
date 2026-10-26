import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth';
import { ProfileService } from '../profile/profile';

describe('AuthService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AuthService, ProfileService]
    });
  });

  it('should create both services without circular dependency', () => {
    const authService = TestBed.inject(AuthService);
    const profileService = TestBed.inject(ProfileService);

    expect(authService).toBeTruthy();
    expect(profileService).toBeTruthy();
  });
});
