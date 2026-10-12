import hmUI from '@zos/ui'
import { getScene, SCENE_AOD } from '@zos/app'
import { Battery, Vibrator, VIBRATOR_SCENE_SHORT_MIDDLE } from '@zos/sensor'
import { getDistanceUnit, DISTANCE_UNIT_METRIC, getTemperatureUnit, TEMPERATURE_UNIT_CENTIGRADE } from '@zos/settings'
import { launchApp, SYSTEM_APP_HR, SYSTEM_APP_SPO2, SYSTEM_APP_WEATHER, SYSTEM_APP_CALENDAR, SYSTEM_APP_ALARM, SYSTEM_APP_COUNTDOWN } from '@zos/router'

const digits = name => Array.from({ length: 10 }, (_, i) => `${name}-${i}.png`)
const clampBattery = value => Math.max(0, Math.min(100, Math.round(Number(value) || 0)))
const normal = hmUI.show_level.ONLY_NORMAL
const aod = hmUI.show_level.ONAL_AOD

WatchFace({
  build() {
    this.highlights = []
    const sleeping = getScene() === SCENE_AOD
    if (sleeping) this.buildAod()
    else this.buildNormal()
    // Backgrounds already contain the contour mask. A full-screen IMG added
    // above the touch widgets intercepts taps, even in its transparent center.
    hmUI.createWidget(hmUI.widget.WIDGET_DELEGATE, { resume_call: () => {
      if (this.navigationTimer != null) { clearTimeout(this.navigationTimer); this.navigationTimer = null }
      if (this.vibration) this.vibration.stop()
      this.highlights.forEach(widget => widget.setProperty(hmUI.prop.VISIBLE, false))
      this.updateBattery()
      if (this.updateUnits) this.updateUnits()
    } })
  },
  number(type, x, y, w, h, font, level, extra = {}) {
    return hmUI.createWidget(hmUI.widget.TEXT_IMG, {
      x, y, w, h, type, font_array: digits(font), h_space: 0,
      align_h: hmUI.align.CENTER_H, show_level: level, ...extra
    })
  },
  clock(level, sleeping) {
    const font = sleeping ? 'aod-clock' : 'clock'
    const y = sleeping ? 365 : 380
    const x = sleeping ? 117 : 137
    const digitWidth = sleeping ? 43 : 33
    const colonWidth = 18
    hmUI.createWidget(hmUI.widget.IMG_TIME, {
      hour_startX: x, hour_startY: y, hour_array: digits(font), hour_space: 1, hour_zero: 1,
      minute_startX: x + digitWidth * 2 + 2 + colonWidth, minute_startY: y,
      minute_array: digits(font), minute_space: 1, minute_zero: 1, minute_follow: 0,
      show_level: level
    })
    if (sleeping) hmUI.createWidget(hmUI.widget.IMG, { x: x + digitWidth * 2 + 1, y, src: `${font}-colon.png`, show_level: level })
    const prefix = sleeping ? 'aod-' : ''
    const week = Array.from({ length: 7 }, (_, i) => `${prefix}week-${i}.png`)
    hmUI.createWidget(hmUI.widget.IMG_WEEK, { x: sleeping ? 174 : 176, y: sleeping ? 438 : 442, week_en: week, week_sc: week, week_tc: week, show_level: level })
    hmUI.createWidget(hmUI.widget.IMG_DATE, {
      day_startX: sleeping ? 233 : 225, day_startY: sleeping ? 438 : 442,
      day_en_array: digits(`${prefix}date`), day_sc_array: digits(`${prefix}date`), day_tc_array: digits(`${prefix}date`),
      day_zero: 1, day_space: 0, day_align: hmUI.align.LEFT, show_level: level
    })
  },
  batteryBar(level, sleeping) {
    this.battery = new Battery()
    const bar = hmUI.createWidget(hmUI.widget.IMG_LEVEL, {
      x: sleeping ? 50 : 40, y: sleeping ? 453 : 468,
      image_array: Array.from({ length: 101 }, (_, i) => `${sleeping ? 'aod-' : ''}battery-level-${i}.png`),
      image_length: 101, level: clampBattery(this.battery.getCurrent()), show_level: level
    })
    this.updateBattery = () => bar.setProperty(hmUI.prop.LEVEL, clampBattery(this.battery.getCurrent()))
    this.battery.onChange(this.updateBattery)
  },
  buildNormal() {
    hmUI.createWidget(hmUI.widget.IMG, { x: 0, y: 0, src: 'background.png', show_level: normal })
    this.number(hmUI.data_type.HEART, 10, 110, 86, 49, 'health', normal)
    this.number(hmUI.data_type.SPO2, 335, 110, 85, 49, 'health', normal)
    this.number(hmUI.data_type.STEP, 9, 231, 87, 43, 'steps', normal)
    this.number(hmUI.data_type.DISTANCE, 334, 230, 87, 43, 'distance', normal, { dot_image: 'dot.png' })
    this.number(hmUI.data_type.CAL, 10, 340, 86, 43, 'cal', normal)
    this.number(hmUI.data_type.WEATHER_CURRENT, 341, 337, 72, 43, 'temp', normal, { negative_image: 'minus.png' })
    // Select labels using the same device preferences as the live value widgets.
    const distanceLabel = getDistanceUnit() === DISTANCE_UNIT_METRIC ? 'km-label.png' : 'mi-label.png'
    const temperatureLabel = getTemperatureUnit() === TEMPERATURE_UNIT_CENTIGRADE ? 'celsius-label.png' : 'fahrenheit-label.png'
    for (const [src, x, y] of [['percent-large.png',365,158], [distanceLabel,365,271], ['kcal-label.png',23,379], [temperatureLabel,363,380], ['charge-icon.png',40,440], ['battery-outline.png',36,464], ['sun-panel.png',317,436]]) {
      const widget = hmUI.createWidget(hmUI.widget.IMG, { x, y, src, show_level: normal })
      if (src === distanceLabel) this.distanceUnitWidget = widget
      if (src === temperatureLabel) this.temperatureUnitWidget = widget
    }
    this.updateUnits = () => {
      this.distanceUnitWidget.setProperty(hmUI.prop.MORE, { src: getDistanceUnit() === DISTANCE_UNIT_METRIC ? 'km-label.png' : 'mi-label.png' })
      this.temperatureUnitWidget.setProperty(hmUI.prop.MORE, { src: getTemperatureUnit() === TEMPERATURE_UNIT_CENTIGRADE ? 'celsius-label.png' : 'fahrenheit-label.png' })
    }
    this.clock(normal, false)
    this.number(hmUI.data_type.BATTERY, 60, 439, 52, 28, 'battery', normal, { unit_en: 'percent.png', unit_sc: 'percent.png', unit_tc: 'percent.png' })
    this.batteryBar(normal, false)
    this.number(hmUI.data_type.SUN_RISE, 357, 441, 40, 22, 'sun', normal, { dot_image: 'sun-colon.png' })
    this.number(hmUI.data_type.SUN_SET, 357, 463, 40, 22, 'sun', normal, { dot_image: 'sun-colon.png' })
    this.vibration = new Vibrator()
    this.appTap(9, 68, 87, 113, SYSTEM_APP_HR, 'red')
    this.appTap(333, 68, 89, 113, SYSTEM_APP_SPO2, 'blue')
    this.metricTap(9, 184, 87, 108, hmUI.data_type.STEP, 'green')
    this.metricTap(333, 184, 89, 108, hmUI.data_type.DISTANCE, 'blue')
    this.metricTap(9, 295, 87, 111, hmUI.data_type.CAL, 'orange')
    this.appTap(333, 295, 89, 111, SYSTEM_APP_WEATHER, 'orange')
    this.appTap(134, 378, 79, 63, SYSTEM_APP_ALARM, 'cream')
    this.appTap(213, 378, 80, 63, SYSTEM_APP_COUNTDOWN, 'cream')
    this.appTap(173, 442, 87, 29, SYSTEM_APP_CALENDAR, 'blue')
    this.metricTap(36, 438, 88, 44, hmUI.data_type.BATTERY, 'green')
    this.metricTap(357, 441, 40, 22, hmUI.data_type.SUN_RISE, 'amber')
    this.metricTap(357, 463, 40, 22, hmUI.data_type.SUN_SET, 'red')
  },
  buildAod() {
    hmUI.createWidget(hmUI.widget.IMG, { x: 0, y: 0, src: 'aod-background.png', show_level: aod })
    this.clock(aod, true)
    hmUI.createWidget(hmUI.widget.IMG, { x: 46, y: 449, src: 'aod-battery-outline.png', show_level: aod })
    hmUI.createWidget(hmUI.widget.IMG, { x: 306, y: 453, src: 'aod-step-icon.png', show_level: aod })
    this.number(hmUI.data_type.BATTERY, 95, 447, 50, 25, 'aod-bat', aod, { align_h: hmUI.align.LEFT, unit_en: 'aod-percent.png', unit_sc: 'aod-percent.png', unit_tc: 'aod-percent.png' })
    this.number(hmUI.data_type.STEP, 337, 455, 54, 25, 'aod-steps', aod)
    this.batteryBar(aod, true)
  },
  pulse() {
    this.vibration.stop()
    this.vibration.start({ mode: VIBRATOR_SCENE_SHORT_MIDDLE })
  },
  highlight(x, y, w, h, color) {
    const glow = hmUI.createWidget(hmUI.widget.IMG, { x, y, src: `press-${color}-${w}x${h}.png`, show_level: normal })
    glow.setProperty(hmUI.prop.VISIBLE, false)
    this.highlights.push(glow)
    return glow
  },
  appTap(x, y, w, h, appId, color) {
    const glow = this.highlight(x, y, w, h, color)
    hmUI.createWidget(hmUI.widget.BUTTON, {
      x, y, w, h, text: '', normal_src: `tap-${w}x${h}.png`, press_src: `press-${color}-${w}x${h}.png`, show_level: normal,
      click_func: () => {
        if (this.navigationTimer != null) return
        this.pulse()
        glow.setProperty(hmUI.prop.VISIBLE, true)
        this.navigationTimer = setTimeout(() => {
          this.navigationTimer = null
          this.vibration.stop()
          glow.setProperty(hmUI.prop.VISIBLE, false)
          launchApp({ appId, native: true })
        }, 180)
      }
    })
  },
  metricTap(x, y, w, h, type, color) {
    const glow = this.highlight(x, y, w, h, color)
    const hit = hmUI.createWidget(hmUI.widget.IMG_CLICK, { x, y, w, h, src: `tap-${w}x${h}.png`, type, show_level: normal })
    hit.addEventListener(hmUI.event.CLICK_DOWN, () => { this.pulse(); glow.setProperty(hmUI.prop.VISIBLE, true) })
    hit.addEventListener(hmUI.event.CLICK_UP, () => { glow.setProperty(hmUI.prop.VISIBLE, false); this.vibration.stop() })
  },
  onInit() {},
  onDestroy() {
    this.highlights.forEach(widget => widget.setProperty(hmUI.prop.VISIBLE, false))
    if (this.navigationTimer != null) { clearTimeout(this.navigationTimer); this.navigationTimer = null }
    if (this.vibration) this.vibration.stop()
    if (this.battery && this.updateBattery) this.battery.offChange(this.updateBattery)
  }
})
