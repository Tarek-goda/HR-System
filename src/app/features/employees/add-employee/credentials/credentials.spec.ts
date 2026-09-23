import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Credentials } from './credentials';

describe('Credentials', () => {
  let component: Credentials;
  let fixture: ComponentFixture<Credentials>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Credentials],
    }).compileComponents();

    fixture = TestBed.createComponent(Credentials);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
