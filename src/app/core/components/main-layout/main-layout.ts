import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from '../header/header';
import { Sidebar } from '../sidebar/sidebar';
import { Breadcrumb } from './Breadcrumb/Breadcrumb';
import {AddEmployeeButton} from '../../services/add-employee-button/add-employee-button';


@Component({
  imports: [RouterOutlet, Header, Sidebar, Breadcrumb, AddEmployeeButton],
  selector: 'app-main-layout',
  styleUrl: './main-layout.css',
  templateUrl: './main-layout.html',
})
export class MainLayout {}
