/**
 * Configuración y Detección de App Móvil
 * Se carga en la web para detectar si está en app móvil y aplicar configuración
 */

class MobileAppConfig {
  constructor() {
    this.config = null;
    this.isMobileApp = false;
    this.platform = 'web';
  }

  async init() {
    // Detectar si es app móvil (Capacitor)
    this.isMobileApp = window.Capacitor !== undefined;
    
    if (this.isMobileApp) {
      this.platform = window.Capacitor.getPlatform();
      await this.loadConfig();
      this.applyConfig();
      this.setupNativeFeatures();
    }
  }

  async loadConfig() {
    try {
      // Cargar configuración desde archivo JSON
      const response = await fetch('/mobile/config/app-config.json');
      this.config = await response.json();
    } catch (error) {
      console.error('Error cargando configuración:', error);
      // Configuración por defecto
      this.config = {
        ui: {
          hide_sections: [],
          show_sections: [],
          mobile_menu: true
        }
      };
    }
  }

  applyConfig() {
    if (!this.config || !this.config.ui) return;

    const { hide_sections, show_sections, mobile_menu, hide_admin_panel } = this.config.ui;

    // Agregar clase al body para CSS
    document.body.classList.add('mobile-app', `platform-${this.platform}`);

    // Ocultar secciones
    if (hide_sections && hide_sections.length > 0) {
      hide_sections.forEach(selector => {
        const elements = document.querySelectorAll(`.${selector}, #${selector}, [data-section="${selector}"]`);
        elements.forEach(el => {
          el.style.display = 'none';
        });
      });
    }

    // Mostrar solo secciones permitidas
    if (show_sections && show_sections.length > 0) {
      const allSections = document.querySelectorAll('[data-section]');
      allSections.forEach(section => {
        const sectionId = section.getAttribute('data-section');
        if (!show_sections.includes(sectionId)) {
          section.style.display = 'none';
        }
      });
    }

    // Ocultar panel admin
    if (hide_admin_panel) {
      const adminElements = document.querySelectorAll('.admin-panel, [data-admin], #admin-menu');
      adminElements.forEach(el => {
        el.style.display = 'none';
      });
    }

    // Aplicar colores
    if (this.config.colors) {
      this.applyColors();
    }

    // Aplicar CSS personalizado
    if (this.config.ui.custom_css) {
      this.injectCustomCSS(this.config.ui.custom_css);
    }
  }

  applyColors() {
    const { primary, secondary, status_bar_background } = this.config.colors;
    
    if (primary) {
      document.documentElement.style.setProperty('--primary-color', primary);
    }
    
    if (status_bar_background && window.Capacitor) {
      const { StatusBar } = window.Capacitor.Plugins;
      if (StatusBar) {
        StatusBar.setBackgroundColor({ color: status_bar_background });
      }
    }
  }

  injectCustomCSS(css) {
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  setupNativeFeatures() {
    if (!this.config.features) return;

    // Geolocalización
    if (this.config.features.geolocation?.enabled) {
      this.setupGeolocation();
    }

    // Notificaciones push
    if (this.config.features.push_notifications?.enabled) {
      this.setupPushNotifications();
    }
  }

  async setupGeolocation() {
    if (!window.Capacitor) return;

    try {
      const { Geolocation } = window.Capacitor.Plugins;
      if (!Geolocation) return;

      // Solicitar permisos
      const permission = await Geolocation.requestPermissions();
      if (permission.location !== 'granted') {
        console.log('Permisos de geolocalización denegados');
        return;
      }

      // Si está habilitado background tracking
      if (this.config.features.geolocation.background_tracking) {
        const watchId = await Geolocation.watchPosition(
          {
            enableHighAccuracy: true,
            timeout: 10000
          },
          (position, err) => {
            if (err) {
              console.error('Error geolocalización:', err);
              return;
            }
            
            // Enviar ubicación al servidor
            this.sendLocation(position.coords);
          }
        );
      }
    } catch (error) {
      console.error('Error configurando geolocalización:', error);
    }
  }

  async setupPushNotifications() {
    if (!window.Capacitor) return;

    try {
      const { PushNotifications } = window.Capacitor.Plugins;
      if (!PushNotifications) return;

      // Registrar para notificaciones
      await PushNotifications.register();

      // Escuchar notificaciones
      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('Notificación recibida:', notification);
      });

      PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        console.log('Acción de notificación:', notification);
      });
    } catch (error) {
      console.error('Error configurando notificaciones:', error);
    }
  }

  async sendLocation(coords) {
    try {
      await fetch('/api/location/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy
        })
      });
    } catch (error) {
      console.error('Error enviando ubicación:', error);
    }
  }

  // Métodos públicos
  getConfig() {
    return this.config;
  }

  isApp() {
    return this.isMobileApp;
  }

  getPlatform() {
    return this.platform;
  }
}

// Inicializar automáticamente
const mobileConfig = new MobileAppConfig();
mobileConfig.init();

// Exportar para uso global
window.MobileAppConfig = mobileConfig;
