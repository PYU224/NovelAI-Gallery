import { createApp } from 'vue'
import App from './App.vue'
import router from './router';

import { IonicVue } from '@ionic/vue';

/* Core CSS required for Ionic components to work properly */
import '@ionic/vue/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/vue/css/normalize.css';
import '@ionic/vue/css/structure.css';
import '@ionic/vue/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/vue/css/padding.css';
import '@ionic/vue/css/float-elements.css';
import '@ionic/vue/css/text-alignment.css';
import '@ionic/vue/css/text-transformation.css';
import '@ionic/vue/css/flex-utils.css';
import '@ionic/vue/css/display.css';

/**
 * Ionic Dark Mode
 * -----------------------------------------------------
 * For more info, please see:
 * https://ionicframework.com/docs/theming/dark-mode
 */

/* @import '@ionic/vue/css/palettes/dark.always.css'; */
import '@ionic/vue/css/palettes/dark.class.css';
/* dark.system.css の代わりに dark.class.css を使用。
 * ダーク・ライト・システムの切り替えは useSettings が ion-app クラスで管理する。 */

/* Theme variables */
import './theme/variables.css';

/* i18n */
import i18n from './i18n';

// ─── Capacitor ブリッジのメッセージチャネルエラー抑制 ───
// @capawesome/capacitor-file-picker 等のプラグインで
// "message channel closed before a response was received" が
// 非致命的に繰り返し発生する既知の問題を抑制する。
window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
  if (
    event.reason instanceof Error &&
    event.reason.message.includes('message channel closed before a response was received')
  ) {
    event.preventDefault();
  }
});

const app = createApp(App)
  .use(IonicVue)
  .use(router)
  .use(i18n);

router.isReady().then(() => {
  app.mount('#app');
});
