import { Routes } from '@angular/router';

import { HomeComponent } from './pages/home/home.component';
import { PeopleComponent } from './pages/people/people.component';
import { SettingsComponent } from './pages/settings/settings.component';
import { TripDetailComponent } from './pages/trip-detail/trip-detail.component';
import { TripListComponent } from './pages/trip-list/trip-list.component';

export const routes: Routes = [
	{ path: '', component: HomeComponent },
	{ path: 'trips', component: TripListComponent },
	{ path: 'trips/new', component: TripDetailComponent },
	{ path: 'trips/:id', component: TripDetailComponent },
	{ path: 'people', component: PeopleComponent },
	{ path: 'settings', component: SettingsComponent },
];
