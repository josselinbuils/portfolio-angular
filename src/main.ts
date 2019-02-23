import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import * as dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

if (environment.production) {
  enableProdMode();
}

dayjs.extend(relativeTime);

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(console.error);
