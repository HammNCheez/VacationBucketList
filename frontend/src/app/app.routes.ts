import { Routes } from '@angular/router';

import { PeopleComponent } from './pages/people/people.component';
import { SettingsComponent } from './pages/settings/settings.component';
import { TripDetailComponent } from './pages/trip-detail/trip-detail.component';
import { TripListComponent } from './pages/trip-list/trip-list.component';

export const routes: Routes = [
	{ path: '', pathMatch: 'full', redirectTo: 'trips' },
	{ path: 'trips', component: TripListComponent },
	{ path: 'trips/new', component: TripDetailComponent },
	{ path: 'trips/:id', component: TripDetailComponent },
	{ path: 'people', component: PeopleComponent },
	{ path: 'settings', component: SettingsComponent },
];
